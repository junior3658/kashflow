/**
 * KASHFLOW Full-Stack Server
 * Express backend + Vite middleware on Port 3000.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Load .env before importing adapters and the SQLite auth store.
  const { apiRouter } = await import('./src/backend/routes');
  const app = express();
  app.disable('x-powered-by');
  const PORT = 3000;

  app.use(express.json({ limit: '32kb' }));

  // Mount KASHFLOW API Router
  app.use('/api/v1', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', product: 'KASHFLOW', timestamp: new Date().toISOString() });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KASHFLOW] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[KASHFLOW] Failed to start server:', err);
  process.exit(1);
});
