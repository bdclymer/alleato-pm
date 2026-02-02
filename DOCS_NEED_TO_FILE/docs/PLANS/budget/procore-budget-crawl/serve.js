import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8080;
const BASE_DIR = __dirname;
const PARENT_DIR = path.dirname(BASE_DIR); // scripts/screenshot-capture

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown'
};

// SSE clients
const clients = [];

// Function to scan a directory for markdown files
function scanDirectory(dirPath, category, baseKey = '') {
  const files = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath);
  entries.forEach(entry => {
    if (entry.endsWith('.md')) {
      const name = entry.replace('.md', '').replace(/-/g, ' ');
      // Use URL-safe path encoding for parent directories
      const filePath = baseKey ? `/file?path=${baseKey}/${entry}` : `/${entry}`;
      files.push({
        name: name,
        path: filePath,
        category: category
      });
    }
  });

  return files;
}

// Path mapping for URL-safe keys
const PATH_MAP = {
  'budget': BASE_DIR,
  'budget-reports': path.join(BASE_DIR, 'reports'),
  'prime-contracts': path.join(PARENT_DIR, 'procore-prime-contracts-crawl'),
  'support': path.join(PARENT_DIR, 'procore-support-crawl'),
  'docs': path.join(PARENT_DIR, 'docs')
};

// Function to scan for markdown files across all directories
function getMarkdownFiles() {
  const files = [];

  // Budget crawl documentation
  files.push(...scanDirectory(BASE_DIR, 'Budget'));

  // Budget reports
  files.push(...scanDirectory(PATH_MAP['budget-reports'], 'Budget Reports', 'budget-reports'));

  // Prime Contracts documentation
  files.push(...scanDirectory(PATH_MAP['prime-contracts'], 'Prime Contracts', 'prime-contracts'));

  // Support documentation
  files.push(...scanDirectory(PATH_MAP['support'], 'Support', 'support'));

  // General docs
  files.push(...scanDirectory(PATH_MAP['docs'], 'Documentation', 'docs'));

  return files;
}

const server = http.createServer((req, res) => {
  // Handle API endpoints
  if (req.url === '/api/files') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const files = getMarkdownFiles();
    res.end(JSON.stringify(files));
    return;
  }

  // Handle file requests with query parameter
  if (req.url.startsWith('/file?path=')) {
    const urlParams = new URL(req.url, `http://localhost:${PORT}`);
    const pathParam = urlParams.searchParams.get('path');

    if (pathParam) {
      // Parse the path: baseKey/filename
      const [baseKey, ...filenameParts] = pathParam.split('/');
      const filename = filenameParts.join('/');

      if (PATH_MAP[baseKey]) {
        const filePath = path.join(PATH_MAP[baseKey], filename);
        console.log(`[File Request] baseKey: ${baseKey}, filename: ${filename} -> ${filePath}`);

        fs.readFile(filePath, (error, content) => {
          if (error) {
            console.warn(`[404] File not found: ${filePath}`);
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            console.log(`[200] Served: ${filePath}`);
            res.writeHead(200, { 'Content-Type': 'text/markdown' });
            res.end(content, 'utf-8');
          }
        });
        return;
      }
    }

    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>400 Bad Request</h1>', 'utf-8');
    return;
  }

  if (req.url === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    clients.push(res);

    req.on('close', () => {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
      }
    });
    return;
  }

  // Serve static files
  let filePath;

  // Remove query string from URL
  const urlPath = req.url.split('?')[0];

  // Check if URL starts with a project folder
  const urlParts = urlPath.split('/').filter(p => p);
  const firstPart = urlParts[0];

  // Map URLs like /procore-prime-contracts-crawl/... to the correct directory
  if (firstPart === 'procore-prime-contracts-crawl') {
    filePath = path.join(PARENT_DIR, urlPath);
  } else if (firstPart === 'procore-support-crawl') {
    filePath = path.join(PARENT_DIR, urlPath);
  } else if (firstPart === 'procore-budget-crawl') {
    filePath = path.join(PARENT_DIR, urlPath);
  } else {
    // Default to BASE_DIR
    filePath = path.join(BASE_DIR, urlPath === '/' ? 'viewer.html' : urlPath);
  }

  console.log(`[Static] URL: ${req.url} -> FilePath: ${filePath}`);

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        console.warn(`[404] File not found: ${filePath}`);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        console.error(`[500] Error reading ${filePath}:`, error);
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      console.log(`[200] Served: ${filePath}`);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  console.log(`Serving files from: ${BASE_DIR}`);
});
