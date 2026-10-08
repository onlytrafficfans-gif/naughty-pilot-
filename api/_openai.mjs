// Server-only OpenAI Responses API adapter. Never expose this key to Vite.
export async function openaiText({ system, prompt, schema, timeoutMs = 45000 }) {
  const key = process.env.NP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI is not configured. Set NP_OPENAI_API_KEY on the server.');

  let response;
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.NP_OPENAI_MODEL || 'gpt-4.1-mini',
        instructions: system,
        input: prompt,
        store: false,
        max_output_tokens: 2000,
        ...(schema ? { text: { format: { type: 'json_schema', name: 'campaign', strict: true, schema } } } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new Error('OpenAI generation timed out. Please try again.');
    }
    throw new Error('Could not reach OpenAI. Check the server network configuration.');
  }
  // Do not forward raw upstream messages, which can contain credential details.
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('OpenAI authentication failed. Check the server API key and model access.');
    if (response.status === 429) throw new Error('OpenAI quota or rate limit reached. Check API billing or try again later.');
    throw new Error(`OpenAI generation failed (HTTP ${response.status}). Please try again.`);
  }
  const data = await response.json();
  const content = (data.output || []).flatMap(item => item.content || []);
  if (content.some(item => item.type === 'refusal')) throw new Error('OpenAI could not fulfill this request. Please revise the brief.');
  if (data.status !== 'completed') throw new Error('OpenAI returned an incomplete response. Please try again.');
  const text = content.filter(item => item.type === 'output_text').map(item => item.text).join('\n');
  if (!text.trim()) throw new Error('OpenAI returned no text. Please try again.');
  return text;
}

export async function openaiJSON(args) {
  const text = await openaiText(args);
  try { return JSON.parse(text); }
  catch { throw new Error('OpenAI returned invalid JSON. Please try again.'); }
}
