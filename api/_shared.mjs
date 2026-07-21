// Shared scraper engine — works in Node 18+ (native fetch + regex)
// Used by BOTH local dev server AND Vercel serverless functions

export async function analyzeWebsite(url) {
  const targetUrl = url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  const response = await fetch(targetUrl, {
    signal: controller.signal,
    headers: {
      'user-agent': 'Mozilla/5.0 NaughtyPilotWebsiteAnalyzer/2.0',
      'accept': 'text/html'
    }
  });
  clearTimeout(timer);

  if (!response.ok) throw new Error(`Website returned ${response.status}.`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) throw new Error('The URL did not return a webpage.');

  const html = (await response.text()).slice(0, 1_500_000);

  const extract = (regex) => {
    const m = html.match(regex);
    return m ? m[1].trim() : '';
  };

  const title = extract(/<title[^>]*>([^<]*)<\/title>/i);
  const description = extract(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || extract(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const ogTitle = extract(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDesc = extract(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i);

  const imageCandidates = [
    extract(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i),
    ...Array.from(html.matchAll(/<img[^>]*src=["']([^"']+)["']/gi)).map(m => m[1])
  ];
  const images = [...new Set(imageCandidates.map(src => {
    try { return new URL(src, response.url).href; } catch { return ''; }
  }).filter(src => src && !/data:|\.svg(?:\?|$)|logo|icon|avatar|favicon/i.test(src)))].slice(0, 18);

  const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const unique = (arr) => [...new Set(arr.filter(Boolean).map(clean).filter(s => s.length > 2))];

  const bodyHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  const headings = unique(Array.from(bodyHtml.matchAll(/<h[1-3][^>]*>([^<]*)<\/h[1-3]>/gi)).map(m => m[1])).slice(0, 18);
  const callsToAction = unique(Array.from(bodyHtml.matchAll(/<(button|a)[^>]*>([^<]{3,70})<\/(?:button|a)>/gi)).map(m => m[2])).slice(0, 20);
  const socialLinks = unique(Array.from(bodyHtml.matchAll(/<a[^>]*href=["']([^"']+)["']/gi)).map(m => m[1]).filter(href => /instagram|twitter|x\.com|tiktok|reddit|youtube|facebook/i.test(href))).slice(0, 12);
  const bodyLines = unique(Array.from(bodyHtml.matchAll(/<(p|li)[^>]*>([^<]{25,500})<\/(?:p|li)>/gi)).map(m => m[2])).slice(0, 24);

  const corpus = [title, description, ...headings, ...bodyLines].join(' ');
  const tone = [
    /luxury|elite|exclusive|premium/i.test(corpus) ? 'Luxury' : '',
    /fantasy|desire|sensual/i.test(corpus) ? 'Fantasy-led' : '',
    /private|discreet|privacy/i.test(corpus) ? 'Discreet' : '',
    /book|contact|reserve/i.test(corpus) ? 'Conversion-focused' : ''
  ].filter(Boolean);

  const sentences = unique(bodyLines.flatMap(line => line.split(/(?<=[.!?])\s+/))).filter(text => text.length >= 12 && text.length <= 120 && !/@|\b\d{3}[- )]|road|street|avenue|boulevard|homestead/i.test(text));

  const score = (text) =>
    (/luxury|elite|exclusive|premium|bespoke/i.test(text) ? 5 : 0) +
    (/safe|indulge|spoil|personal|experience|wellness|vitality/i.test(text) ? 3 : 0) +
    (/book|contact|discover|await/i.test(text) ? 2 : 0) -
    (/typical|address|email|phone/i.test(text) ? 2 : 0);

  const adSuggestions = [...sentences].sort((a, b) => score(b) - score(a)).slice(0, 6);

  return {
    url: response.url,
    title,
    description,
    headings,
    callsToAction,
    socialLinks,
    images,
    bodyLines,
    adSuggestions,
    profile: {
      brand: (ogTitle || title).split(/[|–—-]/)[0]?.trim() || new URL(response.url).hostname,
      positioning: tone.join(' · ') || 'Premium creator brand',
      voice: tone.includes('Luxury') ? 'Confident, exclusive, personal' : 'Direct, personal, inviting',
      primaryCta: callsToAction.find(text => /book|contact|reserve|get started|join/i.test(text)) || callsToAction[0] || 'Learn more'
    }
  };
}
