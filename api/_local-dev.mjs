import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createAnalyzeHandler } from './analyze-website.mjs';
import { createGenerateHandler } from './generate-campaign.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load .env.local (VERCEL_OIDC_TOKEN for AI Gateway) — Node doesn't auto-load env files.
function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export async function createLocalServer() {
  loadEnvLocal();
  const app = express();
  app.use(express.json({ limit: '8mb' }));
  app.post('/api/analyze-website', createAnalyzeHandler());
  app.post('/api/generate-campaign', createGenerateHandler());
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
  const port = Number(process.env.PORT || 4178);
  app.listen(port, '127.0.0.1', () => {
    console.log(`\n🚀 Naughty Pilot LOCAL — http://127.0.0.1:${port}`);
    console.log(`   API: http://127.0.0.1:${port}/api/analyze-website`);
  });
  return app;
}
