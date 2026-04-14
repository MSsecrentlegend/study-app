/**
 * Vercel Blob Storage Upload Handler
 * 
 * This API endpoint handles file uploads to Vercel Blob Storage.
 * Configure in your Vercel project dashboard.
 * 
 * Path: api/upload.js (in root or functions directory)
 */

import { put, list, del } from '@vercel/blob';

// Verify admin authentication
function authenticateAdmin(request) {
  const adminToken = request.headers['x-admin-token'] || request.body?.adminToken;
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken) {
    throw new Error('ADMIN_TOKEN not configured');
  }
  
  if (adminToken !== expectedToken) {
    throw new Error('Invalid admin token');
  }
  
  return true;
}

// Validate file type
function validateFile(filename, uploadType) {
  if (uploadType === 'lecture') {
    if (!filename.match(/\.(mp4|mov)$/i)) {
      throw new Error('Invalid lecture file type. Only .mp4 and .mov allowed.');
    }
  } else if (uploadType === 'file') {
    if (!filename.match(/\.(pdf|jpg|jpeg|png|gif)$/i)) {
      throw new Error('Invalid file type. Only PDF and images (JPG, PNG, GIF) allowed.');
    }
  }
}

// Get content type
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const types = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif'
  };
  return types[ext] || 'application/octet-stream';
}

export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  response.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token');
  
  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  try {
    // Handle different request methods
    if (request.method === 'POST') {
      return await handleUpload(request, response);
    } else if (request.method === 'GET') {
      return await handleList(request, response);
    } else if (request.method === 'DELETE') {
      return await handleDelete(request, response);
    } else {
      return response.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(400).json({ error: error.message });
  }
}

async function handleUpload(request, response) {
  try {
    authenticateAdmin(request);

    const { file, filename, uploadType, subject } = request.body;

    if (!file || !filename || !uploadType) {
      return response.status(400).json({ error: 'Missing required fields' });
    }

    validateFile(filename, uploadType);

    // Convert base64 to buffer
    const buffer = Buffer.from(file, 'base64');

    // Create path
    const date = new Date().toISOString().split('T')[0];
    const safeName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${uploadType}s/${subject || 'general'}/${date}/${safeName}`;

    // Upload to Vercel Blob
    const blob = await put(path, buffer, {
      access: 'public',
      contentType: getContentType(filename),
      addRandomSuffix: false
    });

    return response.status(200).json({
      success: true,
      url: blob.url,
      path: blob.pathname,
      filename: filename,
      uploadType: uploadType,
      subject: subject,
      size: buffer.length,
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload error:', error);
    return response.status(400).json({ error: error.message });
  }
}

async function handleList(request, response) {
  try {
    authenticateAdmin(request);

    const { uploadType } = request.query;

    if (!uploadType) {
      return response.status(400).json({ error: 'uploadType required' });
    }

    const prefix = `${uploadType}s/`;
    const blobs = await list({ prefix });

    return response.status(200).json({
      count: blobs.blobs.length,
      items: blobs.blobs.map(blob => ({
        name: blob.pathname.split('/').pop(),
        path: blob.pathname,
        size: blob.size,
        uploadedAt: blob.uploadedAt
      }))
    });
  } catch (error) {
    console.error('List error:', error);
    return response.status(400).json({ error: error.message });
  }
}

async function handleDelete(request, response) {
  try {
    authenticateAdmin(request);

    const { path } = request.query;

    if (!path) {
      return response.status(400).json({ error: 'path required' });
    }

    await del(path);

    return response.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    return response.status(400).json({ error: error.message });
  }
}
