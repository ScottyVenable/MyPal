/**
 * Simple HTTP server that serves test-harness.html for Playwright UI tests.
 * Runs on port 3099.
 */
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 3099;
const HARNESS_PATH = path.join(__dirname, 'test-harness.html');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';

  if (url === '/' || url === '/index.html') {
    try {
      const content = fs.readFileSync(HARNESS_PATH, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error reading harness: ${err}`);
    }
    return;
  }

  // Serve static files from the e2e directory
  const safePath = path.join(__dirname, path.normalize(url));
  if (!safePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(safePath);
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  try {
    const content = fs.readFileSync(safePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Test harness server running at http://localhost:${PORT}`);
});
