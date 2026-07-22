// Local Ollama text generation — no cloud API, no API key, $0 cost.
// Requires Ollama running at OLLAMA_HOST (default http://127.0.0.1:11434) with a model pulled.

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

export async function isOllamaReachable() {
  try {
    const r = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}

// Chat with an OPTIONAL JSON schema hint (Ollama's `format:"json"` forces valid JSON, not a specific shape,
// so the shape is enforced by prompting + a light parse/validate step by the caller).
export async function ollamaChat({ system, prompt, json = false, timeoutMs = 45000 }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const r = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, format: json ? 'json' : undefined, stream: false }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`Ollama returned ${r.status}. Is "ollama serve" running with ${MODEL} pulled?`);
  const data = await r.json();
  return data.message?.content || '';
}

export async function ollamaChatJSON(args) {
  const raw = await ollamaChat({ ...args, json: true });
  try { return JSON.parse(raw); }
  catch { throw new Error('Local model returned invalid JSON.'); }
}
