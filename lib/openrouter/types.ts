/**
 * OpenRouter chat-completion types and the local estimate I/O shapes.
 *
 * Energy is in **kilojoules (kJ)** end-to-end. Never kcal.
 */

import type { EnergyEstimate } from '@/types';

/**
 * Optional user-context block prepended to the prompt so Gemini scales
 * portions to the actual person and sanity-checks against their day.
 * All fields optional — pass whatever you have.
 */
export type EstimateUserContext = Readonly<{
  weight_kg?: number;
  target_weight_kg?: number;
  age?: number;
  sex?: 'male' | 'female';
  activity_level?: string;
  daily_goal_kj?: number;
  consumed_today_kj?: number;
}>;

export type EstimateInput = Readonly<{
  imageBase64: string;
  mimeType?: string;
  /** Free-form description of what the food is. */
  description?: string;
  /** Portion size hint (e.g. "half a serving", "120 g", "small bowl"). */
  portion?: string;
  /** Body + intake context to scale the estimate to this user. */
  userContext?: EstimateUserContext;
  /** @deprecated Use `description`. Kept for backwards compatibility. */
  hint?: string;
}>;

/**
 * Result of a single estimate call. `macros_check` is set client-side
 * after the model responds — when set to 'disagree', the macros and the
 * total kJ differ by more than 20% and the UI should warn the user.
 */
export type EstimateResult = EnergyEstimate & Readonly<{
  macros_check?: 'ok' | 'disagree' | 'unknown';
}>;

export type OpenRouterTextPart = Readonly<{
  type: 'text';
  text: string;
}>;

export type OpenRouterImageUrlPart = Readonly<{
  type: 'image_url';
  image_url: Readonly<{
    url: string;
    detail?: 'auto' | 'low' | 'high';
  }>;
}>;

export type OpenRouterContentPart = OpenRouterTextPart | OpenRouterImageUrlPart;

export type OpenRouterMessage = Readonly<{
  role: 'system' | 'user' | 'assistant';
  content: string | ReadonlyArray<OpenRouterContentPart>;
}>;

export type OpenRouterResponseFormat = Readonly<{
  type: 'json_object' | 'text';
}>;

export type OpenRouterChatRequest = Readonly<{
  model: string;
  messages: ReadonlyArray<OpenRouterMessage>;
  response_format?: OpenRouterResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}>;

export type OpenRouterChoice = Readonly<{
  index: number;
  finish_reason?: string;
  message: Readonly<{
    role: 'assistant';
    content: string;
  }>;
}>;

export type OpenRouterUsage = Readonly<{
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}>;

export type OpenRouterChatResponse = Readonly<{
  id?: string;
  model?: string;
  choices: ReadonlyArray<OpenRouterChoice>;
  usage?: OpenRouterUsage;
}>;

export class OpenRouterError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = status;
    this.body = body;
  }
}
