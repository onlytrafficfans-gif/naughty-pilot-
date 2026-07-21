import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body as { url?: string };

  if (!url || !url.trim()) {
    return res.status(400).json({ error: 'A URL is required.' });
  }

  let targetUrl = url.trim();
  if (!/^https?:\/\//.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  try {
    // Fetch the target page HTML
    const pageRes = await fetch(targetUrl, {
      headers: { 'User-Agent': 'NaughtyPilot-Analyzer/2.0' },
      signal: AbortSignal.timeout(10000),
    });

    const html = await pageRes.text();

    // Extract basic signals from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);

    const brand = (ogTitleMatch?.[1] || titleMatch?.[1] || new URL(targetUrl).hostname).trim();
    const positioning = (ogDescMatch?.[1] || descMatch?.[1] || h1Match?.[1] || 'No positioning copy detected.').trim();
    const primaryCta = detectCta(html);
    const voice = detectVoice(positioning);

    const adSuggestions = generateAdHooks(brand, positioning, primaryCta);

    return res.status(200).json({
      profile: { brand, positioning, primaryCta, voice },
      adSuggestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch the target URL.';
    return res.status(502).json({ error: message });
  }
}

function detectCta(html: string): string {
  const btnMatches = html.match(/<(?:button|a)[^>]*>([^<]{3,40})<\/(?:button|a)>/gi) || [];
  const ctaKeywords = ['sign up', 'get started', 'join', 'subscribe', 'try free', 'start', 'buy now', 'shop now', 'learn more'];
  for (const tag of btnMatches) {
    const text = tag.replace(/<[^>]+>/g, '').trim().toLowerCase();
    if (ctaKeywords.some((k) => text.includes(k))) {
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return 'Sign Up';
}

function detectVoice(positioning: string): string {
  const lower = positioning.toLowerCase();
  if (/bold|dominate|crush|hustle|fire|beast/.test(lower)) return 'Bold & Aggressive';
  if (/luxury|premium|exclusive|elite/.test(lower)) return 'Premium & Aspirational';
  if (/fun|playful|love|amazing|awesome/.test(lower)) return 'Playful & Friendly';
  if (/safe|trust|secure|proven|guarantee/.test(lower)) return 'Trustworthy & Reliable';
  return 'Conversational & Direct';
}

function generateAdHooks(brand: string, positioning: string, cta: string): string[] {
  return [
    `Stop scrolling. ${brand} is the traffic system you've been looking for.`,
    `${positioning.slice(0, 60)}${positioning.length > 60 ? '...' : ''} — ${cta} and see for yourself.`,
    `Why are creators switching to ${brand}? Because results don't lie.`,
    `${cta} → Your first campaign launches in minutes with ${brand}.`,
    `The algorithm rewards action. ${brand} shows you exactly what to post.`,
  ];
}
