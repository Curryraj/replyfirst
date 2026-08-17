// Local dev server — plain Node, no dependencies, no Vercel CLI needed.
//   node dev-server.js   →   http://localhost:3000
//
// Production on Vercel doesn't use this file; there, /api/chat.js is picked up
// as a serverless function automatically.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import handler from './api/chat.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = process.env.PORT || 3001;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

// Minimal shim so api/chat.js can be written against the Vercel handler signature.
function decorate(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/chat') {
    req.body = await readBody(req);
    try {
      return await handler(req, decorate(res));
    } catch (err) {
      console.error(err);
      return decorate(res).status(500).json({ error: 'Handler threw.' });
    }
  }

  const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  try {
    const file = await readFile(join(ROOT, rel));
    res.setHeader('Content-Type', MIME[extname(rel)] ?? 'application/octet-stream');
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`\n  ReplyFirst demo → http://localhost:${PORT}\n`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('  ⚠  GEMINI_API_KEY is not set — the chat will error until it is.\n');
  }
});
