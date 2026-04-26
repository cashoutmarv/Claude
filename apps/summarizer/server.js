const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

// Mock AI summarization. Swap this out for a real model call (Claude, OpenAI, etc.)
// when you're ready — keep the same input/output contract.
function mockSummarize(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Please provide some text to summarize.';

  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
  const wordCount = cleaned.split(' ').length;

  // Pick an extractive summary: first sentence + the longest middle sentence + last
  const picks = [];
  if (sentences.length > 0) picks.push(sentences[0].trim());
  if (sentences.length > 2) {
    const middle = sentences
      .slice(1, -1)
      .sort((a, b) => b.length - a.length)[0];
    if (middle) picks.push(middle.trim());
  }
  if (sentences.length > 1) picks.push(sentences[sentences.length - 1].trim());

  const summary = picks.join(' ');
  return `Summary (${wordCount} words → ${summary.split(' ').length}): ${summary}`;
}

function serveStatic(req, res) {
  let filePath = path.join(
    PUBLIC_DIR,
    req.url === '/' ? 'index.html' : req.url.split('?')[0]
  );
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/summarize') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body || '{}');
        const summary = mockSummarize(String(text || ''));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ summary }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Summarizer running at http://localhost:${PORT}`);
});
