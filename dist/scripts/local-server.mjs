import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portArg = process.argv.find((arg) => /^--port=/.test(arg));
const PORT = Number(process.env.PORT || portArg?.split('=')[1] || 8888);

async function loadDotEnv(filePath) {
  let text;
  try { text = await fs.readFile(filePath, 'utf8'); } catch { return; }
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}

await loadDotEnv(path.join(ROOT, '.env'));
const { default: tarotReading } = await import(pathToFileURL(path.join(ROOT, 'netlify/functions/tarot-reading.mjs')).href);

const MIME = Object.freeze({
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
});

function readBody(request, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('请求内容过大。'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

async function writeFetchResponse(nodeResponse, response) {
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, key) => nodeResponse.setHeader(key, value));
  if (!response.body) { nodeResponse.end(); return; }
  const reader = response.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      nodeResponse.write(Buffer.from(value));
    }
  } finally { nodeResponse.end(); }
}

async function serveStatic(request, response) {
  const requested = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${PORT}`).pathname);
  const relative = requested === '/' ? 'tarot.html' : requested.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relative);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Forbidden'); return;
  }
  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, { 'content-type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(file);
  } catch { response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Not found'); }
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://127.0.0.1:${PORT}`).pathname;
    if (pathname === '/api/tarot-reading') {
      const body = request.method === 'POST' ? await readBody(request) : undefined;
      const fetchRequest = new Request(`http://127.0.0.1:${PORT}${request.url}`, { method: request.method, headers: new Headers(request.headers), body: body?.length ? body : undefined });
      await writeFetchResponse(response, await tarotReading(fetchRequest));
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end('Method not allowed'); return; }
    await serveStatic(request, response);
  } catch (error) {
    response.writeHead(Number(error.statusCode) || 500, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: error.message || '本地服务发生错误。' }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`本地塔罗服务：http://localhost:${PORT}/tarot.html`);
  console.log(`AI 代理：${process.env.DASHSCOPE_API_KEY ? '已读取本地 Key' : '未读取 Key，请在 .env 填入 DASHSCOPE_API_KEY'}`);
  console.log(`模型：${process.env.DASHSCOPE_MODEL || 'qwen3.8-flash'}`);
});
