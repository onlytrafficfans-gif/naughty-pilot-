import { createLocalServer } from './api/_local-dev.mjs';

createLocalServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
