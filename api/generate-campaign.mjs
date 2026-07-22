// Campaign ad-copy generation via local Ollama — no cloud API, no API key.
// Note: no vision model is installed locally, so this does NOT analyze image content.
// Image ranking stays on the deterministic client-side heuristic (see rankImages in main.tsx),
// which is honestly labeled as such in the UI — never presented as AI vision analysis.
import { ollamaChatJSON, isOllamaReachable } from './_ollama.mjs';

const SYSTEM = `You are a media buyer writing ad copy for adult-creator subscription campaigns. Output must be brand-safe (no explicit language), policy-safe (no platform names), and match the requested angle exactly. Respond with ONLY a JSON object, no markdown, no commentary, matching this exact shape:
{"objective":"one line","audienceNotes":"one sentence","adCopy":[{"variant":"short name","hook":"under 90 chars, no platform names","cta":"under 40 chars"}, ... 4 to 6 items]}`;

export async function generateCampaign(body) {
  const { angle, region, budget, price, brand, positioning, siteHooks = [] } = body || {};

  if (!(await isOllamaReachable())) {
    throw new Error('Ollama is not reachable at 127.0.0.1:11434 — start it with "ollama serve".');
  }

  const prompt = `Campaign inputs:
- Creative angle: ${angle || 'Confident & playful'}
- Target: ${region || 'United States · 21+'}
- Test budget: $${budget || 300} · Subscription price: $${price || 19.99}
${brand ? `- Brand: ${brand} (${positioning || 'creator brand'})` : ''}
${siteHooks.length ? `- Copy hooks found on the brand's own site: ${siteHooks.join(' | ')}` : ''}

Write the campaign objective, one audience note, and 4-6 ad copy variants for this angle and audience.`;

  const object = await ollamaChatJSON({ system: SYSTEM, prompt });
  if (!Array.isArray(object.adCopy) || !object.adCopy.length) throw new Error('Local model returned an incomplete campaign.');
  return object;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    return res.status(200).json(await generateCampaign(req.body));
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Campaign generation failed.' });
  }
}

export function createGenerateHandler() {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      return res.json(await generateCampaign(req.body));
    } catch (err) {
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Campaign generation failed.' });
    }
  };
}
