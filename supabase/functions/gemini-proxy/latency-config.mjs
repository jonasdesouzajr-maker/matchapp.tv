// Explicitly supported models only. Unknown models retain provider defaults.
// https://ai.google.dev/gemini-api/docs/generate-content/thinking
// Keep Kids' existing inference configuration isolated from adult tuning.
export function withGeminiLatency(base, model, kidsMode = false) {
  if (kidsMode) return base;
  if (['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'].includes(model)) {
    return {...base, thinkingConfig: {thinkingLevel: 'low'}};
  }
  // Lite models already default to minimal; do not increase their effort.
  return base;
}

// Google now aliases 3.5 Flash to 3.6 Flash. Trying both on the same key
// repeats the same upstream after a failure instead of reaching a real fallback.
// Preserve first-choice order and independent project keys; Kids stays unchanged.
export function uniqueGeminiRoutes(routes, kidsMode = false) {
  if (kidsMode) return routes;
  const seen = new Map();
  return routes.filter(route => {
    const model = route.model === 'gemini-3.5-flash' ? 'gemini-3.6-flash' : route.model;
    if (!seen.has(route.key)) seen.set(route.key, new Set());
    const models = seen.get(route.key);
    if (models.has(model)) return false;
    models.add(model);
    return true;
  });
}
