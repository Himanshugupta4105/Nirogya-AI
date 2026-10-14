const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5500;
const ROOT = path.join(__dirname, 'frontend');

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
    '.woff': 'font/woff', '.ttf': 'font/ttf', '.pdf': 'application/pdf',
    '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
    let url = decodeURIComponent(req.url.split('?')[0]);
    if (url === '/') url = '/INDEX.html';
    
    const filePath = path.join(ROOT, url);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            // Try with .html extension
            fs.readFile(filePath + '.html', (err2, data2) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data2);
            });
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n  ✳  Nirogya AI running at:\n`);
    console.log(`     ➜  http://localhost:${PORT}/`);
    console.log(`     ➜  http://localhost:${PORT}/INDEX.html`);
    console.log(`     ➜  http://localhost:${PORT}/features.html\n`);
});
