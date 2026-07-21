import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnalyzeHandler } from './analyze-website.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

export async function createLocalServer() {
  const app = express();
  app.use(express.json({ limit: '20kb' }));
  app.post('/api/analyze-website', createAnalyzeHandler());
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
