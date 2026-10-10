// Creative text generation. Uploaded assets are not sent to the model.
import { openaiText } from './_openai.mjs';

const SYSTEM = `Follow the user's brief exactly. Do not change, substitute, or reinterpret the subject, wording, names, colors, products, clothing, layouts, or visual references. If the brief includes text meant to appear in an image, reproduce it verbatim. Do not introduce unrelated objects, people, logos, text, or themes. Do not claim to have seen an image — you have no vision capability. If the brief is unclear, respond only with a clarifying question prefixed "CLARIFY:".`;

const VISION_REQUIRED = new Set([
  'Analyze the uploaded asset',
  'Generate a new suggestion using the uploaded reference',
]);

export async function runCreativeAction(body) {
  const { brief, action } = body || {};
  if (!brief?.trim()) throw new Error('A brief is required.');

  if (VISION_REQUIRED.has(action)) {
    throw new Error(`"${action}" requires a vision or image-generation model. This endpoint currently sends text only; uploaded asset analysis and image generation are not implemented.`);
  }

  const text = await openaiText({
    system: SYSTEM,
    prompt: `Action requested: ${action}\n\nUser brief (verbatim):\n${brief}`,
  });
  return { text };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    return res.status(200).json(await runCreativeAction(req.body));
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Creative action failed.' });
  }
}

export function createCreativeHandler() {
  return async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
      return res.json(await runCreativeAction(req.body));
    } catch (err) {
      return res.status(502).json({ error: err instanceof Error ? err.message : 'Creative action failed.' });
    }
  };
}
