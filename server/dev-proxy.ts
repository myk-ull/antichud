/**
 * Antichud — OpenRouter dev proxy.
 *
 * Local Bun HTTP server that forwards requests to OpenRouter and prints
 * pretty, color-coded logs of the prompts, model, latency, and parsed
 * response (kJ + macros). Designed so you can debug the Gemini 3 Flash
 * vision flow without printf-debugging the React Native client.
 *
 * Run:    bun run server/dev-proxy.ts
 * Or:     npm run dev:proxy
 *
 * Then point the app at it by setting in .env.local (and restarting Expo):
 *     EXPO_PUBLIC_OPENROUTER_BASE_URL=http://<your-LAN-ip>:8787/v1
 *
 * Endpoints:
 *   POST /v1/chat/completions   — forwards to OpenRouter
 *   GET  /healthz                — { ok: true }
 *
 * The proxy does NOT cache anything. It does NOT log full base64 image bytes
 * (truncates them to a hash + size for safety + readability).
 */

const PORT = Number(process.env.PORT ?? 8787);
const UPSTREAM = 'https://openrouter.ai/api/v1';
const STARTED_AT = new Date();

// ANSI colors — terminal only. Stripped if NO_COLOR is set.
const useColor = !process.env.NO_COLOR;
const c = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
const dim = c('2');
const bold = c('1');
const red = c('31');
const green = c('32');
const yellow = c('33');
const blue = c('34');
const magenta = c('35');
const cyan = c('36');

function nowStamp(): string {
  const d = new Date();
  return `${d.toTimeString().slice(0, 8)}.${d.getMilliseconds().toString().padStart(3, '0')}`;
}

function shortHash(s: string): string {
  // Tiny non-cryptographic hash so we can identify identical images in logs
  // without committing to bringing in a real hashing dep. Good enough for dev.
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1_048_576).toFixed(2)} MB`;
}

type AnyJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

function summarizeRequest(body: AnyJson): {
  model: string;
  systemHead: string;
  userText: string;
  imageInfo: string | null;
  msgCount: number;
} {
  const obj = (body && typeof body === 'object' && !Array.isArray(body)) ? (body as Record<string, unknown>) : {};
  const model = typeof obj.model === 'string' ? obj.model : '<unknown model>';
  const messages = Array.isArray(obj.messages) ? obj.messages : [];
  let systemHead = '';
  let userText = '';
  let imageInfo: string | null = null;
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = (m as { role?: unknown }).role;
    const content = (m as { content?: unknown }).content;
    if (role === 'system' && typeof content === 'string' && systemHead.length === 0) {
      systemHead = content.split('\n')[0]?.slice(0, 80) ?? '';
    }
    if (role === 'user') {
      if (typeof content === 'string') {
        userText = content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (!part || typeof part !== 'object') continue;
          const type = (part as { type?: unknown }).type;
          if (type === 'text' && typeof (part as { text?: unknown }).text === 'string') {
            userText = (part as { text: string }).text;
          }
          if (type === 'image_url') {
            const url = (part as { image_url?: { url?: unknown } }).image_url?.url;
            if (typeof url === 'string') {
              const isData = url.startsWith('data:');
              if (isData) {
                const comma = url.indexOf(',');
                const meta = comma > 0 ? url.slice(5, comma) : '<unknown>';
                const data = comma > 0 ? url.slice(comma + 1) : '';
                const bytes = Math.floor((data.length * 3) / 4);
                imageInfo = `${meta} · ${fmtBytes(bytes)} · sha:${shortHash(data)}`;
              } else {
                imageInfo = url;
              }
            }
          }
        }
      }
    }
  }
  return { model, systemHead, userText, imageInfo, msgCount: messages.length };
}

function summarizeResponse(body: AnyJson): {
  parsedJson: AnyJson | null;
  rawHead: string;
  finishReason: string | null;
  usage: { in?: number; out?: number; total?: number } | null;
} {
  const obj = (body && typeof body === 'object' && !Array.isArray(body)) ? (body as Record<string, unknown>) : {};
  const choices = Array.isArray(obj.choices) ? obj.choices : [];
  const first = choices[0] && typeof choices[0] === 'object' ? (choices[0] as Record<string, unknown>) : null;
  const message = first && typeof first.message === 'object' && first.message !== null
    ? (first.message as Record<string, unknown>)
    : null;
  const content = message && typeof message.content === 'string' ? message.content : '';
  const finishReason = first && typeof first.finish_reason === 'string' ? first.finish_reason : null;
  const usageObj = obj.usage && typeof obj.usage === 'object' ? (obj.usage as Record<string, unknown>) : null;
  const usage = usageObj
    ? {
        in: typeof usageObj.prompt_tokens === 'number' ? usageObj.prompt_tokens : undefined,
        out: typeof usageObj.completion_tokens === 'number' ? usageObj.completion_tokens : undefined,
        total: typeof usageObj.total_tokens === 'number' ? usageObj.total_tokens : undefined,
      }
    : null;
  let parsedJson: AnyJson | null = null;
  try {
    parsedJson = content ? (JSON.parse(content) as AnyJson) : null;
  } catch {
    parsedJson = null;
  }
  return { parsedJson, rawHead: content.slice(0, 160), finishReason, usage };
}

function logBlock(lines: ReadonlyArray<string>): void {
  for (const line of lines) console.log(line);
  console.log('');
}

function bootBanner(): void {
  console.log('');
  console.log(bold(magenta('▌  ANTICHUD  · openrouter dev proxy')));
  console.log(dim(`   started ${STARTED_AT.toISOString()}`));
  console.log(dim(`   listening on http://0.0.0.0:${PORT}`));
  console.log(dim(`   forwarding → ${UPSTREAM}`));
  console.log('');
  console.log(dim('   point the app at this proxy by setting in .env.local:'));
  console.log(cyan(`     EXPO_PUBLIC_OPENROUTER_BASE_URL=http://<your-LAN-ip>:${PORT}/v1`));
  console.log('');
  console.log(dim('   then restart `expo start` so it re-reads env. Health check:'));
  console.log(cyan(`     curl http://localhost:${PORT}/healthz`));
  console.log('');
}

async function handleChatCompletions(req: Request): Promise<Response> {
  const startedAt = performance.now();
  const stamp = nowStamp();
  let bodyText: string;
  try {
    bodyText = await req.text();
  } catch (err) {
    console.log(red(`[${stamp}] ✗ failed to read request body: ${(err as Error).message}`));
    return new Response(JSON.stringify({ error: 'bad request body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let parsed: AnyJson = null;
  try {
    parsed = JSON.parse(bodyText) as AnyJson;
  } catch {
    parsed = null;
  }
  const summary = parsed ? summarizeRequest(parsed) : null;

  // Authorization header — DO NOT log the key value.
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.toLowerCase().startsWith('bearer ')) {
    console.log(yellow(`[${stamp}] ! request missing Bearer token; forwarding anyway`));
  }

  logBlock([
    `${dim(`[${stamp}]`)} ${blue('→')} ${bold('POST')} /v1/chat/completions ${dim(`(${fmtBytes(bodyText.length)})`)}`,
    summary ? `         ${dim('model')}    ${cyan(summary.model)}` : '',
    summary && summary.systemHead ? `         ${dim('system')}   ${summary.systemHead}…` : '',
    summary && summary.userText
      ? `         ${dim('hint')}     ${summary.userText.slice(0, 120)}`
      : '',
    summary && summary.imageInfo
      ? `         ${dim('image')}    ${magenta(summary.imageInfo)}`
      : '',
  ].filter(Boolean));

  // Forward to OpenRouter.
  const upstreamUrl = `${UPSTREAM}/chat/completions`;
  const fwdHeaders: Record<string, string> = {
    'content-type': 'application/json',
  };
  for (const [k, v] of req.headers.entries()) {
    const key = k.toLowerCase();
    if (key === 'host' || key === 'content-length' || key === 'connection') continue;
    fwdHeaders[k] = v;
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: fwdHeaders,
      body: bodyText,
    });
  } catch (err) {
    const ms = Math.round(performance.now() - startedAt);
    console.log(red(`[${stamp}] ✗ upstream fetch failed after ${ms}ms: ${(err as Error).message}`));
    return new Response(
      JSON.stringify({ error: 'upstream fetch failed', message: (err as Error).message }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }

  const respText = await upstream.text();
  const ms = Math.round(performance.now() - startedAt);
  let respJson: AnyJson | null = null;
  try {
    respJson = JSON.parse(respText) as AnyJson;
  } catch {
    respJson = null;
  }

  const ok = upstream.ok;
  const statusColor = ok ? green : red;
  const arrow = ok ? '←' : '✗';
  const respSummary = respJson ? summarizeResponse(respJson) : null;

  const lines: string[] = [
    `${dim(`[${stamp}]`)} ${statusColor(arrow)} ${bold(`${upstream.status} ${upstream.statusText}`)} ${dim(`(${fmtBytes(respText.length)} · ${ms}ms)`)}`,
  ];
  if (respSummary) {
    if (respSummary.usage) {
      const { in: tIn, out: tOut, total } = respSummary.usage;
      lines.push(
        `         ${dim('tokens')}   ${tIn ?? '?'} in · ${tOut ?? '?'} out · ${total ?? '?'} total`,
      );
    }
    if (respSummary.finishReason) {
      lines.push(`         ${dim('finish')}   ${respSummary.finishReason}`);
    }
    if (respSummary.parsedJson && typeof respSummary.parsedJson === 'object' && !Array.isArray(respSummary.parsedJson)) {
      const j = respSummary.parsedJson as Record<string, unknown>;
      const name = typeof j.name === 'string' ? j.name : '?';
      const kj = typeof j.kj === 'number' ? j.kj : null;
      const conf = typeof j.confidence === 'string' ? j.confidence : '?';
      lines.push(
        `         ${dim('estimate')} ${cyan(name)} · ${bold(kj === null ? '?' : `${kj.toLocaleString('en-US')} kJ`)} · ${dim('conf')} ${conf}`,
      );
      const macros = j.macros && typeof j.macros === 'object' ? (j.macros as Record<string, unknown>) : null;
      if (macros) {
        const p = typeof macros.protein_g === 'number' ? macros.protein_g : '?';
        const cb = typeof macros.carbs_g === 'number' ? macros.carbs_g : '?';
        const f = typeof macros.fat_g === 'number' ? macros.fat_g : '?';
        const fi = typeof macros.fiber_g === 'number' ? macros.fiber_g : null;
        lines.push(
          `         ${dim('macros')}   P ${p}g · C ${cb}g · F ${f}g${fi !== null ? ` · fiber ${fi}g` : ''}`,
        );
      }
      const items = Array.isArray(j.items) ? j.items : [];
      for (const it of items.slice(0, 6)) {
        if (!it || typeof it !== 'object') continue;
        const itName = typeof (it as { name?: unknown }).name === 'string' ? (it as { name: string }).name : '?';
        const itKj = typeof (it as { kj?: unknown }).kj === 'number' ? (it as { kj: number }).kj : null;
        lines.push(
          `         ${dim('· item')}  ${itName.padEnd(28).slice(0, 28)} ${itKj === null ? '?' : `${itKj.toLocaleString('en-US')} kJ`}`,
        );
      }
      if (items.length > 6) {
        lines.push(`         ${dim('... ' + (items.length - 6) + ' more items')}`);
      }
    } else if (respSummary.rawHead) {
      lines.push(`         ${dim('raw')}      ${yellow(respSummary.rawHead)}…`);
    }
  } else if (!ok) {
    lines.push(`         ${red('body')}    ${respText.slice(0, 200)}`);
  }
  logBlock(lines);

  // Pass through status, headers, body.
  const passHeaders: Record<string, string> = {};
  for (const [k, v] of upstream.headers.entries()) {
    const key = k.toLowerCase();
    if (key === 'content-encoding' || key === 'content-length' || key === 'transfer-encoding') continue;
    passHeaders[k] = v;
  }
  if (!passHeaders['content-type']) passHeaders['content-type'] = 'application/json';

  return new Response(respText, { status: upstream.status, headers: passHeaders });
}

bootBanner();

Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/healthz') {
      return Response.json({ ok: true, since: STARTED_AT.toISOString(), upstream: UPSTREAM });
    }
    if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
      return handleChatCompletions(req);
    }
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, GET, OPTIONS',
          'access-control-allow-headers': '*',
        },
      });
    }
    console.log(yellow(`[${nowStamp()}] ? ${req.method} ${url.pathname} (404)`));
    return new Response('not found', { status: 404 });
  },
  error(err) {
    console.log(red(`[${nowStamp()}] ✗ server error: ${err.message}`));
    return new Response('internal error', { status: 500 });
  },
});
