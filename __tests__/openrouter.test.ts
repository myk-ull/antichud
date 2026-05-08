/**
 * Unit tests for the OpenRouter client + estimate pipeline.
 * `global.fetch` is mocked. No real network calls.
 */

import {
  chatCompletion,
  estimateFoodKJ,
  OpenRouterError,
} from '@/lib/openrouter';

type FetchMock = jest.Mock<
  Promise<Response>,
  [input: RequestInfo | URL, init?: RequestInit]
>;

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const ORIGINAL_MODEL = process.env.EXPO_PUBLIC_OPENROUTER_MODEL;
const ORIGINAL_REFERER = process.env.EXPO_PUBLIC_OPENROUTER_REFERER;

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeTextResponse(body: string, status = 500): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain' },
  });
}

function makeAssistantContent(payload: unknown): { choices: Array<{ index: number; message: { role: 'assistant'; content: string } }> } {
  return {
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: typeof payload === 'string' ? payload : JSON.stringify(payload),
        },
      },
    ],
  };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY = 'test-key';
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL = 'google/gemini-3-flash-preview';
  process.env.EXPO_PUBLIC_OPENROUTER_REFERER = 'https://antichud.test';
  global.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  jest.resetAllMocks();
  global.fetch = ORIGINAL_FETCH;
  if (ORIGINAL_KEY === undefined) {
    delete process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  } else {
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY = ORIGINAL_KEY;
  }
  if (ORIGINAL_MODEL === undefined) {
    delete process.env.EXPO_PUBLIC_OPENROUTER_MODEL;
  } else {
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL = ORIGINAL_MODEL;
  }
  if (ORIGINAL_REFERER === undefined) {
    delete process.env.EXPO_PUBLIC_OPENROUTER_REFERER;
  } else {
    process.env.EXPO_PUBLIC_OPENROUTER_REFERER = ORIGINAL_REFERER;
  }
});

describe('chatCompletion', () => {
  it('throws a clear error when the API key is missing', async () => {
    delete process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
    await expect(
      chatCompletion({ model: 'm', messages: [] }),
    ).rejects.toThrow(/EXPO_PUBLIC_OPENROUTER_API_KEY/);
  });

  it('throws a clear error when the API key is empty', async () => {
    process.env.EXPO_PUBLIC_OPENROUTER_API_KEY = '   ';
    await expect(
      chatCompletion({ model: 'm', messages: [] }),
    ).rejects.toThrow(/EXPO_PUBLIC_OPENROUTER_API_KEY/);
  });

  it('throws OpenRouterError with status preserved on non-2xx', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeTextResponse('upstream exploded', 500),
    );

    let caught: unknown;
    try {
      await chatCompletion({ model: 'm', messages: [] });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(OpenRouterError);
    const e = caught as OpenRouterError;
    expect(e.status).toBe(500);
    expect(e.body).toBe('upstream exploded');
  });

  it('sends Authorization, HTTP-Referer, X-Title and JSON content-type headers', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent({ ok: true })),
    );

    await chatCompletion({ model: 'm', messages: [] });

    const fetchMock = global.fetch as FetchMock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['HTTP-Referer']).toBe('https://antichud.test');
    expect(headers['X-Title']).toBe('Antichud');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('honors EXPO_PUBLIC_OPENROUTER_BASE_URL when set (dev proxy)', async () => {
    const original = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
    process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL = 'http://localhost:8787/v1';
    try {
      (global.fetch as FetchMock).mockResolvedValueOnce(
        makeJsonResponse(makeAssistantContent({ ok: true })),
      );
      await chatCompletion({ model: 'm', messages: [] });
      const [url] = (global.fetch as FetchMock).mock.calls[0]!;
      expect(url).toBe('http://localhost:8787/v1/chat/completions');
    } finally {
      if (typeof original === 'string') {
        process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL = original;
      } else {
        delete process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
      }
    }
  });

  it('strips a trailing slash from the configured base URL', async () => {
    const original = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
    process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL = 'http://10.0.0.5:8787/v1/';
    try {
      (global.fetch as FetchMock).mockResolvedValueOnce(
        makeJsonResponse(makeAssistantContent({ ok: true })),
      );
      await chatCompletion({ model: 'm', messages: [] });
      const [url] = (global.fetch as FetchMock).mock.calls[0]!;
      expect(url).toBe('http://10.0.0.5:8787/v1/chat/completions');
    } finally {
      if (typeof original === 'string') {
        process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL = original;
      } else {
        delete process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL;
      }
    }
  });

  it('passes the AbortSignal through to fetch', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent({ ok: true })),
    );
    const ac = new AbortController();
    await chatCompletion({ model: 'm', messages: [] }, { signal: ac.signal });
    const [, init] = (global.fetch as FetchMock).mock.calls[0]!;
    expect(init?.signal).toBe(ac.signal);
  });
});

describe('estimateFoodKJ', () => {
  const validPayload = {
    name: 'Chicken sandwich',
    kj: 2100,
    confidence: 'high',
    items: [
      { name: 'Bun', kj: 800 },
      { name: 'Chicken patty', kj: 1100, qty: 1 },
      { name: 'Lettuce', kj: 30 },
    ],
  };

  it('returns the parsed EstimateResult on a valid 200 response', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent(validPayload)),
    );
    const result = await estimateFoodKJ({
      imageBase64: 'BASE64DATA',
    });
    expect(result.name).toBe('Chicken sandwich');
    expect(result.kj).toBe(2100);
    expect(result.confidence).toBe('high');
    expect(result.items.length).toBe(3);
    expect(result.items[1]).toEqual({ name: 'Chicken patty', kj: 1100, qty: 1 });
  });

  it('throws a structured parse error mentioning JSON when content is malformed', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent('this is not json {')),
    );
    await expect(
      estimateFoodKJ({ imageBase64: 'BASE64DATA' }),
    ).rejects.toThrow(/JSON/);
  });

  it('propagates OpenRouterError with status 500 on non-2xx upstream', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeTextResponse('boom', 500),
    );
    let caught: unknown;
    try {
      await estimateFoodKJ({ imageBase64: 'BASE64DATA' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(OpenRouterError);
    expect((caught as OpenRouterError).status).toBe(500);
  });

  it('embeds the supplied base64 in an image_url data URL', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent(validPayload)),
    );
    await estimateFoodKJ({
      imageBase64: 'AAAA-image-bytes-AAAA',
      mimeType: 'image/png',
    });
    const [, init] = (global.fetch as FetchMock).mock.calls[0]!;
    const body = JSON.parse((init?.body as string) ?? '{}');
    const userMessage = body.messages.find(
      (m: { role: string }) => m.role === 'user',
    );
    expect(Array.isArray(userMessage.content)).toBe(true);
    const imagePart = userMessage.content.find(
      (p: { type: string }) => p.type === 'image_url',
    );
    expect(imagePart).toBeDefined();
    expect(imagePart.image_url.url).toBe(
      'data:image/png;base64,AAAA-image-bytes-AAAA',
    );
  });

  it('defaults the mime type to image/jpeg when omitted', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent(validPayload)),
    );
    await estimateFoodKJ({ imageBase64: 'XYZ' });
    const [, init] = (global.fetch as FetchMock).mock.calls[0]!;
    const body = JSON.parse((init?.body as string) ?? '{}');
    const userMessage = body.messages.find(
      (m: { role: string }) => m.role === 'user',
    );
    const imagePart = userMessage.content.find(
      (p: { type: string }) => p.type === 'image_url',
    );
    expect(imagePart.image_url.url).toBe('data:image/jpeg;base64,XYZ');
  });

  it('includes response_format: { type: "json_object" } in the request body', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent(validPayload)),
    );
    await estimateFoodKJ({ imageBase64: 'XYZ' });
    const [, init] = (global.fetch as FetchMock).mock.calls[0]!;
    const body = JSON.parse((init?.body as string) ?? '{}');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('coerces "medium" confidence synonym to "med"', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(
        makeAssistantContent({
          name: 'Salad',
          kj: 500,
          confidence: 'medium',
          items: [],
        }),
      ),
    );
    const result = await estimateFoodKJ({ imageBase64: 'XYZ' });
    expect(result.confidence).toBe('med');
  });

  it('coerces unknown confidence values to "med"', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(
        makeAssistantContent({
          name: 'Salad',
          kj: 500,
          confidence: 'totally sure',
          items: [],
        }),
      ),
    );
    const result = await estimateFoodKJ({ imageBase64: 'XYZ' });
    expect(result.confidence).toBe('med');
  });

  it('rounds non-integer kj values', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(
        makeAssistantContent({
          name: 'Toast',
          kj: 412.7,
          confidence: 'low',
          items: [{ name: 'Bread', kj: 412.7 }],
        }),
      ),
    );
    const result = await estimateFoodKJ({ imageBase64: 'XYZ' });
    expect(result.kj).toBe(413);
    expect(result.items[0]?.kj).toBe(413);
  });

  it('passes the user hint into the user message text', async () => {
    (global.fetch as FetchMock).mockResolvedValueOnce(
      makeJsonResponse(makeAssistantContent(validPayload)),
    );
    await estimateFoodKJ({
      imageBase64: 'XYZ',
      hint: 'large portion, deep fried',
    });
    const [, init] = (global.fetch as FetchMock).mock.calls[0]!;
    const body = JSON.parse((init?.body as string) ?? '{}');
    const userMessage = body.messages.find(
      (m: { role: string }) => m.role === 'user',
    );
    const textPart = userMessage.content.find(
      (p: { type: string }) => p.type === 'text',
    );
    expect(textPart.text).toContain('large portion, deep fried');
  });
});
