/**
 * Thin OpenRouter chat-completion client.
 *
 * - Reads `EXPO_PUBLIC_OPENROUTER_API_KEY` from env at call time (NOT module load).
 * - Never logs or stringifies the API key.
 * - Throws `OpenRouterError` (with status + body) on non-2xx responses.
 */

import {
  OpenRouterError,
  type OpenRouterChatRequest,
  type OpenRouterChatResponse,
} from './types';

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_REFERER = 'https://antichud.app';
const APP_TITLE = 'Antichud';

function getBaseUrl(): string {
  const b = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
  if (typeof b === 'string' && b.trim().length > 0) {
    // Strip trailing slash so we always join cleanly.
    return b.trim().replace(/\/$/, '');
  }
  return DEFAULT_BASE_URL;
}

function getChatCompletionUrl(): string {
  return `${getBaseUrl()}/chat/completions`;
}

export type ChatCompletionOptions = Readonly<{
  signal?: AbortSignal;
}>;

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  if (typeof key !== 'string' || key.trim().length === 0) {
    throw new Error(
      'OpenRouter API key missing: set EXPO_PUBLIC_OPENROUTER_API_KEY in your environment.',
    );
  }
  return key;
}

function getReferer(): string {
  const r = process.env.EXPO_PUBLIC_OPENROUTER_REFERER;
  return typeof r === 'string' && r.trim().length > 0 ? r : DEFAULT_REFERER;
}

export async function chatCompletion(
  req: OpenRouterChatRequest,
  opts?: ChatCompletionOptions,
): Promise<OpenRouterChatResponse> {
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': getReferer(),
    'X-Title': APP_TITLE,
    'Content-Type': 'application/json',
  };

  const res = await fetch(getChatCompletionUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
    signal: opts?.signal,
  });

  if (!res.ok) {
    let body = '';
    try {
      body = await res.text();
    } catch {
      body = '';
    }
    throw new OpenRouterError(
      `OpenRouter request failed with status ${res.status}`,
      res.status,
      body,
    );
  }

  const json = (await res.json()) as OpenRouterChatResponse;
  return json;
}
