#!/usr/bin/env node

/**
 * Study Dashboard Server
 * Handles file serving and API endpoints for shared uploads and quiz results
 * Usage: node start-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const HOST = 'localhost';

// Ensure upload directories exist
const uploadDirs = [
    'uploads',
    'uploads/lectures',
    'uploads/files',
    'uploads/quizzes'
];

uploadDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// MIME types mapping
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.pdf': 'application/pdf'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // ===== API ENDPOINTS =====

    // Get all lectures metadata
    if (pathname === '/api/lectures' && req.method === 'GET') {
        const lecturesDir = path.join(__dirname, 'uploads/lectures');
        fs.readdir(lecturesDir, (err, files) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
            }
            const lectures = files.map(file => ({
                name: file,
                url: `/uploads/lectures/${file}`
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(lectures));
        });
        return;
    }

    // Get all files metadata
    if (pathname === '/api/files' && req.method === 'GET') {
        const filesDir = path.join(__dirname, 'uploads/files');
        fs.readdir(filesDir, (err, files) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
            }
            const filesList = files.map(file => ({
                name: file,
                url: `/uploads/files/${file}`
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(filesList));
        });
        return;
    }

    // Get all quizzes
    if (pathname === '/api/quizzes' && req.method === 'GET') {
        const quizzesDir = path.join(__dirname, 'uploads/quizzes');
        fs.readdir(quizzesDir, (err, files) => {
            if (err) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify([]));
                return;
            }
            const quizzes = files.map(file => ({
                name: file.replace('.json', ''),
                url: `/uploads/quizzes/${file}`
            }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(quizzes));
        });
        return;
    }

    // Save quiz results to CSV
    if (pathname === '/api/quiz-results' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const result = JSON.parse(body);
                const resultsFile = path.join(__dirname, 'results.csv');
                
                // Format: name,quiz,score,date,timestamp
                const row = `${result.name || 'Unknown'},${result.quizTitle || 'Unknown'},${result.score || 0},${new Date().toISOString()}\n`;

                // Add header if file doesn't exist
                if (!fs.existsSync(resultsFile)) {
                    fs.writeFileSync(resultsFile, 'Name,Quiz,Score,Date\n');
                }

                fs.appendFileSync(resultsFile, row);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Result saved' }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Handle file uploads (admin uploads)
    if (pathname === '/api/upload' && req.method === 'POST') {
        let body = Buffer.alloc(0);
        req.on('data', chunk => {
            body = Buffer.concat([body, chunk]);
        });
        req.on('end', () => {
            try {
                // Parse multipart form data
                const boundary = req.headers['content-type'].split('boundary=')[1];
                if (!boundary) {
                    throw new Error('No boundary found');
                }

                const boundaryBuffer = Buffer.from('--' + boundary);
                const endBoundaryBuffer = Buffer.from('--' + boundary + '--');
                
                // Split by boundary
                let currentPos = 0;
                let parts = [];
                let searchPos = 0;
                
                while (searchPos < body.length) {
                    const boundaryPos = body.indexOf(boundaryBuffer, searchPos);
                    if (boundaryPos === -1) break;
                    
                    if (boundaryPos > searchPos) {
                        parts.push(body.slice(searchPos, boundaryPos));
                    }
                    searchPos = boundaryPos + boundaryBuffer.length;
                }
                
                if (searchPos < body.length) {
                    parts.push(body.slice(searchPos));
                }

                // Extract file and metadata
                let fileName = '';
                let fileType = '';
                let fileBuffer = null;
                let fileSubject = '';

                for (let part of parts) {
                    const partStr = part.toString('utf8', 0, Math.min(500, part.length));
                    
                    // Parse Content-Disposition header
                    const nameMatch = partStr.match(/name="([^"]+)"/);
                    if (!nameMatch) continue;
                    
                    const fieldName = nameMatch[1];
                    
                    if (fieldName === 'file') {
                        const fileNameMatch = partStr.match(/filename="([^"]+)"/);
                        if (fileNameMatch) fileName = fileNameMatch[1];
                        
                        const contentTypeMatch = partStr.match(/Content-Type: ([^\r\n]+)/);
                        if (contentTypeMatch) fileType = contentTypeMatch[1];
                        
                        // Find the file content (after headers)
                        const headerEndPos = part.indexOf('\r\n\r\n');
                        if (headerEndPos !== -1) {
                            fileBuffer = part.slice(headerEndPos + 4);
                            // Remove trailing CRLF
                            if (fileBuffer.length > 2) {
                                fileBuffer = fileBuffer.slice(0, -2);
                            }
                        }
                    } else if (fieldName === 'subject') {
                        // Extract subject value
                        const contentStart = partStr.indexOf('\r\n\r\n');
                        if (contentStart !== -1) {
                            const content = part.slice(contentStart + 4);
                            const contentEnd = content.indexOf('\r\n');
                            fileSubject = content.slice(0, contentEnd > -1 ? contentEnd : content.length).toString('utf8').trim();
                        }
                    } else if (fieldName === 'type') {
                        // Extract upload type (lecture, file, quiz)
                        const contentStart = partStr.indexOf('\r\n\r\n');
                        if (contentStart !== -1) {
                            const content = part.slice(contentStart + 4);
                            const contentEnd = content.indexOf('\r\n');
                            var uploadType = content.slice(0, contentEnd > -1 ? contentEnd : content.length).toString('utf8').trim();
                        }
                    }
                }

                if (!fileName || !fileBuffer) {
                    throw new Error('No file provided');
                }

                // Determine upload directory based on file type
                let uploadDir;
                if (uploadType === 'lecture') {
                    uploadDir = path.join(__dirname, 'uploads/lectures');
                } else if (uploadType === 'quiz') {
                    uploadDir = path.join(__dirname, 'uploads/quizzes');
                } else {
                    uploadDir = path.join(__dirname, 'uploads/files');
                }

                // Ensure directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Save file with sanitized name
                const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
                const filePath = path.join(uploadDir, sanitizedFileName);

                fs.writeFileSync(filePath, fileBuffer);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: `File uploaded successfully`,
                    file: sanitizedFileName,
                    path: `/uploads/${uploadType === 'lecture' ? 'lectures' : uploadType === 'quiz' ? 'quizzes' : 'files'}/${sanitizedFileName}`,
                    type: uploadType
                }));
            } catch (err) {
                console.error('Upload error:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Download results CSV (admin only - no protection for now)
    if (pathname === '/api/results-download' && req.method === 'GET') {
        const resultsFile = path.join(__dirname, 'results.csv');
        if (!fs.existsSync(resultsFile)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('No results yet');
            return;
        }
        fs.readFile(resultsFile, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error reading file');
                return;
            }
            res.writeHead(200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="quiz-results.csv"'
            });
            res.end(content);
        });
        return;
    }

    // ===== FILE SERVING =====

    let filePath = path.join(__dirname, pathname);

    // If it's a directory, serve index.html
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }

    // If file doesn't exist, serve index.html (for SPA routing)
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading file: ' + err.message);
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    });
});

server.listen(PORT, HOST, () => {
    console.log('========================================');
    console.log('Study Dashboard - Server Running');
    console.log('========================================');
    console.log('');
    console.log(`✅ http://${HOST}:${PORT}/`);
    console.log('');
    console.log('📂 Folders:');
    console.log('   • uploads/lectures/ - Lecture videos');
    console.log('   • uploads/files/ - Documents');
    console.log('   • uploads/quizzes/ - Quiz files');
    console.log('');
    console.log('📊 Results: results.csv (auto-created)');
    console.log('');
    console.log('Press Ctrl+C to stop');
    console.log('');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error('   Try: node start-server.js 3000');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n✋ Server stopped.');
    process.exit(0);
});
