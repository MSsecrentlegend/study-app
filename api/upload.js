import { put, list, del } from '@vercel/blob';

/**
 * Vercel Blob Storage Handler for Luma Study
 * * الميزات:
 * 1. رفع المحاضرات (فيديو فقط)
 * 2. رفع الملفات (PDF وصور)
 * 3. حفظ نتائج الكويزات (JSON)
 */

export default async function handler(request, response) {
  try {
    // 1. التعامل مع حفظ نتائج الطلاب (لا يحتاج رمز أدمن)
    if (request.method === 'POST' && request.query.action === 'saveResult') {
      return await handleSaveQuizResult(request, response);
    }

    // 2. التحقق من صلاحيات الأدمن للعمليات الأخرى (الرفع والمسح)
    if (request.method === 'POST' || request.method === 'DELETE' || request.query.action === 'list') {
      authenticateAdmin(request);
    }

    if (request.method === 'POST') {
      return await handleUpload(request, response);
    } else if (request.method === 'GET' && request.query.action === 'list') {
      return await handleList(request, response);
    } else if (request.method === 'DELETE') {
      return await handleDelete(request, response);
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Server Error:', error);
    return response.status(error.message === 'Invalid admin token' ? 401 : 400).json({ error: error.message });
  }
}

// دالة حفظ نتائج الكويزات في الـ Blob
async function handleSaveQuizResult(request, response) {
  const { username, quizTitle, score } = request.body;
  
  if (!username || !quizTitle) {
    return response.status(400).json({ error: 'Missing data' });
  }

  // اسم الملف سيكون داخل مجلد results مع طابع زمني لعدم التكرار
  const fileName = `results/${username.replace(/\s+/g, '_')}-${Date.now()}.json`;
  
  const blob = await put(fileName, JSON.stringify({
    username,
    quizTitle,
    score: score + '%',
    date: new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })
  }), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json'
  });

  return response.status(200).json({ success: true, url: blob.url });
}

// دالة رفع الملفات (المحاضرات والمصادر)
async function handleUpload(request, response) {
  const { filename, uploadType, subject } = request.query;
  const file = request.body; // Buffer من الملف

  if (!file) throw new Error('No file provided');

  // التأكد من نوع الملف
  validateFile(filename, uploadType);

  const path = `${uploadType}s/${subject}/${filename}`;
  const blob = await put(path, file, {
    access: 'public',
    addRandomSuffix: true
  });

  return response.status(200).json(blob);
}

// دالة عرض الملفات المرفوعة
async function handleList(request, response) {
  const { uploadType } = request.query;
  const prefix = uploadType ? `${uploadType}s/` : '';
  const blobs = await list({ prefix });
  return response.status(200).json(blobs);
}

// دالة مسح الملفات
async function handleDelete(request, response) {
  const { url } = request.query;
  await del(url);
  return response.status(200).json({ success: true });
}

// التحقق من رمز الأدمن (يجب ضبطه في إعدادات Vercel كـ Environment Variable)
function authenticateAdmin(request) {
  const adminToken = request.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken || adminToken !== expectedToken) {
    throw new Error('Invalid admin token');
  }
  return true;
}

// التحقق من الصيغ المسموحة
function validateFile(filename, uploadType) {
  if (uploadType === 'lecture') {
    if (!filename.match(/\.(mp4|mov)$/i)) {
      throw new Error('فقط ملفات الفيديو (mp4, mov) مسموحة للمحاضرات');
    }
  } else {
    if (!filename.match(/\.(pdf|jpg|jpeg|png)$/i)) {
      throw new Error('فقط ملفات PDF والصور مسموحة هنا');
    }
  }
}