// IMPORTANT: this file runs as a Jest setupFiles entry. We must avoid direct
// `process.env.EXPO_PUBLIC_*` reads/writes here, because babel-preset-expo's
// inline-env-vars plugin would replace them with literals at transform time.
// Use a computed key so the babel plugin can't pattern-match it.
const ENV_PREFIX = 'EXPO_PUBLIC_';
process.env[ENV_PREFIX + 'OPENROUTER_API_KEY'] = 'test-key';
process.env[ENV_PREFIX + 'OPENROUTER_MODEL'] = 'google/gemini-2.5-flash';
process.env[ENV_PREFIX + 'OPENROUTER_REFERER'] = 'https://antichud.test';
