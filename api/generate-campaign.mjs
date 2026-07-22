// AI campaign generation via Vercel AI Gateway.
// Auth: VERCEL_OIDC_TOKEN (auto on Vercel; `vercel env pull` locally) or AI_GATEWAY_API_KEY.
import { generateObject, gateway } from 'ai';
import { z } from 'zod';

const MAX_IMAGES = 6;

const campaignSchema = z.object({
  ranking: z.array(z.object({
    index: z.number().describe('zero-based index of the image in the order provided'),
    score: z.number().min(0).max(10).describe('predicted ad performance 0-10'),
    reason: z.string().describe('one short sentence: why this image ranks here'),
    placement: z.string().describe('best placement, one of: TrafficJunky · CPM, ExoClick · Native, JuicyAds · Banner, Reddit · Organic, X / Social, Creator swaps'),
  })),
  adCopy: z.array(z.object({
    variant: z.string().describe('short variant name, e.g. Confidence lead'),
    hook: z.string().describe('scroll-stopping first line, under 90 chars, no platform names, no explicit language'),
    cta: z.string().describe('call to action under 40 chars'),
  })).min(3).max(6),
  objective: z.string().describe('one-line campaign objective'),
  audienceNotes: z.string().describe('one sentence on the target audience for this creative set'),
});

export async function generateCampaign(body) {
  const { images = [], angle, region, budget, price, brand, positioning, siteHooks = [] } = body || {};

  const content = [{
    type: 'text',
    text: `You are an expert media buyer for adult-creator subscription marketing. All output must be brand-safe and non-explicit — suitable for mainstream ad review. Never name any platform.

Campaign inputs:
- Creative angle: ${angle || 'Confident & playful'}
- Target: ${region || 'United States · 21+'}
- Test budget: $${budget || 300} · Subscription price: $${price || 19.99}
${brand ? `- Brand: ${brand} (${positioning || 'creator brand'})` : ''}
${siteHooks.length ? `- Copy hooks found on the brand's own site: ${siteHooks.join(' | ')}` : ''}

Analyze the ${Math.min(images.length, MAX_IMAGES)} attached campaign photos. Rank every image by predicted ad click-through for this angle and audience (composition, lighting, eye contact, clarity, policy safety), assign each its best placement, and write ad copy variants matched to the strongest images. If an image is unusable for ads, score it low and say why.`,
  }];

  for (const img of images.slice(0, MAX_IMAGES)) {
    if (img.base64) content.push({ type: 'image', image: img.base64 });
    else if (img.url) content.push({ type: 'image', image: new URL(img.url) });
  }

  const { object } = await generateObject({
    model: gateway('anthropic/claude-haiku-4.5'),
    schema: campaignSchema,
    messages: [{ role: 'user', content }],
    providerOptions: { gateway: { tags: ['feature:campaign-builder'], models: ['anthropic/claude-sonnet-4.6'] } },
  });
  return object;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const result = await generateCampaign(req.body);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Campaign generation failed.';
    return res.status(502).json({ error: message });
  }
}

export function createGenerateHandler() {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const result = await generateCampaign(req.body);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Campaign generation failed.';
      return res.status(502).json({ error: message });
    }
  };
}
