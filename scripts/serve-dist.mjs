/**
 * Minimal static server for dist/ that applies the security headers from
 * public/_headers, so browser tests run against the exact CSP the production
 * site ships with (spec §10.2). Test infrastructure only — production
 * hosting is Cloudflare Pages serving the same files and headers.
 *
 * Usage: node scripts/serve-dist.mjs [--port 4173]
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..');
const DIST = join(ROOT, 'dist');

const portFlag = process.argv.indexOf('--port');
const PORT = portFlag !== -1 ? Number(process.argv[portFlag + 1]) : 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.map': 'application/json',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** Parse the Cloudflare Pages _headers format: pattern line + indented headers. */
async function loadHeaderRules() {
  const text = await readFile(join(ROOT, 'public', '_headers'), 'utf8');
  const rules = [];
  let current = null;
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim() === '' || rawLine.trim().startsWith('#')) continue;
    if (!rawLine.startsWith(' ') && !rawLine.startsWith('\t')) {
      current = { pattern: rawLine.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const line = rawLine.trim();
      const colon = line.indexOf(':');
      if (colon > 0) {
        current.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
      }
    }
  }
  return rules;
}

function patternMatches(pattern, pathname) {
  if (pattern === '/*') return true;
  if (pattern.endsWith('/*')) return pathname.startsWith(pattern.slice(0, -1));
  return pattern === pathname;
}

const headerRules = await loadHeaderRules();

const server = createServer((request, response) => {
  void handle(request, response);
});

async function handle(request, response) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';

  const filePath = normalize(join(DIST, pathname));
  if (!filePath.startsWith(DIST)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  for (const rule of headerRules) {
    if (patternMatches(rule.pattern, url.pathname)) {
      for (const [name, value] of rule.headers) response.setHeader(name, value);
    }
  }

  try {
    const body = await readFile(filePath);
    response.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
    response.writeHead(200);
    response.end(body);
  } catch {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.writeHead(404);
    response.end('Not found');
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving dist/ with security headers at http://127.0.0.1:${String(PORT)}`);
});
