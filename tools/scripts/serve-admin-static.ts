#!/usr/bin/env node

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { basename, extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(
  process.env.ADMIN_STATIC_ROOT || join(__dirname, '../..', 'apps/admin/dist'),
);
const port = Number(process.env.PORT || process.env.ADMIN_PORT || 39174);
const host = process.env.HOST || '0.0.0.0';
const indexFile = join(root, 'index.html');
const apiProxyTarget = normalizeOptionalUrl(
  process.env.ADMIN_API_PROXY_TARGET || process.env.ADMIN_API_BASE_URL,
);
const retiredServiceWorkerBody = `
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('caches' in self) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    }

    await self.registration.unregister();

    const clients = await self.clients.matchAll({ type: 'window' });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});
`.trim();

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

if (!existsSync(indexFile)) {
  throw new Error(`Admin index.html not found under ${root}`);
}

const server = createServer((request, response) => {
  if (apiProxyTarget && isApiRequest(request.url || '/')) {
    proxyApiRequest(request, response);
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end('Method Not Allowed');
    return;
  }

  const streamBody = request.method !== 'HEAD';

  if (isRetiredServiceWorkerRequest(request.url || '/')) {
    response.writeHead(200, {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-store, max-age=0, must-revalidate',
    });
    response.end(streamBody ? retiredServiceWorkerBody : undefined);
    return;
  }

  const filePath = resolveAssetPath(request.url || '/');

  response.writeHead(200, {
    'content-type': contentType(filePath),
    'cache-control': cacheControl(filePath),
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

function isApiRequest(rawUrl) {
  const parsedUrl = new URL(rawUrl, `http://${host}:${port}`);
  return (
    parsedUrl.pathname === '/api' || parsedUrl.pathname.startsWith('/api/')
  );
}

function isRetiredServiceWorkerRequest(rawUrl) {
  const parsedUrl = new URL(rawUrl, `http://${host}:${port}`);
  return parsedUrl.pathname === '/service-worker.js';
}

function proxyApiRequest(clientRequest, clientResponse) {
  let targetUrl;
  const normalizedClientUrl = normalizeApiProxyRawUrl(clientRequest.url || '/');
  clientRequest.url = normalizedClientUrl;

  try {
    targetUrl = resolveProxyUrl(normalizedClientUrl);
  } catch (error) {
    clientResponse.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });
    clientResponse.end(
      JSON.stringify({
        statusCode: 502,
        message:
          error instanceof Error ? error.message : 'Invalid API proxy target',
      }),
    );
    return;
  }

  const headers = { ...clientRequest.headers, host: targetUrl.host };
  delete headers.connection;
  delete headers['proxy-connection'];
  delete headers['keep-alive'];
  delete headers['transfer-encoding'];
  delete headers.upgrade;

  const transport =
    targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const upstreamRequest = transport(
    {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: `${targetUrl.pathname}${targetUrl.search}`,
      method: clientRequest.method,
      headers,
    },
    (upstreamResponse) => {
      clientResponse.writeHead(
        upstreamResponse.statusCode || 502,
        upstreamResponse.headers,
      );
      upstreamResponse.pipe(clientResponse);
    },
  );

  upstreamRequest.on('error', (error) => {
    if (clientResponse.headersSent) {
      clientResponse.destroy(error);
      return;
    }

    clientResponse.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
    });
    clientResponse.end(
      JSON.stringify({
        statusCode: 502,
        message: 'Admin API proxy failed',
      }),
    );
  });

  clientRequest.pipe(upstreamRequest);
}

function resolveProxyUrl(rawUrl) {
  if (!apiProxyTarget) {
    throw new Error('ADMIN_API_PROXY_TARGET is not configured');
  }

  const incomingUrl = new URL(rawUrl, `http://${host}:${port}`);
  const basePath = apiProxyTarget.pathname.replace(/\/+$/, '');
  let proxyPath = normalizeApiProxyPath(incomingUrl.pathname);

  if (
    basePath &&
    basePath !== '/' &&
    proxyPath !== basePath &&
    !proxyPath.startsWith(`${basePath}/`)
  ) {
    proxyPath = `${basePath}${proxyPath}`;
  }

  proxyPath = normalizeApiProxyPath(proxyPath);

  return new URL(`${proxyPath}${incomingUrl.search}`, apiProxyTarget.origin);
}

function normalizeApiProxyPath(pathname) {
  return pathname.replace(/^\/api(?:\/api)+(?=\/|$)/u, '/api');
}

function normalizeApiProxyRawUrl(rawUrl) {
  const incomingUrl = new URL(rawUrl, `http://${host}:${port}`);
  incomingUrl.pathname = normalizeApiProxyPath(incomingUrl.pathname);
  return `${incomingUrl.pathname}${incomingUrl.search}`;
}

function normalizeOptionalUrl(value) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('API proxy target must use http or https');
    }
    return url;
  } catch (error) {
    throw new Error(
      `Invalid ADMIN_API_PROXY_TARGET/ADMIN_API_BASE_URL: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
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

function cacheControl(filePath) {
  const extension = extname(filePath);
  const name = basename(filePath);

  if (
    extension === '.html' ||
    extension === '.webmanifest' ||
    name === 'asset-manifest.json' ||
    name === 'manifest.json' ||
    name === 'service-worker.js' ||
    filePath.includes(`${sep}scripts${sep}`)
  ) {
    return 'no-cache';
  }

  return 'public, max-age=31536000, immutable';
}
