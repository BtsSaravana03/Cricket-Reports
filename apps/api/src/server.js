import { app } from './app.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static React Web UI from public folder if present
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  console.log('[Express Server] Serving static Web UI from:', publicDir);
  app.use(express.static(publicDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`Cricket Reports API backend running on http://localhost:${PORT}`);
});
