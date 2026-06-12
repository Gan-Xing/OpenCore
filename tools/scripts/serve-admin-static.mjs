#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(
  process.env.ADMIN_STATIC_ROOT ||
    join(fileURLToPath(new URL('../..', import.meta.url)), 'apps/admin/dist'),
);
const port = Number(process.env.PORT || process.env.ADMIN_PORT || 39174);
const host = process.env.HOST || '0.0.0.0';
const indexFile = join(root, 'index.html');

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

if (!existsSync(indexFile)) {
  throw new Error(`Admin index.html not found under ${root}`);
}

const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  const filePath = resolveAssetPath(request.url || '/');
  const streamBody = request.method !== 'HEAD';

  response.writeHead(200, {
    'content-type': contentType(filePath),
    'cache-control':
      filePath === indexFile
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
  });

  if (!streamBody) {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      status: 'ready',
      service: 'opencore-admin-static',
      host,
      port,
      root,
    }),
  );
});

function resolveAssetPath(rawUrl) {
  const parsedUrl = new URL(rawUrl, `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(parsedUrl.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const candidate = resolve(root, `.${sep}${safePath}`);

  if (!candidate.startsWith(`${root}${sep}`) && candidate !== root) {
    return indexFile;
  }

  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }

  if (existsSync(join(candidate, 'index.html'))) {
    return join(candidate, 'index.html');
  }

  return indexFile;
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.gif':
      return 'image/gif';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.svg':
      return 'image/svg+xml';
    case '.txt':
      return 'text/plain; charset=utf-8';
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}
