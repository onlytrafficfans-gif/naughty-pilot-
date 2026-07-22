// Creative brief actions via local Ollama — no cloud API, no API key.
// The user's brief is passed VERBATIM — never rewritten, summarized, or reinterpreted.
//
// Honesty boundary: only qwen2.5-coder:7b (text-only, no vision) is installed locally.
// - "Create variations" — genuine text ideation from the brief. Supported.
// - "Analyze the uploaded asset" / "Generate a new suggestion using the uploaded reference"
//   require a vision or image-generation model. None is installed, so these return a clear
//   error explaining what's missing instead of fabricating an analysis or a fake image.
// - "Resize it for placements" is handled entirely client-side (real canvas resize, no AI).
import { ollamaChat, isOllamaReachable } from './_ollama.mjs';

const SYSTEM = `Follow the user's brief exactly. Do not change, substitute, or reinterpret the subject, wording, names, colors, products, clothing, layouts, or visual references. If the brief includes text meant to appear in an image, reproduce it verbatim. Do not introduce unrelated objects, people, logos, text, or themes. Do not claim to have seen an image — you have no vision capability. If the brief is unclear, respond only with a clarifying question prefixed "CLARIFY:".`;

const VISION_REQUIRED = new Set([
  'Analyze the uploaded asset',
  'Generate a new suggestion using the uploaded reference',
]);

export async function runCreativeAction(body) {
  const { brief, action } = body || {};
  if (!brief?.trim()) throw new Error('A brief is required.');

  if (VISION_REQUIRED.has(action)) {
    throw new Error(`"${action}" requires a vision or image-generation model. Only qwen2.5-coder:7b (text-only) is installed locally — pull a vision model (e.g. "ollama pull llava") to enable this.`);
  }

  if (!(await isOllamaReachable())) {
    throw new Error('Ollama is not reachable at 127.0.0.1:11434 — start it with "ollama serve".');
  }

  const text = await ollamaChat({
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
