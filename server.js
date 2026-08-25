/* 의존성 0인 정적 파일 서버 (Railway용).
   Node 내장 모듈만 사용하므로 npm install 이 필요 없다. */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8'
};

/* 전부 no-cache(= 매번 재검증). 바뀐 게 없으면 304 로 끝나므로 트래픽은 거의 같고,
   배너 PNG 를 갈아끼우거나 코드를 고쳤을 때 바로 반영된다. */
const CACHE_CONTROL = 'no-cache';

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Method Not Allowed');
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.parse(req.url).pathname);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad Request');
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }

  /* 경로 탈출 차단 */
  const filePath = path.join(ROOT, path.normalize(pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      /* SPA 는 아니지만, 알 수 없는 경로는 화면으로 돌려보낸다 */
      const fallback = path.join(ROOT, 'index.html');
      return fs.readFile(fallback, (e2, buf) => {
        if (e2) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('Not Found');
        }
        res.writeHead(404, {
          'Content-Type': MIME['.html'],
          'Cache-Control': 'no-cache'
        });
        res.end(buf);
      });
    }

    const ext = path.extname(filePath).toLowerCase();
    const lastModified = stat.mtime.toUTCString();
    const etag = '"' + stat.size.toString(16) + '-' + stat.mtimeMs.toString(16) + '"';

    /* 바뀐 게 없으면 본문 없이 304 */
    const inm = req.headers['if-none-match'];
    const ims = req.headers['if-modified-since'];
    if (inm === etag || (!inm && ims === lastModified)) {
      res.writeHead(304, { 'ETag': etag, 'Cache-Control': CACHE_CONTROL });
      return res.end();
    }

    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': CACHE_CONTROL,
      'ETag': etag,
      'Last-Modified': lastModified,
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`대화카드 서버 실행 중 → http://0.0.0.0:${PORT}`);
});
