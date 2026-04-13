# 🚀 Quick Start Guide - Study Dashboard

## Getting Started in 30 Seconds

### Option 1: Open Directly in Browser (Easiest)
1. Navigate to your project folder: `c:\Users\mh\Desktop\current (i hope)`
2. Double-click `index.html`
3. Your study dashboard opens instantly!

### Option 2: Run Local Server (Recommended)

#### With Python:
```bash
# Open Command Prompt in the project folder
# Type:
python -m http.server 8000
# OR
python -m SimpleHTTPServer 8000
```
Then open: `http://localhost:8000`

#### With Node.js:
```bash
node start-server.js
```
Then open: `http://localhost:8000`

#### With Batch Script (Windows):
Double-click `start-server.bat` and it will handle everything!

---

## 📖 First Time Usage

### 1️⃣ **Start the Timer**
- Click the **⏱️ Timer** tab
- You'll see a 25:00 countdown
- Click **Start** to begin a Pomodoro session
- When finished, the timer auto-switches to a 5-minute break

### 2️⃣ **Create a Note**
- Click the **📝 Notes** tab
- Type a title in the "Note title" field
- Write your notes in the main editor (Markdown supported!)
- See live preview on the right
- Click **Save** to store it

### 3️⃣ **Take a Quiz**
- Click the **❓ Quiz** tab
- Click **Load Quiz JSON**
- Select `sample-quiz.json` (included!)
- Answer the questions by clicking options
- Click **Submit Quiz** to see results
- Wrong answers are automatically added to your review queue!

### 4️⃣ **Check Your Progress**
- Click **📊 Progress** tab
- See your **daily streak** counter
- View your **spaced repetition queue** (questions to review)
- Export/import your data for backup

---

## 🎮 Feature Highlights

### ⏱️ Pomodoro Timer Features
| Feature | How to Use |
|---------|-----------|
| Custom work duration | Change "Work Duration" value, click "Apply Settings" |
| Custom break duration | Change "Break Duration" value, click "Apply Settings" |
| View session stats | See "Session Stats" below the timer |
| Track daily focus time | Check "Today's Focus" under stats |

### ❓ Quiz Features
| Feature | How to Use |
|---------|-----------|
| Load custom quizzes | Click "Load Quiz JSON" → Select your .json file |
| Navigate questions | Use "← Previous" and "Next →" buttons |
| View spaced rep items | Wrong answers marked with ⚠️ symbol |
| Review mistakes | See detailed review after submitting |
| Retake quiz | Click "Retake Quiz" to try again |

### 📝 Notes Features
| Feature | How to Use |
|---------|-----------|
| Write with Markdown | Use `**bold**`, `*italic*`, `# Headings`, etc. |
| Live preview | See formatted output on the right side |
| Save notes | Click "Save" button |
| Load saved notes | Click any note in the list on the right |
| Delete notes | Click "Delete" button |

### 📊 Progress Tracking
| Metric | What It Shows |
|--------|---------------|
| Total Time Studied | Sum of all completed Pomodoro sessions |
| Daily Streak | How many consecutive days you've studied |
| Spaced Repetition Queue | Questions you got wrong (review priority) |
| Calendar View | Visual history of study dates |

---

## 🎨 Customization Tips

### Change Timer Intervals
1. Go to **⏱️ Timer** tab
2. Modify "Work Duration" and "Break Duration"
3. Click "Apply Settings"

### Change Theme
1. Click **⚙️** (settings icon) in top-right
2. Select "Light" or "Dark" theme

### Toggle Sound
1. Click **⚙️** (settings icon)
2. Check/uncheck "Enable Sound Notifications"

### Enable Focus Mode
1. Click **🎯** button in header
2. UI becomes minimalist (hides distractions)
3. Click again to disable

---

## 📋 Creating Your Own Quizzes

### Step 1: Create a JSON File
Save this as `my-quiz.json`:

```json
{
  "title": "Spanish Vocabulary",
  "questions": [
    {
      "id": 1,
      "text": "What does 'gato' mean?",
      "options": [
        "A) Dog",
        "B) Cat",
        "C) Bird",
        "D) Fish"
      ],
      "correct": 1
    }
  ]
}
```

### Step 2: Load It
1. Go to **❓ Quiz** tab
2. Click **Load Quiz JSON**
3. Select your `my-quiz.json` file
4. Start answering!

**Tips:**
- Make sure the `correct` field matches an option's index (0-based)
- You can have as many questions as you want
- Use clear, concise question text

---

## 💾 Backup & Restore Data

### Export Your Data
1. Go to **📊 Progress** tab
2. Click **📥 Export Data**
3. A JSON file downloads with all your data

### Import Previous Data
1. Go to **📊 Progress** tab
2. Click **📤 Import Data**
3. Select a previously exported JSON file
4. Your data is restored!

---

## 🆘 Troubleshooting

### "The quiz won't load"
✅ **Solution**: Make sure your JSON file follows the format exactly (especially the `correct` field)

### "Notes aren't saving"
✅ **Solution**: Check browser settings - localStorage must be enabled

### "Timer doesn't make sound"
✅ **Solution**: Go to settings (⚙️) and enable "Sound Notifications"

### "Streak isn't updating"
✅ **Solution**: Complete a full Pomodoro session - the streak updates when sessions finish

### "Can't open the HTML file"
✅ **Solution**: Use one of the server options above (Python, Node.js, or .bat script)

---

## 📱 Mobile Tips

The dashboard works great on mobile:
- Swipe between tabs
- Use Focus Mode for more screen space
- Pinch-to-zoom if text is too small
- Portrait mode recommended

---

## 🎯 Study Tips

1. **Use Pomodoro Technique**: 25 min focus + 5 min break = Maximum productivity
2. **Take Notes**: Active writing helps memory retention
3. **Quiz Yourself**: Regular quizzes improve learning (spaced repetition!)
4. **Build Streaks**: Consistency is key - study every day
5. **Review Wrong Answers**: Your spaced rep queue shows what you need to practice

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `index.html` | Main page structure |
| `script.js` | All application logic |
| `style.css` | Complete styling |
| `sample-quiz.json` | Example quiz to test |
| `README.md` | Full documentation |
| `start-server.bat` | Windows server launcher |
| `start-server.js` | Node.js server option |

---

## ⌨️ Keyboard Shortcuts

Currently, the dashboard supports:
- **Tab navigation**: Click tab buttons
- **Enter on buttons**: Activates buttons
- **Esc in modal**: Close settings modal

---

## 🎓 Example Workflow

### Morning Study Session:
1. ⏱️ Start a 25-min Pomodoro session
2. 📝 Take notes while studying
3. 🎯 Enable Focus Mode to minimize distractions
4. ⏸️ Take a 5-min break (timer guides you)
5. ❓ Quiz yourself with related questions
6. ✅ Check spaced rep queue for tough questions
7. 📊 See your daily streak increase!

---

## 🚀 Pro Tips

- **Auto-save**: Everything saves automatically to localStorage
- **Dark Mode**: Great for night studying (less eye strain)
- **Spaced Repetition**: Perfect for long-term retention
- **Data Backup**: Export weekly for peace of mind
- **Mobile Friendly**: Study on any device

---

## ✨ What Makes This Special

✅ **Completely Offline**: No internet needed, no accounts  
✅ **Private**: All data stays on your device  
✅ **Modular**: Each feature works independently  
✅ **Customizable**: Adjust timers, themes, and more  
✅ **Smart Tracking**: Automatic streak & study time calculation  
✅ **Spaced Repetition**: Scientifically-proven learning method  

---

## 🎉 You're All Set!

Start with the Timer tab and have fun studying! 

**Questions?** Check the full `README.md` for detailed documentation.

**Happy learning! 📚✨**
