import { analyzeWebsite } from './_shared.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { url } = req.body || {};
  if (!url?.trim()) {
    return res.status(400).json({ error: 'A URL is required.' });
  }
  try {
    const result = await analyzeWebsite(url);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Website analysis failed.';
    return res.status(400).json({ error: message });
  }
}

export function createAnalyzeHandler() {
  return async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const { url } = req.body || {};
    if (!url?.trim()) {
      return res.status(400).json({ error: 'A URL is required.' });
    }
    try {
      const result = await analyzeWebsite(url);
      return res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Website analysis failed.';
      return res.status(400).json({ error: message });
    }
  };
}
