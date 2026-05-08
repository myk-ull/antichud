/**
 * Estimate food energy (in kJ) from a single photo via OpenRouter.
 *
 * The model returns strict JSON with the shape `EstimateResult`.
 * All energy values are kilojoules — NOT calories.
 */

import type { Confidence, FoodEntryItem, Macros } from '@/types';
import { chatCompletion, type ChatCompletionOptions } from './client';
import type {
  EstimateInput,
  EstimateResult,
  EstimateUserContext,
  OpenRouterContentPart,
  OpenRouterChatRequest,
} from './types';

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
const DEFAULT_MIME = 'image/jpeg';

const SYSTEM_PROMPT = [
  'You are a careful food-energy estimator for a kilojoule (kJ) tracking app.',
  'Energy values are in **kilojoules (kJ)**, NOT calories. 1 kcal = 4.184 kJ.',
  'Estimate based on common foods and typical portion sizes visible in the image.',
  'Always return JSON only — no prose, no markdown, no code fences.',
  'JSON schema:',
  '{',
  '  "name": string,                 // short overall dish name',
  '  "kj":   number,                 // total energy in kilojoules (integer >= 0)',
  '  "confidence": "low" | "med" | "high",',
  '  "macros": {                     // total macronutrients in grams',
  '    "protein_g": number,          // grams of protein (>= 0)',
  '    "carbs_g":   number,          // grams of carbohydrates (>= 0)',
  '    "fat_g":     number,          // grams of fat (>= 0)',
  '    "fiber_g":   number           // grams of fiber (>= 0, can be 0)',
  '  },',
  '  "items": [                      // per-component breakdown',
  '    { "name": string, "kj": number, "qty"?: number }',
  '  ]',
  '}',
  'Cross-check: protein_g*17 + carbs_g*17 + fat_g*37 should be near kj. Adjust if off.',
  'If the image is ambiguous, lower the confidence rather than refusing.',
].join('\n');

function getModel(): string {
  const m = process.env.EXPO_PUBLIC_OPENROUTER_MODEL;
  return typeof m === 'string' && m.trim().length > 0 ? m : DEFAULT_MODEL;
}

function coerceConfidence(raw: unknown): Confidence {
  if (typeof raw !== 'string') return 'med';
  const v = raw.trim().toLowerCase();
  if (v === 'high' || v === 'h') return 'high';
  if (v === 'low' || v === 'l') return 'low';
  if (v === 'med' || v === 'medium' || v === 'med.' || v === 'm') return 'med';
  return 'med';
}

function toFiniteNonNegative(n: unknown): number {
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) return n;
  if (typeof n === 'string') {
    const parsed = Number(n);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return 0;
}

function coerceItems(raw: unknown): FoodEntryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FoodEntryItem[] = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const name = typeof e.name === 'string' ? e.name : '';
    if (name.length === 0) continue;
    const kj = Math.round(toFiniteNonNegative(e.kj));
    const qtyRaw = e.qty;
    const item: FoodEntryItem =
      typeof qtyRaw === 'number' && Number.isFinite(qtyRaw)
        ? { name, kj, qty: qtyRaw }
        : { name, kj };
    out.push(item);
  }
  return out;
}

function coerceMacros(raw: unknown): Macros | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const m = raw as Record<string, unknown>;
  const protein_g = Math.round(toFiniteNonNegative(m.protein_g));
  const carbs_g = Math.round(toFiniteNonNegative(m.carbs_g));
  const fat_g = Math.round(toFiniteNonNegative(m.fat_g));
  const fiberRaw = m.fiber_g;
  if (protein_g === 0 && carbs_g === 0 && fat_g === 0) return undefined;
  const macros: Macros =
    typeof fiberRaw === 'number' || typeof fiberRaw === 'string'
      ? { protein_g, carbs_g, fat_g, fiber_g: Math.round(toFiniteNonNegative(fiberRaw)) }
      : { protein_g, carbs_g, fat_g };
  return macros;
}

/**
 * Compute |P*17 + C*17 + F*37 − kj| / kj. If macros are missing or kj is 0
 * we can't check; return 'unknown'. Disagreement > MACRO_CHECK_THRESHOLD
 * downgrades confidence and surfaces a warning in the UI.
 */
const MACRO_CHECK_THRESHOLD = 0.2;

function macroCheckStatus(kj: number, macros: Macros | undefined): 'ok' | 'disagree' | 'unknown' {
  if (!macros || kj <= 0) return 'unknown';
  const macroKJ = macros.protein_g * 17 + macros.carbs_g * 17 + macros.fat_g * 37;
  if (macroKJ <= 0) return 'unknown';
  const diff = Math.abs(macroKJ - kj) / kj;
  return diff > MACRO_CHECK_THRESHOLD ? 'disagree' : 'ok';
}

function downgradeIfDisagree(c: Confidence, status: 'ok' | 'disagree' | 'unknown'): Confidence {
  if (status !== 'disagree') return c;
  // disagree → drop one notch; high becomes med, med becomes low, low stays low.
  if (c === 'high') return 'med';
  return 'low';
}

function buildUserContextBlock(ctx: EstimateUserContext | undefined): string | null {
  if (!ctx) return null;
  const lines: string[] = [];
  const body: string[] = [];
  if (typeof ctx.weight_kg === 'number') body.push(`${ctx.weight_kg} kg`);
  if (typeof ctx.target_weight_kg === 'number') body.push(`target ${ctx.target_weight_kg} kg`);
  if (typeof ctx.age === 'number') body.push(`${ctx.age} yr`);
  if (typeof ctx.sex === 'string') body.push(ctx.sex);
  if (typeof ctx.activity_level === 'string') body.push(`${ctx.activity_level} activity`);
  if (body.length > 0) lines.push(`- Body: ${body.join(', ')}`);

  if (typeof ctx.daily_goal_kj === 'number' && ctx.daily_goal_kj > 0) {
    if (typeof ctx.consumed_today_kj === 'number') {
      const remaining = ctx.daily_goal_kj - ctx.consumed_today_kj;
      lines.push(
        `- Today: goal ${ctx.daily_goal_kj.toLocaleString('en-US')} kJ, ` +
          `already logged ${ctx.consumed_today_kj.toLocaleString('en-US')} kJ, ` +
          `${remaining.toLocaleString('en-US')} kJ remaining.`,
      );
    } else {
      lines.push(`- Daily goal: ${ctx.daily_goal_kj.toLocaleString('en-US')} kJ.`);
    }
  } else if (typeof ctx.consumed_today_kj === 'number') {
    lines.push(`- Already logged today: ${ctx.consumed_today_kj.toLocaleString('en-US')} kJ.`);
  }

  if (lines.length === 0) return null;
  return ['USER CONTEXT', ...lines, 'Scale portions to this body. Sanity-check against the day.'].join('\n');
}

function buildDescriptionBlock(input: EstimateInput): string | null {
  const desc = (input.description ?? input.hint ?? '').trim();
  const portion = (input.portion ?? '').trim();
  if (desc.length === 0 && portion.length === 0) return null;
  const lines = ['DESCRIPTION'];
  if (desc) lines.push(`What: ${desc}`);
  if (portion) lines.push(`Portion: ${portion}`);
  lines.push('Trust this description over what the image suggests when they conflict.');
  return lines.join('\n');
}

function buildUserText(input: EstimateInput): string {
  const blocks: string[] = [];
  const ctxBlock = buildUserContextBlock(input.userContext);
  if (ctxBlock) blocks.push(ctxBlock);
  const descBlock = buildDescriptionBlock(input);
  if (descBlock) blocks.push(descBlock);
  blocks.push('Estimate the kJ in this meal. Return JSON only.');
  return blocks.join('\n\n');
}

function parseEstimateContent(content: string): EstimateResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `OpenRouter estimate response was not valid JSON: ${message}`,
    );
  }
  if (parsed === null || typeof parsed !== 'object') {
    throw new Error(
      'OpenRouter estimate response JSON was not an object at the top level.',
    );
  }
  const obj = parsed as Record<string, unknown>;
  const name = typeof obj.name === 'string' && obj.name.length > 0
    ? obj.name
    : 'Unknown food';
  const kj = Math.round(toFiniteNonNegative(obj.kj));
  const confidence = coerceConfidence(obj.confidence);
  const items = coerceItems(obj.items);
  const macros = coerceMacros(obj.macros);
  const macros_check = macroCheckStatus(kj, macros);
  const adjustedConfidence = downgradeIfDisagree(confidence, macros_check);
  if (macros) {
    return { name, kj, confidence: adjustedConfidence, items, macros, macros_check };
  }
  return { name, kj, confidence: adjustedConfidence, items, macros_check };
}

export async function estimateFoodKJ(
  input: EstimateInput,
  opts?: ChatCompletionOptions,
): Promise<EstimateResult> {
  const mime = input.mimeType ?? DEFAULT_MIME;
  const dataUrl = `data:${mime};base64,${input.imageBase64}`;

  const userText = buildUserText(input);

  const userContent: OpenRouterContentPart[] = [
    { type: 'text', text: userText },
    { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
  ];

  const req: OpenRouterChatRequest = {
    model: getModel(),
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };

  const res = await chatCompletion(req, opts);

  const choice = res.choices[0];
  if (!choice || typeof choice.message?.content !== 'string') {
    throw new Error(
      'OpenRouter estimate response missing choices[0].message.content.',
    );
  }
  return parseEstimateContent(choice.message.content);
}
