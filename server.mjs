import express from 'express';
import { createServer as createViteServer } from 'vite';
import * as cheerio from 'cheerio';
import { lookup } from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const production = process.argv.includes('--production');
const app = express();
app.use(express.json({ limit: '20kb' }));

function isPrivate(address) {
  return /^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd|fe80)/i.test(address) || /^172\.(1[6-9]|2\d|3[01])\./.test(address);
}

async function validateUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP and HTTPS websites are supported.');
  const resolved = await lookup(url.hostname, { all: true });
  if (!resolved.length || resolved.some(item => isPrivate(item.address))) throw new Error('That website address is not allowed.');
  return url;
}

const clean = value => value.replace(/\s+/g, ' ').trim();
const unique = values => [...new Set(values.map(clean).filter(value => value.length > 2))];

app.post('/api/analyze-website', async (req, res) => {
  try {
    const url = await validateUrl(String(req.body?.url || ''));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(url, { signal: controller.signal, headers: { 'user-agent': 'Mozilla/5.0 NaughtyPilotWebsiteAnalyzer/1.0', accept: 'text/html' } });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`Website returned ${response.status}.`);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) throw new Error('The URL did not return a webpage.');
    const html = (await response.text()).slice(0, 1_500_000);
    const $ = cheerio.load(html);
    const imageCandidates = [
      $('meta[property="og:image"]').attr('content') || '',
      ...$('img[src]').map((_, el) => $(el).attr('src') || '').get()
    ];
    const images = [...new Set(imageCandidates.map(source => {
      try { return new URL(source, response.url).href; } catch { return ''; }
    }).filter(source => source && !/data:|\.svg(?:\?|$)|logo|icon|avatar|favicon/i.test(source)))].slice(0, 18);
    $('script,style,noscript,svg,iframe').remove();
    const title = clean($('title').first().text());
    const description = clean($('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '');
    const headings = unique($('h1,h2,h3').map((_, el) => $(el).text()).get()).slice(0, 18);
    const callsToAction = unique($('button,a').map((_, el) => $(el).text()).get()).filter(text => text.length < 70).slice(0, 20);
    const socialLinks = unique($('a[href]').map((_, el) => $(el).attr('href') || '').get()).filter(href => /instagram|twitter|x\.com|tiktok|reddit|youtube|facebook/i.test(href)).slice(0, 12);
    const bodyLines = unique($('main p,main li,section p,section li,article p,body p').map((_, el) => $(el).text()).get()).filter(text => text.length > 25 && text.length < 500).slice(0, 24);
    const corpus = [title, description, ...headings, ...bodyLines].join(' ');
    const tone = [/luxury|elite|exclusive|premium/i.test(corpus)?'Luxury':'',/fantasy|desire|sensual/i.test(corpus)?'Fantasy-led':'',/private|discreet|privacy/i.test(corpus)?'Discreet':'',/book|contact|reserve/i.test(corpus)?'Conversion-focused':''].filter(Boolean);
    const sentences = unique(bodyLines.flatMap(line => line.split(/(?<=[.!?])\s+/))).filter(text => text.length >= 12 && text.length <= 120 && !/@|\b\d{3}[- )]|road|street|avenue|boulevard|homestead/i.test(text));
    const score = text => (/luxury|elite|exclusive|premium|bespoke/i.test(text)?5:0)+(/safe|indulge|spoil|personal|experience|wellness|vitality/i.test(text)?3:0)+(/book|contact|discover|await/i.test(text)?2:0)-(/typical|address|email|phone/i.test(text)?2:0);
    const adSuggestions = [...sentences].sort((a,b)=>score(b)-score(a)).slice(0,6);
    res.json({ url: response.url, title, description, headings, callsToAction, socialLinks, images, bodyLines, adSuggestions, profile: { brand: title.split(/[|–—-]/)[0]?.trim() || url.hostname, positioning: tone.join(' · ') || 'Premium creator brand', voice: tone.includes('Luxury')?'Confident, exclusive, personal':'Direct, personal, inviting', primaryCta: callsToAction.find(text => /book|contact|reserve|get started|join/i.test(text)) || callsToAction[0] || 'Learn more' } });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Website analysis failed.' });
  }
});

if (production) {
  app.use(express.static(path.join(root, 'dist')));
  app.use((req, res, next) => req.method === 'GET' ? res.sendFile(path.join(root, 'dist', 'index.html')) : next());
} else {
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}

const port = Number(process.env.PORT || 4178);
app.listen(port, '127.0.0.1', () => console.log(`Naughty Pilot running at http://127.0.0.1:${port}`));
