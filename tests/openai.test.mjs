import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { openaiText } from '../server/_openai.mjs';
import { generateCampaign } from '../server/generate-campaign.mjs';
import { runCreativeAction } from '../server/generate-creative.mjs';
const originalFetch = globalThis.fetch;
const originalKey = process.env.NP_OPENAI_API_KEY;
const originalStandardKey = process.env.OPENAI_API_KEY;
after(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of [['NP_OPENAI_API_KEY', originalKey], ['OPENAI_API_KEY', originalStandardKey]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
const completed = text => new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] }));
test('missing key fails before making an upstream request', async () => {
  delete process.env.NP_OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  globalThis.fetch = () => { throw new Error('must not fetch'); };
  await assert.rejects(openaiText({ prompt: 'test' }), /not configured/);
});
test('campaign preserves endpoint shape and requests strict structured output', async () => {
  process.env.NP_OPENAI_API_KEY = 'test-only';
  const campaign = { objective: 'Launch', audienceNotes: 'Adults', adCopy: Array.from({ length: 4 }, () => ({ variant: 'A', hook: 'Discover', cta: 'Learn more' })) };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false); assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.schema.additionalProperties, false);
    assert.match(body.input, /Example Brand/);
    return completed(JSON.stringify(campaign));
  };
  assert.deepEqual(await generateCampaign({ brand: 'Example Brand' }), campaign);
});
test('creative brief reaches the API verbatim and returns text', async () => {
  const brief = 'Blue poster with exact text: Hello!';
  globalThis.fetch = async (_, options) => {
    const body = JSON.parse(options.body);
    assert.ok(body.input.endsWith(brief)); assert.equal(body.text, undefined);
    return completed('Three creative variations');
  };
  assert.deepEqual(await runCreativeAction({ brief, action: 'Create variations' }), { text: 'Three creative variations' });
  await assert.rejects(runCreativeAction({ brief, action: 'Analyze the uploaded asset' }), /not implemented/);
});
test('errors never forward upstream credentials; refusals and incomplete responses fail clearly', async () => {
  globalThis.fetch = async () => new Response('credential-details', { status: 401 });
  await assert.rejects(openaiText({ prompt: 'x' }), error => /authentication failed/.test(error.message) && !error.message.includes('credential-details'));
  globalThis.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(openaiText({ prompt: 'x' }), /quota or rate limit/);
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }));
  await assert.rejects(openaiText({ prompt: 'x' }), /revise the brief/);
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 'incomplete', output: [] }));
  await assert.rejects(openaiText({ prompt: 'x' }), /incomplete/);
  globalThis.fetch = async () => { throw new DOMException('timeout', 'TimeoutError'); };
  await assert.rejects(openaiText({ prompt: 'x' }), /timed out/);
});
