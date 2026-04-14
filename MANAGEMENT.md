# 📊 Study App - Server & Management Guide

## 🚀 Starting the Server

```bash
node start-server.js
```

**Expected output:**
```
========================================
Study Dashboard - Server Running
========================================

✅ http://localhost:8000/

📂 Folders:
   • uploads/lectures/ - Lecture videos
   • uploads/files/ - Documents
   • uploads/quizzes/ - Quiz files

📊 Results: results.csv (auto-created)

Press Ctrl+C to stop
```

**Access the app:** Open your browser to `http://localhost:8000/`

---

## 📁 Folder Structure

```
study app/
├── start-server.js          ← Run this to start
├── index.html
├── script.js
├── style.css
├── uploads/                 ← Auto-created
│   ├── lectures/           ← Admin uploads .mp4, .mov videos
│   ├── files/              ← Admin uploads .pdf, .jpg, .png, .gif
│   └── quizzes/            ← Admin uploads .json quiz files
└── results.csv             ← Auto-created, quiz results go here
```

---

## 👨‍🏫 Admin: How to Upload Content

### 1️⃣ Upload Lectures (Videos)

1. Click **"Admin Mode"** button (top right)
2. Enter password: `1pisbest`
3. Click **"Upload Lecture Video"**
4. Select a folder (e.g., Arabic, Math, etc.)
5. Choose a `.mp4` or `.mov` video file
6. ✅ Video appears for all users immediately

**File locations:** `uploads/lectures/`

---

### 2️⃣ Upload Files (Documents)

1. Click **"Admin Mode"** button
2. Enter password: `1pisbest`
3. Click **"Upload File"**
4. Select a folder (e.g., Arabic, Extra, etc.)
5. Choose a `.pdf`, `.jpg`, `.png`, or `.gif` file
6. ✅ File appears for all users immediately

**File locations:** `uploads/files/`

---

### 3️⃣ Upload Quizzes

1. Click **Quiz** tab
2. Click **"Load Quiz JSON"**
3. Choose a quiz JSON file (or create one from `sample-quiz.json`)
4. ✅ **Option A:** Save locally on your device (localStorage)
   -  **Option B:** Save to server:
   - Copy `sample-quiz.json` to `uploads/quizzes/my-quiz.json`
   - All users can then load it

**Quiz file format:**
```json
{
  "title": "Arabic Lesson 1",
  "questions": [
    {
      "text": "Question 1?",
      "options": ["A", "B", "C", "D"],
      "correct": 0
    }
  ]
}
```

---

## 👥 Users: Taking Quizzes

1. Click **Quiz** tab
2. Click **"Load Quiz JSON"** and select a quiz
3. **NEW:** Enter your **name** before starting
4. Answer all questions
5. Click **"Submit Quiz"**
6. ✅ Your score and name are saved to `results.csv`

---

## 📊 Viewing Quiz Results (Admin)

### Option 1: View CSV File Directly
1. Open `results.csv` in your project folder
2. Open with Excel or any text editor

**CSV format:**
```
Name,Quiz,Score,Date
John Doe,Math Quiz 1,85,2024-04-14T10:30:45.123Z
Jane Smith,Arabic Lesson 1,92,2024-04-14T10:32:10.456Z
```

### Option 2: Download from Browser (Coming Soon)
- Admin panel will have a "Download Results" button

---

## 🔧 Troubleshooting

### ❌ Port 8000 already in use

**Solution 1:** Kill the process
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :8000
kill -9 <PID>
```

**Solution 2:** Use a different port
```bash
# Edit start-server.js, change PORT = 8000 to PORT = 3000
node start-server.js
# Then access: http://localhost:3000/
```

### ❌ No quizzes showing

Make sure you have quiz JSON files in `uploads/quizzes/`

### ❌ Results not saving

1. Check that `results.csv` exists in your project folder
2. Make sure you entered a name (required!)
3. Check browser console (F12) for errors

---

## 🎮 Features Summary

| Feature | Admin Only | Students | Status |
|---------|-----------|----------|--------|
| Upload Lectures | ✅ | ❌ | ✅ Working |
| Upload Files | ✅ | ❌ | ✅ Working |
| Upload Quizzes | ✅ | ❌ | ✅ Working |
| Take Quizzes | ❌ | ✅ | ✅ Working |
| Save Quiz Results | Auto | Auto | ✅ With Name |
| Download Results (CSV) | ✅ | ❌ | 🔜 Coming |
| View Lectures | ❌ | ✅ | ✅ Working |
| View Files | ❌ | ✅ | ✅ Working |

---

##  Import Notes

- **Lectures/Files are shared immediately** — when admin uploads, all users see it
- **Quiz results save to `results.csv`** — one entry per student per quiz
- **Names are required** — students must enter name before quiz
- **No authentication for students** — anyone can take quizzes (perfect for classroom)
- **Admin password is: `1pisbest`** — change if deployed

---

## 📝 Next Steps (Optional)

- Add download button in admin panel for CSV
- Add user authentication for students
- Store in database instead of CSV
- Deploy to Vercel/cloud

Questions? Check the console (F12) for errors!
