# Vercel Blob Storage Setup Guide

## Overview
This guide explains how to set up Vercel Blob Storage for the Study App to store lecture videos and files in the cloud.

## Prerequisites
- Vercel account ([Sign up here](https://vercel.com))
- A Vercel project (or create one)
- Node.js and npm installed

## Step 1: Create Vercel Project

```bash
# Create or import your project to Vercel
# Go to https://vercel.com/new and import the GitHub repository
```

## Step 2: Enable Vercel Blob Storage

1. Go to your Vercel project dashboard
2. Navigate to **Storage**
3. Click **Create** → Select **Blob**
4. Configure the storage location and accept terms
5. The `BLOB_READ_WRITE_TOKEN` will be automatically set in your environment variables

## Step 3: Create API Endpoint

Create a new file `api/upload.js` in your project:

```javascript
import { put } from '@vercel/blob';

export default async function handler(request, response) {
  if (request.method === 'POST') {
    const { file, filename, uploadType } = request.body;
    
    // Validate admin token
    const adminToken = request.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;
    
    if (adminToken !== expectedToken) {
      return response.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const buffer = Buffer.from(file, 'base64');
      
      // Validate file type
      if (uploadType === 'lecture' && !filename.match(/\.(mp4|mov)$/i)) {
        return response.status(400).json({ error: 'Only .mp4 and .mov files allowed for lectures' });
      }
      
      if (uploadType === 'file' && !filename.match(/\.(pdf|jpg|jpeg|png|gif)$/i)) {
        return response.status(400).json({ error: 'Only PDF and image files allowed' });
      }

      // Upload to Vercel Blob
      const path = `${uploadType}s/${new Date().toISOString().split('T')[0]}/${filename}`;
      const blob = await put(path, buffer, {
        access: 'public',
        contentType: getContentType(filename)
      });

      return response.status(200).json({
        url: blob.url,
        path: blob.pathname,
        filename: filename,
        uploadType: uploadType
      });
    } catch (error) {
      console.error('Upload error:', error);
      return response.status(500).json({ error: error.message });
    }
  }
  
  return response.status(405).json({ error: 'Method not allowed' });
}

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
```

## Step 4: Set Environment Variables

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - `BLOB_READ_WRITE_TOKEN` (automatically set by Vercel)
   - `ADMIN_TOKEN` (create a secure token for your admin)

## Step 5: Update Frontend Code

The frontend code has been prepared to work with Vercel Blob Storage. When you enable it:

1. Create a `.env.local` file with:
```
NEXT_PUBLIC_UPLOAD_ENDPOINT=/api/upload
NEXT_PUBLIC_ADMIN_TOKEN=your-admin-token-here
```

2. The LecturesManager and FilesManager classes will automatically detect the endpoint and upload to the cloud instead of storing locally.

## Step 6: Configure Local Storage (Optional)

To use local storage instead while developing:

1. Keep the managers as they are (they default to localStorage)
2. The managers automatically fall back to localStorage if the Vercel endpoint is not available

## File Structure in Vercel Blob

Files will be organized as:
```
lectures/2024-04-14/arabic-lesson-01.mp4
lectures/2024-04-14/math-advanced-calculus.mp4
files/2024-04-14/physics-notes.pdf
files/2024-04-14/biology-diagram.png
files/extra/general-resources.pdf
```

## Security Considerations

1. **Admin Token**: Keep your `ADMIN_TOKEN` secret
2. **File Validation**: The API validates file types on the server side
3. **Access Control**: Set blob access to 'public' for viewing, 'private' for sensitive content
4. **Password Protection**: The admin password is stored locally in browser (use proper authentication in production)

## Troubleshooting

### Blob endpoint not found
- Ensure Vercel Blob Storage is enabled in your project
- Check that environment variables are properly set

### Upload fails with 401 error
- Verify your admin token matches in settings
- Check that the token is passed correctly in the request header

### Files too large
- Vercel Blob Storage has upload size limits
- For videos, consider using a specialized video hosting service like Bunny CDN or AWS S3

## Production Recommendations

1. Use proper authentication system instead of simple password
2. Implement proper admin authorization middleware
3. Add rate limiting to prevent abuse
4. Use CDN for video delivery (Vercel Blob supports this)
5. Implement virus scanning for user uploads
6. Add audit logging for all uploads/downloads

## Alternative Solutions

If Vercel Blob doesn't meet your needs:
- **AWS S3**: Full-featured object storage
- **Firebase Storage**: Good for mobile apps
- **Cloudinary**: Specialized for media files
- **Bunny CDN**: Optimized for video delivery
- **Azure Blob Storage**: Enterprise-grade solution
