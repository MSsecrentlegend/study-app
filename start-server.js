#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const HOST = 'localhost';

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/lectures', 'uploads/files', 'uploads/quizzes'];
uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

const mimeTypes = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf', '.mp4': 'video/mp4'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname);

    // --- NEW: QUIZ RESULTS API ENDPOINT ---
    if (req.method === 'POST' && parsedUrl.pathname === '/api/save-results') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const csvLine = `${new Date().toLocaleString()}, ${data.username}, ${data.quizTitle}, ${data.score}%\n`;
                
                fs.appendFile(path.join(__dirname, 'results.csv'), csvLine, (err) => {
                    if (err) {
                        res.writeHead(500);
                        return res.end('Error writing to file');
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'success' }));
                });
            } catch (e) {
                res.writeHead(400);
                res.end('Invalid JSON');
            }
        });
        return;
    }

    // Standard File Serving Logic
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
});

server.listen(PORT, HOST, () => {
    console.log(`✅ Server running at http://${HOST}:${PORT}/`);
    console.log(`📊 Results will be saved to: ${path.join(__dirname, 'results.csv')}`);
});