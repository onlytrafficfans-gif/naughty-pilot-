// Campaign text generation through the server-side OpenAI Responses API.
import { openaiJSON } from './_openai.mjs';

const SYSTEM = `You are a media buyer writing ad copy for adult-creator subscription campaigns. Output must be brand-safe (no explicit language), policy-safe (no platform names), and match the requested angle exactly. Respond with ONLY a JSON object, no markdown, no commentary, matching this exact shape:
{"objective":"one line","audienceNotes":"one sentence","adCopy":[{"variant":"short name","hook":"under 90 chars, no platform names","cta":"under 40 chars"}, ... 4 to 6 items]}`;

const CAMPAIGN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['objective', 'audienceNotes', 'adCopy'],
  properties: {
    objective: { type: 'string' },
    audienceNotes: { type: 'string' },
    adCopy: { type: 'array', minItems: 4, maxItems: 6, items: {
      type: 'object', additionalProperties: false,
      required: ['variant', 'hook', 'cta'],
      properties: { variant: { type: 'string' }, hook: { type: 'string' }, cta: { type: 'string' } },
    } },
  },
};

export async function generateCampaign(body) {
  const { angle, region, budget, price, brand, positioning, siteHooks = [] } = body || {};

  const prompt = `Campaign inputs:
- Creative angle: ${angle || 'Confident & playful'}
- Target: ${region || 'United States · 21+'}
- Test budget: $${budget || 300} · Subscription price: $${price || 19.99}
${brand ? `- Brand: ${brand} (${positioning || 'creator brand'})` : ''}
${siteHooks.length ? `- Copy hooks found on the brand's own site: ${siteHooks.join(' | ')}` : ''}

Write the campaign objective, one audience note, and 4-6 ad copy variants for this angle and audience.`;

  const object = await openaiJSON({ system: SYSTEM, prompt, schema: CAMPAIGN_SCHEMA });
  if (!Array.isArray(object.adCopy) || !object.adCopy.length) throw new Error('OpenAI returned an incomplete campaign.');
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
