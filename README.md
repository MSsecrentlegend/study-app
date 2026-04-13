# 📚 Study Dashboard - Comprehensive Learning Tool

A modular, feature-rich JavaScript dashboard designed to enhance your study sessions with an integrated Pomodoro timer, dynamic quiz engine, markdown-supported notes, and advanced tracking features.

## ✨ Features

### 1. **⏱️ Pomodoro Timer**
- Customizable work and break intervals (default: 25/5 minutes)
- Visual progress ring with time display
- Session statistics tracking
- Audio notifications for session transitions
- Daily focus time logging
- Automatic streak updates

### 2. **❓ Dynamic Quiz Engine**
- Load quizzes from JSON files
- Multiple-choice question support
- Question progress tracking
- Real-time answer selection
- Comprehensive results analysis
- **Spaced Repetition** feature:
  - Automatic flagging of incorrect answers
  - Review queue for difficult questions
  - Attempt tracking for each question

### 3. **📝 Markdown-Supported Notes**
- Rich text editing with Markdown support
- Live preview panel
- Full localStorage persistence
- Create, edit, and delete notes
- Note list with timestamps
- Markdown syntax support:
  - Headings (# ## ###)
  - Bold (**text**)
  - Italic (*text*)
  - Code blocks (`code`)
  - Links ([text](url))

### 4. **📊 Study Tracking & Analytics**
- **Total Time Studied**: Automatic calculation from completed sessions
- **Daily Streak Counter**: Tracks consecutive study days with visual indicator (🔥)
- **Session Statistics**: Completed sessions, breaks, and daily focus time
- **Progress Dashboard**: 
  - Daily goal tracking
  - Quiz performance history
  - Streak calendar visualization
  - Spaced repetition queue display

### 5. **🎯 Focus Mode**
- Minimalist UI toggle to eliminate distractions
- Hides non-essential UI elements
- Focuses attention on current task
- Settings persistence across sessions

### 6. **💾 Data Management**
- All data automatically saved to browser localStorage
- Export data as JSON backup
- Import previously exported data
- Clear all data option with confirmation

## 📋 JSON Quiz Format

Create custom quizzes using this format:

```json
{
  "title": "Your Quiz Title",
  "questions": [
    {
      "id": 1,
      "text": "What is the question?",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4"
      ],
      "correct": 1
    }
  ]
}
```

**Field Explanations:**
- `id`: Unique identifier for the question
- `text`: The question text
- `options`: Array of answer options
- `correct`: Index of the correct answer (0-based)

## 🚀 Getting Started

1. **Open the Application**: Open `index.html` in your web browser
2. **Start a Timer Session**: Click the ⏱️ Timer tab to begin a Pomodoro session
3. **Load a Quiz**: Go to ❓ Quiz tab, load the `sample-quiz.json` file
4. **Take Notes**: Use the 📝 Notes tab for markdown-formatted notes
5. **Track Progress**: Check 📊 Progress tab for analytics

## 🎮 Using Each Feature

### Pomodoro Timer
1. Customize intervals in "Customize Intervals" section
2. Click **Start** to begin a work session
3. Timer automatically switches between work and break
4. View session stats below the timer

### Quiz Engine
1. Prepare a JSON file in the required format
2. Click **Load Quiz JSON** and select your file
3. Navigate through questions using Previous/Next buttons
4. Select answers by clicking option buttons
5. View results with review of wrong answers
6. Wrong answers automatically added to spaced repetition queue

### Notes
1. Type or paste your note content in the textarea
2. See live preview on the right side (with Markdown rendering)
3. Add a title in the title field
4. Click **Save** to store the note
5. Click on saved notes in the list to load them
6. Use **Delete** to remove notes

### Progress Tracking
- **Daily Streak**: Increments each day you study
- **Total Study Time**: Sums all completed Pomodoro sessions
- **Review Queue**: Shows questions flagged for spaced repetition
- **Export/Import**: Backup and restore your data

## ⚙️ Settings

Access settings via the ⚙️ button in the header:
- **Sound Notifications**: Toggle audio cues (default: enabled)
- **Theme**: Switch between light and dark modes

## 🎯 Focus Mode

Click the 🎯 button to toggle Focus Mode:
- Hides the tab navigation
- Removes header statistics
- Minimizes visual distractions
- Perfect for deep work sessions

## 📂 File Structure

```
current (i hope)/
├── index.html          # Main HTML structure
├── script.js          # Complete application logic (modular classes)
├── style.css          # Full responsive styling
├── sample-quiz.json   # Example quiz file
└── README.md          # This file
```

## 🏗️ Architecture

The application uses a **modular class-based architecture**:

### Core Modules

1. **StorageManager**: Handles all localStorage operations
2. **PomodoroTimer**: Manages timer sessions and statistics
3. **StreakCounter**: Tracks daily study streaks
4. **QuizEngine**: Manages quiz loading, questions, and spaced repetition
5. **NotesManager**: Handles note creation, editing, and markdown rendering
6. **StudyTracker**: Calculates and displays total study time
7. **FocusMode**: Toggles minimalist UI
8. **UIController**: Manages tab navigation and settings modal
9. **ProgressAnalytics**: Displays analytics and handles data import/export

### Data Storage

All data is stored in browser localStorage under the `studyDashboard_` namespace:
- `timerStats`: Session count and total minutes
- `dailySessions`: Minutes studied per day
- `streakData`: Streak information and dates
- `notes`: All user notes
- `quizResults`: Quiz performance history
- `reviewQueue`: Spaced repetition queue
- `timerSettings`: Custom timer intervals

## 🎨 Customization

### Colors
Modify CSS variables in `style.css`:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #ec4899;
    --success-color: #10b981;
    /* ... more colors */
}
```

### Timer Defaults
Customize timer intervals through the UI or modify:
```javascript
this.workDuration = 25;      // minutes
this.breakDuration = 5;      // minutes
```

## 💡 Tips & Tricks

1. **Spaced Repetition**: Retake quizzes to clear your review queue
2. **Note-taking**: Use consistent Markdown formatting for better organization
3. **Data Backup**: Export your data regularly using the Progress tab
4. **Focus Sessions**: Use Focus Mode for distraction-free studying
5. **Track Progress**: Check your streak calendar to maintain consistency

## 🔔 Notifications

The app provides:
- **Audio cues** when timer sessions complete (can be disabled)
- **Visual indicators** for spaced repetition items
- **Streak notifications** when maintaining daily consistency

## 🌐 Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## 📊 Spaced Repetition Algorithm

Questions you answer incorrectly are automatically:
1. Added to a review queue
2. Tracked with attempt count
3. Flagged with a warning icon during future quizzes
4. Sorted by number of attempts

This helps focus your review on difficult topics!

## 🔐 Data Privacy

All data is stored **locally in your browser**. No information is sent to external servers.

## 🚀 Advanced Features

### Study Tracking Algorithm
Automatically calculates:
- Total minutes studied across all sessions
- Daily study time breakdown
- Session completion count
- Break frequency

### Daily Streak Counter
- Tracks consecutive study days
- Maintains longest streak record
- Visual calendar of study dates
- Resets only when you miss a day

### Spaced Repetition Scheduler
- Flags quiz questions answered incorrectly
- Maintains review queue
- Tracks attempt history
- Suggests review priorities

## 📝 Example Quiz Creation

Create `biology-quiz.json`:
```json
{
  "title": "Advanced Biology",
  "questions": [
    {
      "id": 1,
      "text": "What is mitosis?",
      "options": [
        "Cell division producing two diploid cells",
        "Cell division producing four haploid cells",
        "Process of photosynthesis",
        "Protein synthesis"
      ],
      "correct": 0
    }
  ]
}
```

Then load it via the Quiz tab!

## 🆘 Troubleshooting

**Quiz won't load?**
- Ensure JSON format matches the required structure
- Check that the `correct` index matches the options array

**Notes not saving?**
- Check that localStorage is enabled in your browser
- Ensure you have sufficient storage space

**Timer not notifying?**
- Check settings to ensure sound is enabled
- Verify browser audio permissions

**Streak not updating?**
- Ensure you complete at least one Pomodoro session
- The streak updates when sessions finish

## 🎓 Study Best Practices

1. **Pomodoro Method**: Work in 25-minute focused sessions
2. **Regular Breaks**: Use the break timer for mental recovery
3. **Active Recall**: Use quizzes regularly to test knowledge
4. **Spaced Repetition**: Review difficult questions again
5. **Consistent Notes**: Take organized notes for future reference
6. **Build Streaks**: Study daily to build momentum

## 📄 License

This project is provided as-is for educational and personal use.

---

**Happy studying! 🎓📚**
