// ============================================================================
// SUBJECTS DASHBOARD ANALYTICS - Per-subject analytics for dashboard tab
// ============================================================================
class SubjectsDashboardAnalytics {
    static init(storage, subjectsManager) {
        this.storage = storage;
        this.subjectsManager = subjectsManager;
        this.setupEventListeners();
        this.renderAnalytics();
    }

    static setupEventListeners() {
        const filter = document.getElementById('subjectsDashboardFilter');
        if (filter) {
            filter.addEventListener('change', () => this.renderAnalytics());
        }
        // Update dropdown when subjects change
        if (this.subjectsManager) {
            this.subjectsManager.onSubjectsChanged = () => {
                this.populateSubjectDropdown();
                this.renderAnalytics();
            };
        }
    }

    static populateSubjectDropdown() {
        const filter = document.getElementById('subjectsDashboardFilter');
        if (!filter) return;
        filter.innerHTML = '<option value="all">All Subjects</option>';
        this.subjectsManager.subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            filter.appendChild(opt);
        });
    }

    static renderAnalytics() {
        this.populateSubjectDropdown();
        const filter = document.getElementById('subjectsDashboardFilter');
        const selected = filter ? filter.value : 'all';
        const container = document.getElementById('subjectsAnalytics');
        if (!container) return;
        container.innerHTML = '';

        // Gather stats
        const subjects = this.subjectsManager.subjects;
        const studySessions = this.storage.get('dailySessions', {});
        const notes = this.storage.get('notes', []);
        const quizResults = this.storage.get('quizResults', []);

        let filteredSubjects = subjects;
        if (selected !== 'all') filteredSubjects = [selected];

        filteredSubjects.forEach(subject => {
            // Study time
            let totalMinutes = 0;
            Object.keys(studySessions).forEach(date => {
                const session = studySessions[date];
                if (typeof session === 'object' && session[subject]) {
                    totalMinutes += session[subject];
                } else if (subject === 'General' && typeof session === 'number') {
                    totalMinutes += session;
                }
            });
            // Notes count
            const notesCount = notes.filter(n => n.subject === subject).length;
            // Quiz stats
            const subjectQuizzes = quizResults.filter(q => q.subject === subject);
            const quizCount = subjectQuizzes.length;
            const avgScore = quizCount > 0 ? Math.round(subjectQuizzes.reduce((a, b) => a + (b.score || 0), 0) / quizCount) : 0;

            // Render card
            const card = document.createElement('div');
            card.className = 'subject-analytics-card';
            card.innerHTML = `
                <h3>${subject}</h3>
                <ul>
                    <li><strong>Study Time:</strong> ${totalMinutes} min</li>
                    <li><strong>Notes:</strong> ${notesCount}</li>
                    <li><strong>Quizzes Taken:</strong> ${quizCount}</li>
                    <li><strong>Avg. Quiz Score:</strong> ${avgScore}%</li>
                </ul>
            `;
            container.appendChild(card);
        });
    }
}
// ============================================================================
// SUBJECTS MANAGER - Handles subject CRUD and UI
// ============================================================================
class SubjectsManager {
    constructor(storage) {
        this.storage = storage;
        this.subjects = this.loadSubjects();
        this.setupEventListeners();
        this.renderSubjectsList();
    }

    loadSubjects() {
        return this.storage.get('subjects', ['General']);
    }

    saveSubjects() {
        this.storage.set('subjects', this.subjects);
    }

    addSubject(name) {
        if (!name || this.subjects.includes(name)) return;
        this.subjects.push(name);
        this.saveSubjects();
        this.renderSubjectsList();
    }

    deleteSubject(name) {
        if (name === 'General') return;
        this.subjects = this.subjects.filter(s => s !== name);
        this.saveSubjects();
        this.renderSubjectsList();
    }

    setupEventListeners() {
        const subjectsToggle = document.getElementById('subjectsToggle');
        const subjectsModal = document.getElementById('subjectsModal');
        const closeSubjects = document.getElementById('closeSubjects');
        const addSubjectBtn = document.getElementById('addSubjectBtn');
        const newSubjectName = document.getElementById('newSubjectName');

        if (subjectsToggle && subjectsModal) {
            subjectsToggle.addEventListener('click', () => {
                subjectsModal.classList.remove('hidden');
            });
        }
        if (closeSubjects && subjectsModal) {
            closeSubjects.addEventListener('click', () => {
                subjectsModal.classList.add('hidden');
            });
        }
        if (addSubjectBtn && newSubjectName) {
            addSubjectBtn.addEventListener('click', () => {
                this.addSubject(newSubjectName.value.trim());
                newSubjectName.value = '';
            });
            newSubjectName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.addSubject(newSubjectName.value.trim());
                    newSubjectName.value = '';
                }
            });
        }
    }

    renderSubjectsList() {
        const subjectsList = document.getElementById('subjectsList');
        if (!subjectsList) return;
        subjectsList.innerHTML = '';
        this.subjects.forEach(subject => {
            const div = document.createElement('div');
            div.className = 'subject-item';
            div.textContent = subject;
            if (subject !== 'General') {
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.className = 'btn btn-danger';
                delBtn.style.marginLeft = '1em';
                delBtn.onclick = () => this.deleteSubject(subject);
                div.appendChild(delBtn);
            }
            subjectsList.appendChild(div);
        });
    }
}
// STUDY DASHBOARD - Modular JavaScript Application
// Features: Pomodoro Timer, Quiz Engine, Notes, Study Tracking, Spaced Repetition
// ============================================================================

// ============================================================================
// STORAGE MANAGER - Handles all localStorage operations
// ============================================================================
class StorageManager {
    constructor(namespace = 'studyDashboard') {
        this.namespace = namespace;
    }

    set(key, data) {
        try {
            localStorage.setItem(`${this.namespace}_${key}`, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`${this.namespace}_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    }

    remove(key) {
        localStorage.removeItem(`${this.namespace}_${key}`);
    }

    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.namespace)) {
                localStorage.removeItem(key);
            }
        });
    }

    getAllKeys() {
        const keys = [];
        const prefix = `${this.namespace}_`;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(prefix)) {
                keys.push(key.replace(prefix, ''));
            }
        }
        return keys;
    }
}

// ============================================================================
// TIMER MODULE - Pomodoro Timer with customizable intervals
// ============================================================================
class PomodoroTimer {
    constructor(storage) {
        this.storage = storage;
        this.workDuration = 25;
        this.breakDuration = 5;
        this.isRunning = false;
        this.isWorkSession = true;
        this.timeRemaining = this.workDuration * 60;
        this.timerInterval = null;

        this.loadSettings();
        this.loadSessionStats();
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        document.getElementById('timerStart').addEventListener('click', () => this.start());
        document.getElementById('timerPause').addEventListener('click', () => this.pause());
        document.getElementById('timerReset').addEventListener('click', () => this.reset());
        document.getElementById('applyTimerSettings').addEventListener('click', () => this.applySettings());

        document.getElementById('workDuration').addEventListener('change', (e) => {
            this.workDuration = parseInt(e.target.value) || 25;
        });
        document.getElementById('breakDuration').addEventListener('change', (e) => {
            this.breakDuration = parseInt(e.target.value) || 5;
        });
    }

    loadSettings() {
        const settings = this.storage.get('timerSettings', {
            workDuration: 25,
            breakDuration: 5
        });
        this.workDuration = settings.workDuration;
        this.breakDuration = settings.breakDuration;
        this.timeRemaining = this.workDuration * 60;

        document.getElementById('workDuration').value = this.workDuration;
        document.getElementById('breakDuration').value = this.breakDuration;
    }

    loadSessionStats() {
        const stats = this.storage.get('timerStats', {
            sessionsCompleted: 0,
            totalBreaks: 0,
            totalMinutesStudied: 0
        });
        this.stats = stats;
        this.updateStatsDisplay();
    }

    applySettings() {
        this.workDuration = parseInt(document.getElementById('workDuration').value) || 25;
        this.breakDuration = parseInt(document.getElementById('breakDuration').value) || 5;

        this.storage.set('timerSettings', {
            workDuration: this.workDuration,
            breakDuration: this.breakDuration
        });

        this.reset();
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('timerStart').disabled = true;
        document.getElementById('timerPause').disabled = false;

        this.timerInterval = setInterval(() => {
            this.timeRemaining--;

            if (this.timeRemaining <= 0) {
                this.completeSession();
            }

            this.updateDisplay();
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        document.getElementById('timerStart').disabled = false;
        document.getElementById('timerPause').disabled = true;
    }

    reset() {
        this.pause();
        this.isWorkSession = true;
        this.timeRemaining = this.workDuration * 60;
        document.getElementById('timerStart').disabled = false;
        this.updateDisplay();
    }

    completeSession() {
        this.pause();

        if (this.isWorkSession) {
            this.stats.sessionsCompleted++;
            this.stats.totalMinutesStudied += this.workDuration;

            // Log session for study tracking
            const today = new Date().toISOString().split('T')[0];
            const sessions = this.storage.get('dailySessions', {});
            if (!sessions[today]) sessions[today] = 0;
            sessions[today] += this.workDuration;
            this.storage.set('dailySessions', sessions);

            // Update streak
            StreakCounter.updateStreak();

            this.playNotification('Break time! Take a rest. 🌟');
            this.isWorkSession = false;
            this.timeRemaining = this.breakDuration * 60;
        } else {
            this.stats.totalBreaks++;
            this.playNotification('Break over! Ready to focus? 💪');
            this.isWorkSession = true;
            this.timeRemaining = this.workDuration * 60;
        }

        this.saveSessionStats();
        this.updateStatsDisplay();
        this.updateDisplay();
    }

    playNotification(message) {
        if (this.storage.get('settings', {}).soundEnabled !== false) {
            // Create a simple beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
        console.log(message);
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        document.getElementById('timerValue').textContent = display;
        document.getElementById('timerLabel').textContent = this.isWorkSession ? 'Work Time' : 'Break Time';

        // Update progress ring
        const progressRing = document.querySelector('.progress-ring-circle');
        const circumference = 2 * Math.PI * 90;
        const totalSeconds = (this.isWorkSession ? this.workDuration : this.breakDuration) * 60;
        const progress = this.timeRemaining / totalSeconds;
        const offset = circumference * (1 - progress);
        progressRing.style.strokeDashoffset = offset;
    }

    updateStatsDisplay() {
        document.getElementById('sessionsCompleted').textContent = this.stats.sessionsCompleted;
        document.getElementById('totalBreaks').textContent = this.stats.totalBreaks;
        const todayMinutes = this.getTodaysFocusTime();
        document.getElementById('todaysFocus').textContent = `${todayMinutes}m`;
    }

    saveSessionStats() {
        this.storage.set('timerStats', this.stats);
    }

    getTodaysFocusTime() {
        const today = new Date().toISOString().split('T')[0];
        const sessions = this.storage.get('dailySessions', {});
        return sessions[today] || 0;
    }

    getTotalStudyTime() {
        const sessions = this.storage.get('dailySessions', {});
        return Object.values(sessions).reduce((a, b) => a + b, 0);
    }
}

// ============================================================================
// STREAK COUNTER - Tracks daily study streaks
// ============================================================================
class StreakCounter {
    static init(storage) {
        this.storage = storage;
        this.updateDisplay();
    }

    static updateStreak() {
        const today = new Date().toISOString().split('T')[0];
        const streakData = this.storage.get('streakData', {
            currentStreak: 0,
            lastDate: null,
            longestStreak: 0,
            studyDates: []
        });

        if (streakData.lastDate !== today) {
            if (this.isConsecutiveDay(streakData.lastDate)) {
                streakData.currentStreak++;
            } else if (streakData.lastDate) {
                streakData.currentStreak = 1;
            } else {
                streakData.currentStreak = 1;
            }

            streakData.lastDate = today;
            streakData.longestStreak = Math.max(streakData.longestStreak, streakData.currentStreak);

            if (!streakData.studyDates.includes(today)) {
                streakData.studyDates.push(today);
            }

            this.storage.set('streakData', streakData);
        }

        this.updateDisplay();
    }

    static isConsecutiveDay(lastDate) {
        if (!lastDate) return false;
        const last = new Date(lastDate);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return last.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
    }

    static updateDisplay() {
        const streakData = this.storage.get('streakData', { currentStreak: 0 });
        document.getElementById('dailyStreak').textContent = `${streakData.currentStreak} 🔥`;
    }

    static getStreakData() {
        return this.storage.get('streakData', { currentStreak: 0 });
    }
}

// ============================================================================
// QUIZ ENGINE - Dynamic quiz system with spaced repetition
// ============================================================================
class QuizEngine {
    constructor(storage) {
        this.storage = storage;
        this.currentQuiz = null;
        this.userAnswers = [];
        this.currentQuestion = 0;
        this.reviewQueue = [];

        this.setupEventListeners();
        this.loadReviewQueue();
    }

    setupEventListeners() {
        document.getElementById('loadQuizBtn').addEventListener('click', () => this.handleQuizUpload());
        document.getElementById('quizFile').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadQuizFromFile(e.target.files[0]);
            }
        });

        document.getElementById('nextQuestion').addEventListener('click', () => this.nextQuestion());
        document.getElementById('prevQuestion').addEventListener('click', () => this.previousQuestion());
        document.getElementById('submitQuiz').addEventListener('click', () => this.submitQuiz());
        document.getElementById('retakeQuiz').addEventListener('click', () => this.resetQuiz());
        document.getElementById('backToQuiz').addEventListener('click', () => this.backToLoad());
    }

    handleQuizUpload() {
        document.getElementById('quizFile').click();
    }

    loadQuizFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const quiz = JSON.parse(e.target.result);
                this.startQuiz(quiz);
            } catch (error) {
                alert('Invalid JSON file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    startQuiz(quiz) {
        this.currentQuiz = quiz;
        this.userAnswers = new Array(quiz.questions.length).fill(null);
        this.currentQuestion = 0;

        document.querySelector('.quiz-upload').classList.add('hidden');
        document.getElementById('quizSession').classList.remove('hidden');
        document.getElementById('quizResults').classList.add('hidden');

        this.displayQuestion();
    }

    displayQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestion];
        const isLastQuestion = this.currentQuestion === this.currentQuiz.questions.length - 1;

        document.getElementById('quizTitle').textContent = this.currentQuiz.title || 'Quiz';
        document.getElementById('questionText').textContent = question.text;
        document.getElementById('questionProgress').textContent =
            `${this.currentQuestion + 1} / ${this.currentQuiz.questions.length}`;

        const progressPercent = ((this.currentQuestion + 1) / this.currentQuiz.questions.length) * 100;
        document.getElementById('progressFill').style.width = progressPercent + '%';

        const optionsContainer = document.getElementById('optionsContainer');
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            button.onclick = () => this.selectAnswer(index);

            if (this.userAnswers[this.currentQuestion] === index) {
                button.classList.add('selected');
            }

            optionsContainer.appendChild(button);
        });

        document.getElementById('prevQuestion').disabled = this.currentQuestion === 0;
        document.getElementById('nextQuestion').classList.toggle('hidden', isLastQuestion);
        document.getElementById('submitQuiz').classList.toggle('hidden', !isLastQuestion);

        // Check if this question is in the review queue
        const inReview = this.reviewQueue.some(q => q.questionId === question.id);
        document.getElementById('repetitionFlag').classList.toggle('hidden', !inReview);
    }

    selectAnswer(index) {
        this.userAnswers[this.currentQuestion] = index;
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
    }

    nextQuestion() {
        if (this.currentQuestion < this.currentQuiz.questions.length - 1) {
            this.currentQuestion++;
            this.displayQuestion();
        }
    }

    previousQuestion() {
        if (this.currentQuestion > 0) {
            this.currentQuestion--;
            this.displayQuestion();
        }
    }

    submitQuiz() {
        let correctCount = 0;
        const wrongAnswers = [];

        this.currentQuiz.questions.forEach((question, index) => {
            const isCorrect = this.userAnswers[index] === question.correct;
            if (isCorrect) {
                correctCount++;
            } else {
                wrongAnswers.push({
                    questionId: question.id,
                    text: question.text,
                    userAnswer: question.options[this.userAnswers[index]],
                    correctAnswer: question.options[question.correct]
                });
            }
        });

        const score = Math.round((correctCount / this.currentQuiz.questions.length) * 100);

        // Add wrong answers to spaced repetition queue
        this.addToReviewQueue(wrongAnswers);

        // Save quiz result
        const results = this.storage.get('quizResults', []);
        results.push({
            quizTitle: this.currentQuiz.title,
            date: new Date().toISOString(),
            score: score,
            correctCount: correctCount,
            totalQuestions: this.currentQuiz.questions.length
        });
        this.storage.set('quizResults', results);

        this.displayResults(correctCount, wrongAnswers, score);
    }

    addToReviewQueue(wrongAnswers) {
        const queue = this.storage.get('reviewQueue', []);

        wrongAnswers.forEach(wrong => {
            const existing = queue.find(q => q.questionId === wrong.questionId);
            if (existing) {
                existing.attempts++;
                existing.lastAttempted = new Date().toISOString();
            } else {
                queue.push({
                    ...wrong,
                    attempts: 1,
                    added: new Date().toISOString(),
                    lastAttempted: new Date().toISOString()
                });
            }
        });

        this.storage.set('reviewQueue', queue);
        this.loadReviewQueue();
    }

    loadReviewQueue() {
        this.reviewQueue = this.storage.get('reviewQueue', []);
    }

    displayResults(correctCount, wrongAnswers, score) {
        document.getElementById('quizSession').classList.add('hidden');
        document.getElementById('quizResults').classList.remove('hidden');

        document.getElementById('finalScore').textContent = `${score}%`;
        document.getElementById('correctCount').textContent = `${correctCount}/${this.currentQuiz.questions.length}`;

        const reviewContainer = document.getElementById('reviewContainer');
        reviewContainer.innerHTML = '<h3>Review Answers</h3>';

        if (wrongAnswers.length > 0) {
            reviewContainer.innerHTML += '<h4 style="color: var(--error-color);">Wrong Answers:</h4>';
            wrongAnswers.forEach(wrong => {
                const div = document.createElement('div');
                div.className = 'review-item';
                div.innerHTML = `
                    <p><strong>${wrong.text}</strong></p>
                    <p>Your answer: ${wrong.userAnswer}</p>
                    <p style="color: var(--success-color);">Correct answer: ${wrong.correctAnswer}</p>
                `;
                reviewContainer.appendChild(div);
            });
        }

        if (this.reviewQueue.length > 0) {
            const reviewCount = this.reviewQueue.length;
            const reviewNotice = document.createElement('div');
            reviewNotice.className = 'review-notice';
            reviewNotice.innerHTML = `<p>⚠️ You have ${reviewCount} question(s) marked for spaced repetition review.</p>`;
            reviewContainer.appendChild(reviewNotice);
        }
    }

    resetQuiz() {
        this.currentQuiz = null;
        this.userAnswers = [];
        this.currentQuestion = 0;

        document.querySelector('.quiz-upload').classList.remove('hidden');
        document.getElementById('quizSession').classList.add('hidden');
        document.getElementById('quizResults').classList.add('hidden');

        document.getElementById('quizFile').value = '';
    }

    backToLoad() {
        this.resetQuiz();
    }
}

// ============================================================================
// NOTES MODULE - Markdown-supported note-taking with localStorage
// ============================================================================
class NotesManager {
    constructor(storage) {
        this.storage = storage;
        this.currentNoteId = null;
        this.notes = {};

        this.loadNotes();
        this.setupEventListeners();
        this.renderNotesList();
    }

    setupEventListeners() {
        document.getElementById('saveNote').addEventListener('click', () => this.saveNote());
        document.getElementById('deleteNote').addEventListener('click', () => this.deleteNote());

        document.getElementById('noteContent').addEventListener('input', (e) => {
            this.updatePreview(e.target.value);
        });

        document.getElementById('noteTitle').addEventListener('input', () => {
            if (this.currentNoteId) {
                this.notes[this.currentNoteId].title = document.getElementById('noteTitle').value;
            }
        });
    }

    loadNotes() {
        this.notes = this.storage.get('notes', {});
    }

    saveNote() {
        const title = document.getElementById('noteTitle').value.trim() || 'Untitled';
        const content = document.getElementById('noteContent').value;
        const subject = document.getElementById('noteSubject') ? document.getElementById('noteSubject').value : 'General';

        if (!content.trim()) {
            alert('Note content cannot be empty');
            return;
        }

        if (!this.currentNoteId) {
            this.currentNoteId = 'note_' + Date.now();
        }

        this.notes[this.currentNoteId] = {
            id: this.currentNoteId,
            title: title,
            content: content,
            subject: subject,
            created: this.notes[this.currentNoteId]?.created || new Date().toISOString(),
            modified: new Date().toISOString()
        };

        this.storage.set('notes', this.notes);
        this.renderNotesList();
        alert('Note saved!');
    }

    deleteNote() {
        if (!this.currentNoteId) return;
        if (!confirm('Delete this note?')) return;

        delete this.notes[this.currentNoteId];
        this.storage.set('notes', this.notes);

        this.currentNoteId = null;
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        document.getElementById('notePreview').innerHTML = '';

        this.renderNotesList();
    }

    renderNotesList() {
        const notesList = document.getElementById('notesList');
        const filterSubject = document.getElementById('notesFilterSubject') ? document.getElementById('notesFilterSubject').value : 'all';
        notesList.innerHTML = '';
        let filtered = Object.values(this.notes);
        if (filterSubject && filterSubject !== 'all') {
            filtered = filtered.filter(n => n.subject === filterSubject);
        }
        // Folder system: group by subject
        const grouped = {};
        filtered.forEach(note => {
            if (!grouped[note.subject]) grouped[note.subject] = [];
            grouped[note.subject].push(note);
        });
        Object.keys(grouped).forEach(subject => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'notes-folder';
            folderDiv.innerHTML = `<strong>📁 ${subject}</strong>`;
            grouped[subject].forEach(note => {
                const div = document.createElement('div');
                div.className = 'note-item';
                div.innerHTML = `
                    <h4>${this.escapeHtml(note.title)}</h4>
                    <p>${this.escapeHtml(note.content.substring(0, 50))}...</p>
                    <small>${new Date(note.modified).toLocaleDateString()}</small>
                `;
                div.addEventListener('click', () => this.loadNote(note.id));
                folderDiv.appendChild(div);
            });
            notesList.appendChild(folderDiv);
        });
    }

    loadNote(noteId) {
        this.currentNoteId = noteId;
        const note = this.notes[noteId];

        document.getElementById('noteTitle').value = note.title;
        document.getElementById('noteContent').value = note.content;
        this.updatePreview(note.content);
    }

    updatePreview(markdown) {
        const preview = document.getElementById('notePreview');
        let html = this.markdownToHtml(markdown);
        // Simple KaTeX/LaTeX rendering (placeholder)
        html = html.replace(/\$(.+?)\$/g, '<span class="math">$1</span>');
        preview.innerHTML = html;
    }

    markdownToHtml(markdown) {
        let html = this.escapeHtml(markdown);

        // Headings
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // Bold and Italic
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/\`(.*?)\`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Line breaks
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================================================
// STUDY TRACKER - Calculates total study time and analytics
// ============================================================================
class StudyTracker {
    static init(storage) {
        this.storage = storage;
        this.updateTotalTime();
    }

    static getTotalStudyTime() {
        const sessions = this.storage.get('dailySessions', {});
        return Object.values(sessions).reduce((a, b) => a + b, 0);
    }

    static updateTotalTime() {
        const totalMinutes = this.getTotalStudyTime();
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        document.getElementById('totalTimeStudied').textContent = `${hours}h ${minutes}m`;
    }

    static getDailyStats(date = null) {
        const targetDate = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
        const sessions = this.storage.get('dailySessions', {});
        return sessions[targetDate] || 0;
    }

    static getWeeklyStats() {
        const sessions = this.storage.get('dailySessions', {});
        const weekData = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            weekData[dateStr] = sessions[dateStr] || 0;
        }

        return weekData;
    }

    static getQuizStats() {
        const results = this.storage.get('quizResults', []);
        if (results.length === 0) return null;

        const avgScore = Math.round(
            results.reduce((sum, r) => sum + r.score, 0) / results.length
        );

        return {
            totalQuizzes: results.length,
            averageScore: avgScore,
            results: results
        };
    }
}

// ============================================================================
// FOCUS MODE - Minimalist UI toggle
// ============================================================================
class FocusMode {
    static init() {
        this.enabled = localStorage.getItem('focusMode') === 'true';
        document.getElementById('focusModeToggle').addEventListener('click', () => this.toggle());

        if (this.enabled) {
            this.enable();
        }
    }

    static toggle() {
        this.enabled ? this.disable() : this.enable();
    }

    static enable() {
        this.enabled = true;
        document.body.classList.add('focus-mode');
        localStorage.setItem('focusMode', 'true');
        document.getElementById('focusModeToggle').classList.add('active');
    }

    static disable() {
        this.enabled = false;
        document.body.classList.remove('focus-mode');
        localStorage.setItem('focusMode', 'false');
        document.getElementById('focusModeToggle').classList.remove('active');
    }
}

// ============================================================================
// UI CONTROLLER - Manages tab switching and modal operations
// ============================================================================
class UIController {
    static init() {
        this.setupTabNavigation();
        this.setupSettings();
    }

    static setupTabNavigation() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;

                // Remove active from all buttons and panes
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

                // Add active to clicked button and corresponding pane
                btn.classList.add('active');
                document.getElementById(tabName).classList.add('active');
            });
        });
    }

    static setupSettings() {
        const settingsModal = document.getElementById('settingsModal');
        document.getElementById('settingsToggle').addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            const settings = localStorage.getItem('studyDashboard_settings')
                ? JSON.parse(localStorage.getItem('studyDashboard_settings'))
                : {};
            settings.soundEnabled = e.target.checked;
            localStorage.setItem('studyDashboard_settings', JSON.stringify(settings));
        });

        document.getElementById('themeSelect').addEventListener('change', (e) => {
            document.body.classList.toggle('dark-theme', e.target.value === 'dark');
        });
    }
}

// ============================================================================
// PROGRESS ANALYTICS - Displays study analytics
// ============================================================================
class ProgressAnalytics {
    static init(storage) {
        this.storage = storage;
        this.setupEventListeners();
        this.renderAnalytics();
    }

    static setupEventListeners() {
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('importData').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
        document.getElementById('importFile').addEventListener('change', (e) => {
            if (e.target.files[0]) this.importData(e.target.files[0]);
        });
        document.getElementById('clearAllData').addEventListener('click', () => this.clearAllData());
    }

    static renderAnalytics() {
        this.renderDailyGoalChart();
        this.renderQuizPerformanceChart();
        this.renderStreakCalendar();
        this.renderSpacedRepetitionQueue();
    }

    // Render a simple bar for daily goal progress (last 7 days)
    static renderDailyGoalChart() {
        const canvas = document.getElementById('dailyGoalCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 160;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Get last 7 days
        const sessions = this.storage.get('dailySessions', {});
        const goal = 60; // minutes per day goal (customize as needed)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            days.push(dateStr);
        }
        // Draw bars
        const barW = 32;
        days.forEach((date, idx) => {
            const x = 20 + idx * (barW + 8);
            const y = 140;
            const val = typeof sessions[date] === 'number' ? sessions[date] : (typeof sessions[date] === 'object' ? Object.values(sessions[date]).reduce((a,b)=>a+b,0) : 0);
            const h = Math.min(val / goal, 1) * 100;
            ctx.fillStyle = val >= goal ? '#4caf50' : '#2196f3';
            ctx.fillRect(x, y - h, barW, h);
            ctx.fillStyle = '#222';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(val + 'm', x + barW/2, y - h - 6);
            ctx.save();
            ctx.translate(x + barW/2, y + 16);
            ctx.rotate(-Math.PI/4);
            ctx.fillText(date.slice(5), 0, 0);
            ctx.restore();
        });
        // Draw goal line
        ctx.strokeStyle = '#888';
        ctx.setLineDash([4,2]);
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(canvas.width, 40);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Goal: ' + goal + 'm', canvas.width - 50, 35);
    }

    // Render a simple bar for quiz performance (last 5 quizzes)
    static renderQuizPerformanceChart() {
        const canvas = document.getElementById('quizPerformanceCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = 320;
        canvas.height = 160;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const results = this.storage.get('quizResults', []);
        const last5 = results.slice(-5);
        const barW = 40;
        last5.forEach((res, idx) => {
            const x = 30 + idx * (barW + 16);
            const y = 140;
            const score = res.score || 0;
            const h = (score / 100) * 100;
            ctx.fillStyle = score >= 80 ? '#4caf50' : (score >= 50 ? '#ffc107' : '#f44336');
            ctx.fillRect(x, y - h, barW, h);
            ctx.fillStyle = '#222';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(score + '%', x + barW/2, y - h - 6);
            ctx.fillText(res.subject || '', x + barW/2, y + 16);
        });
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText('Last 5 Quizzes', canvas.width - 80, 20);
    }

    static renderStreakCalendar() {
        const streakData = this.storage.get('streakData', { studyDates: [] });
        const calendar = document.getElementById('streakCalendar');
        calendar.innerHTML = '';

        const today = new Date();
        const studyDatesSet = new Set(streakData.studyDates);

        for (let i = 30; i > 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const day = document.createElement('div');
            day.className = 'calendar-day';
            if (studyDatesSet.has(dateStr)) {
                day.classList.add('active');
            }
            day.title = dateStr;
            calendar.appendChild(day);
        }
    }

    static renderSpacedRepetitionQueue() {
        const queue = this.storage.get('reviewQueue', []);
        const container = document.getElementById('repetitionQueue');
        container.innerHTML = '';

        if (queue.length === 0) {
            container.innerHTML = '<p>No items in review queue.</p>';
            return;
        }

        queue.slice(0, 5).forEach(item => {
            const div = document.createElement('div');
            div.className = 'queue-item';
            div.innerHTML = `
                <p><strong>${item.text.substring(0, 50)}...</strong></p>
                <small>Attempts: ${item.attempts}</small>
            `;
            container.appendChild(div);
        });

        if (queue.length > 5) {
            const more = document.createElement('p');
            more.innerHTML = `<small>+${queue.length - 5} more items...</small>`;
            container.appendChild(more);
        }
    }

    static exportData() {
        const allData = {};
        const keys = this.storage.getAllKeys();

        keys.forEach(key => {
            allData[key] = this.storage.get(key);
        });

        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                Object.keys(data).forEach(key => {
                    this.storage.set(key, data[key]);
                });
                alert('Data imported successfully! Refreshing...');
                location.reload();
            } catch (error) {
                alert('Invalid file format: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    static clearAllData() {
        if (confirm('⚠️ This will delete ALL your data. Are you sure?')) {
            if (confirm('Really? This cannot be undone!')) {
                this.storage.clear();
                alert('All data cleared!');
                location.reload();
            }
        }
    }
}

// ============================================================================
// ADMIN AUTHENTICATION - Manages admin login and access control
// ============================================================================
class AdminAuth {
    static init(storage) {
        this.storage = storage;
        this.isAdminLoggedIn = false;
        this.setupEventListeners();
    }

    static setupEventListeners() {
        const adminModal = document.getElementById('adminModal');
        const adminModeBtn = document.getElementById('adminModeBtn');
        const adminModeBtn2 = document.getElementById('adminModeBtn2');
        const closeAdminModal = document.getElementById('closeAdminModal');
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminPasswordInput = document.getElementById('adminPassword');

        if (adminModeBtn) {
            adminModeBtn.addEventListener('click', () => this.openAdminModal());
        }
        if (adminModeBtn2) {
            adminModeBtn2.addEventListener('click', () => this.openAdminModal());
        }
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', () => {
                adminModal.classList.add('hidden');
            });
        }
        if (adminLoginBtn) {
            adminLoginBtn.addEventListener('click', () => this.attemptLogin());
        }
        if (adminPasswordInput) {
            adminPasswordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.attemptLogin();
            });
        }
    }

    static openAdminModal() {
        document.getElementById('adminModal').classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminMessage').classList.add('hidden');
    }

    static attemptLogin() {
        const input = document.getElementById('adminPassword').value;
        const hashedInput = btoa(input);
        const ADMIN_PASSWORD = btoa('1pisbest'); // Hardcoded admin password

        if (hashedInput === ADMIN_PASSWORD) {
            this.isAdminLoggedIn = true;
            this.showAdminUploadArea();
            document.getElementById('adminModal').classList.add('hidden');
            alert('Admin mode activated! ✓');
        } else {
            const messageEl = document.getElementById('adminMessage');
            messageEl.textContent = 'Incorrect password.';
            messageEl.classList.remove('hidden');
        }
    }

    static showAdminUploadArea() {
        document.getElementById('adminUploadArea').classList.remove('hidden');
        document.getElementById('adminFileUploadArea').classList.remove('hidden');
    }

    static isAdmin() {
        return this.isAdminLoggedIn;
    }
}

// ============================================================================
// LECTURES MANAGER - Manages lecture videos with subject folders
// ============================================================================
class LecturesManager {
    static SUBJECTS = [
        { key: 'arabic', label: 'اللغة العربية', labelEn: 'Arabic' },
        { key: 'english', label: 'اللغة الإنجليزية', labelEn: 'English' },
        { key: 'math', label: 'الرياضيات', labelEn: 'Math' },
        { key: 'science', label: 'العلوم', labelEn: 'Science' },
        { key: 'history', label: 'التاريخ', labelEn: 'History' },
        { key: 'philosophy', label: 'الفلسفة', labelEn: 'Philosophy' },
        { key: 'french', label: 'اللغة الفرنسية', labelEn: 'French' },
        { key: 'programming', label: 'البرمجة', labelEn: 'Programming' },
        { key: 'religion', label: 'التربية الدينية', labelEn: 'Religion' }
    ];

    static init(storage) {
        this.storage = storage;
        this.lectures = this.loadLectures();
        this.render();
        this.setupEventListeners();
    }

    static loadLectures() {
        return this.storage.get('lectures', {});
    }

    static saveLectures() {
        this.storage.set('lectures', this.lectures);
    }

    static setupEventListeners() {
        const uploadBtn = document.getElementById('uploadLectureBtn');
        const fileInput = document.getElementById('lectureFile');
        const subjectSelect = document.getElementById('lectureSubject');

        if (subjectSelect) {
            subjectSelect.innerHTML = '';
            this.SUBJECTS.forEach(subject => {
                const opt = document.createElement('option');
                opt.value = subject.key;
                opt.textContent = `${subject.labelEn} (${subject.label})`;
                subjectSelect.appendChild(opt);
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                if (!AdminAuth.isAdmin()) {
                    alert('Admin mode required to upload videos');
                    return;
                }
                if (fileInput.files.length === 0) {
                    alert('Please select a file');
                    return;
                }
                this.uploadLecture(fileInput.files[0]);
            });
        }
    }

    static uploadLecture(file) {
        const validTypes = ['video/mp4', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            alert('Only .mp4 and .mov files are allowed');
            return;
        }

        const subject = document.getElementById('lectureSubject').value;
        const reader = new FileReader();

        reader.onload = (e) => {
            // Check if Vercel Blob Storage is configured
            const uploadEndpoint = '/api/upload';
            const useCloudStorage = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

            if (useCloudStorage) {
                // Upload to Vercel Blob Storage
                this.uploadToVercelBlob(file, subject, uploadEndpoint);
            } else {
                // Fall back to localStorage
                this.uploadToLocalStorage(file, subject, e.target.result);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    static uploadToVercelBlob(file, subject, endpoint) {
        // TODO: Implement Vercel Blob Storage upload
        // This requires a backend API endpoint
        console.log('Vercel Blob Storage upload would be implemented here');
        this.uploadToLocalStorage(file, subject, null);
    }

    static uploadToLocalStorage(file, subject, data) {
        const lectureData = {
            id: 'lecture_' + Date.now(),
            name: file.name,
            subject: subject,
            size: file.size,
            type: file.type,
            data: data,
            uploaded: new Date().toISOString(),
            storage: 'local'
        };

        if (!this.lectures[subject]) {
            this.lectures[subject] = [];
        }
        this.lectures[subject].push(lectureData);
        this.saveLectures();

        alert(`Video "${file.name}" uploaded successfully!`);
        document.getElementById('lectureFile').value = '';
        this.render();
    }

    static render() {
        const container = document.getElementById('lecturesFolders');
        if (!container) return;
        container.innerHTML = '';

        this.SUBJECTS.forEach(subject => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-item';
            folderDiv.innerHTML = `
                <div class="folder-header">
                    <span class="folder-icon">📁</span>
                    <div class="folder-info">
                        <div class="folder-name">${subject.labelEn}</div>
                        <div class="folder-label">${subject.label}</div>
                        <div class="folder-count">${(this.lectures[subject.key] || []).length} videos</div>
                    </div>
                </div>
            `;

            const videosList = document.createElement('div');
            videosList.className = 'folder-contents hidden';
            (this.lectures[subject.key] || []).forEach(video => {
                const videoItem = document.createElement('div');
                videoItem.className = 'video-item';
                videoItem.innerHTML = `
                    <span class="video-icon">🎥</span>
                    <span class="video-name">${video.name}</span>
                    <small>${(video.size / 1024 / 1024).toFixed(2)} MB</small>
                `;
                videosList.appendChild(videoItem);
            });

            folderDiv.appendChild(videosList);
            folderDiv.addEventListener('click', () => {
                videosList.classList.toggle('hidden');
            });
            container.appendChild(folderDiv);
        });
    }
}

// ============================================================================
// FILES MANAGER - Manages file uploads with subject folders
// ============================================================================
class FilesManager {
    static SUBJECTS = [
        { key: 'arabic', label: 'اللغة العربية', labelEn: 'Arabic' },
        { key: 'english', label: 'اللغة الإنجليزية', labelEn: 'English' },
        { key: 'math', label: 'الرياضيات', labelEn: 'Math' },
        { key: 'science', label: 'العلوم', labelEn: 'Science' },
        { key: 'history', label: 'التاريخ', labelEn: 'History' },
        { key: 'philosophy', label: 'الفلسفة', labelEn: 'Philosophy' },
        { key: 'french', label: 'اللغة الفرنسية', labelEn: 'French' },
        { key: 'programming', label: 'البرمجة', labelEn: 'Programming' },
        { key: 'religion', label: 'التربية الدينية', labelEn: 'Religion' },
        { key: 'extra', label: 'إضافي', labelEn: 'Extra' }
    ];

    static init(storage) {
        this.storage = storage;
        this.files = this.loadFiles();
        this.render();
        this.setupEventListeners();
    }

    static loadFiles() {
        return this.storage.get('files', {});
    }

    static saveFiles() {
        this.storage.set('files', this.files);
    }

    static setupEventListeners() {
        const uploadBtn = document.getElementById('uploadFileBtn');
        const fileInput = document.getElementById('fileUploadInput');
        const subjectSelect = document.getElementById('fileSubject');

        if (subjectSelect) {
            subjectSelect.innerHTML = '';
            this.SUBJECTS.forEach(subject => {
                const opt = document.createElement('option');
                opt.value = subject.key;
                opt.textContent = `${subject.labelEn} (${subject.label})`;
                subjectSelect.appendChild(opt);
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                if (!AdminAuth.isAdmin()) {
                    alert('Admin mode required to upload files');
                    return;
                }
                if (fileInput.files.length === 0) {
                    alert('Please select a file');
                    return;
                }
                this.uploadFile(fileInput.files[0]);
            });
        }
    }

    static uploadFile(file) {
        const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Only PDF and image files (JPG, PNG, GIF) are allowed');
            return;
        }

        const subject = document.getElementById('fileSubject').value;
        const reader = new FileReader();

        reader.onload = (e) => {
            // Check if Vercel Blob Storage is configured
            const uploadEndpoint = '/api/upload';
            const useCloudStorage = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

            if (useCloudStorage) {
                // Upload to Vercel Blob Storage
                this.uploadToVercelBlob(file, subject, uploadEndpoint);
            } else {
                // Fall back to localStorage
                this.uploadToLocalStorage(file, subject, e.target.result);
            }
        };

        reader.readAsDataURL(file);
    }

    static uploadToVercelBlob(file, subject, endpoint) {
        // TODO: Implement Vercel Blob Storage upload
        // This requires a backend API endpoint
        console.log('Vercel Blob Storage upload would be implemented here');
        this.uploadToLocalStorage(file, subject, null);
    }

    static uploadToLocalStorage(file, subject, data) {
        const fileData = {
            id: 'file_' + Date.now(),
            name: file.name,
            subject: subject,
            size: file.size,
            type: file.type,
            data: data,
            uploaded: new Date().toISOString(),
            storage: 'local'
        };

        if (!this.files[subject]) {
            this.files[subject] = [];
        }
        this.files[subject].push(fileData);
        this.saveFiles();

        alert(`File "${file.name}" uploaded successfully!`);
        document.getElementById('fileUploadInput').value = '';
        this.render();
    }

    static render() {
        const container = document.getElementById('filesFolders');
        if (!container) return;
        container.innerHTML = '';

        this.SUBJECTS.forEach(subject => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'folder-item';
            folderDiv.innerHTML = `
                <div class="folder-header">
                    <span class="folder-icon">📁</span>
                    <div class="folder-info">
                        <div class="folder-name">${subject.labelEn}</div>
                        <div class="folder-label">${subject.label}</div>
                        <div class="folder-count">${(this.files[subject.key] || []).length} files</div>
                    </div>
                </div>
            `;

            const filesList = document.createElement('div');
            filesList.className = 'folder-contents hidden';
            (this.files[subject.key] || []).forEach(file => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                const icon = file.type.includes('pdf') ? '📄' : '🖼️';
                fileItem.innerHTML = `
                    <span class="file-icon">${icon}</span>
                    <span class="file-name">${file.name}</span>
                    <small>${(file.size / 1024).toFixed(2)} KB</small>
                `;
                filesList.appendChild(fileItem);
            });

            folderDiv.appendChild(filesList);
            folderDiv.addEventListener('click', () => {
                filesList.classList.toggle('hidden');
            });
            container.appendChild(folderDiv);
        });
    }
}

// ============================================================================
// ============================================================================
// LANGUAGE SUPPORT (EN/AR)
// ============================================================================
const LANGUAGES = {
    en: {
        studyDashboard: 'Study Dashboard',
        totalStudied: 'Total Studied',
        dailyStreak: 'Daily Streak',
        timer: 'Timer',
        quiz: 'Quiz',
        notes: 'Notes',
        progress: 'Progress',
        start: 'Start',
        pause: 'Pause',
        reset: 'Reset',
        customizeIntervals: 'Customize Intervals',
        workDuration: 'Work Duration (minutes)',
        breakDuration: 'Break Duration (minutes)',
        applySettings: 'Apply Settings',
        sessionStats: 'Session Stats',
        sessionsCompleted: 'Sessions Completed:',
        totalBreaks: 'Total Breaks:',
        todaysFocus: "Today's Focus:",
        loadQuiz: 'Load Quiz',
        loadQuizJson: 'Load Quiz JSON',
        quizJsonFormat: 'Quiz JSON Format',
        quizTitle: 'Quiz',
        reviewNeeded: 'Review Needed',
        previous: '← Previous',
        next: 'Next →',
        submitQuiz: 'Submit Quiz',
        quizResults: 'Quiz Results',
        score: 'Score',
        correct: 'Correct',
        retakeQuiz: 'Retake Quiz',
        backToLoad: 'Back to Load',
        noteTitle: 'Note title...',
        save: '💾 Save',
        delete: '🗑️ Delete',
        notesList: 'Your Notes',
        writeNotes: 'Write your notes... (Markdown supported)',
        studyProgress: 'Study Progress',
        dailyGoalTracking: 'Daily Goal Tracking',
        quizPerformance: 'Quiz Performance',
        studyStreaks: 'Study Streaks',
        spacedRepetitionQueue: 'Spaced Repetition Queue',
        exportData: '📥 Export Data',
        importData: '📤 Import Data',
        clearAllData: 'Clear All Data',
        settings: 'Settings',
        enableSound: 'Enable Sound Notifications',
        theme: 'Theme:',
        light: 'Light',
        dark: 'Dark',
        workTime: 'Work Time',
        breakTime: 'Break Time',
        lectures: 'Lectures',
        المحاضرات: 'Lectures',
        files: 'Files',
        adminMode: 'Admin Mode',
        uploadVideo: 'Upload Lecture Video',
        selectSubject: 'Select Subject',
        uploadFile: 'Upload File',
        selectFolder: 'Select Folder',
        adminPassword: 'Enter Admin Password',
        login: 'Login',
        setPasswordTitle: 'Set Admin Password:',
        setPassword: 'Set Password',
        videos: 'videos',
        files: 'files',
        uploadLectureVideo: 'Upload Lecture Video',
        lectureVideos: 'Lecture Videos',
        filesManagement: 'Files Management',
    },
    ar: {
        studyDashboard: 'لوحة الدراسة',
        totalStudied: 'إجمالي الدراسة',
        dailyStreak: 'سلسلة الأيام',
        timer: 'المؤقت',
        quiz: 'الاختبار',
        notes: 'ملاحظات',
        progress: 'التقدم',
        start: 'ابدأ',
        pause: 'إيقاف مؤقت',
        reset: 'إعادة',
        customizeIntervals: 'تخصيص الفترات',
        workDuration: 'مدة العمل (دقائق)',
        breakDuration: 'مدة الاستراحة (دقائق)',
        applySettings: 'تطبيق الإعدادات',
        sessionStats: 'إحصائيات الجلسة',
        sessionsCompleted: 'الجلسات المكتملة:',
        totalBreaks: 'إجمالي الاستراحات:',
        todaysFocus: 'تركيز اليوم:',
        loadQuiz: 'تحميل اختبار',
        loadQuizJson: 'تحميل ملف اختبار JSON',
        quizJsonFormat: 'تنسيق ملف الاختبار',
        quizTitle: 'الاختبار',
        reviewNeeded: 'مراجعة مطلوبة',
        previous: 'السابق ←',
        next: '→ التالي',
        submitQuiz: 'إرسال الاختبار',
        quizResults: 'نتائج الاختبار',
        score: 'النتيجة',
        correct: 'صحيح',
        retakeQuiz: 'إعادة الاختبار',
        backToLoad: 'العودة للتحميل',
        noteTitle: 'عنوان الملاحظة...',
        save: '💾 حفظ',
        delete: '🗑️ حذف',
        notesList: 'ملاحظاتك',
        writeNotes: 'اكتب ملاحظاتك... (يدعم ماركداون)',
        studyProgress: 'تقدم الدراسة',
        dailyGoalTracking: 'تتبع الهدف اليومي',
        quizPerformance: 'أداء الاختبار',
        studyStreaks: 'سلسلة الدراسة',
        spacedRepetitionQueue: 'قائمة التكرار المتباعد',
        exportData: '📥 تصدير البيانات',
        importData: '📤 استيراد البيانات',
        clearAllData: 'مسح كل البيانات',
        settings: 'الإعدادات',
        enableSound: 'تفعيل إشعارات الصوت',
        theme: 'السمة:',
        light: 'فاتح',
        dark: 'داكن',
        workTime: 'وقت العمل',
        breakTime: 'وقت الاستراحة',
        lectures: 'المحاضرات',
        lectures: 'المحاضرات',
        files: 'الملفات',
        adminMode: 'وضع المسؤول',
        uploadVideo: 'تحميل فيديو المحاضرة',
        selectSubject: 'اختر الموضوع',
        uploadFile: 'تحميل ملف',
        selectFolder: 'اختر المجلد',
        adminPassword: 'أدخل كلمة مرور المسؤول',
        login: 'تسجيل الدخول',
        setPasswordTitle: 'تعيين كلمة مرور المسؤول:',
        setPassword: 'تعيين كلمة المرور',
        videos: 'فيديوهات',
        filesCount: 'ملفات',
        uploadLectureVideo: 'تحميل فيديو المحاضرة',
        lectureVideos: 'فيديوهات المحاضرات',
        filesManagement: 'إدارة الملفات'
    }
};

function updateLanguageUI(lang) {
    const t = LANGUAGES[lang] || LANGUAGES.en;
    // Header
    const h1 = document.querySelector('h1');
    if (h1) h1.textContent = '📚 ' + t.studyDashboard;
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels[0]) statLabels[0].textContent = t.totalStudied;
    if (statLabels[1]) statLabels[1].textContent = t.dailyStreak;
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (tabBtns[0]) tabBtns[0].textContent = '⏱️ ' + t.timer;
    if (tabBtns[1]) tabBtns[1].textContent = '❓ ' + t.quiz;
    if (tabBtns[2]) tabBtns[2].textContent = '📝 ' + t.notes;
    if (tabBtns[3]) tabBtns[3].textContent = '📊 ' + t.progress;
    if (tabBtns[4]) tabBtns[4].textContent = '🎥 ' + t.lectures;
    if (tabBtns[5]) tabBtns[5].textContent = '📁 ' + t.files;
    // Timer
    const timerStart = document.getElementById('timerStart');
    if (timerStart) timerStart.textContent = t.start;
    const timerPause = document.getElementById('timerPause');
    if (timerPause) timerPause.textContent = t.pause;
    const timerReset = document.getElementById('timerReset');
    if (timerReset) timerReset.textContent = t.reset;
    const timerSettingsH3 = document.querySelector('.timer-settings h3');
    if (timerSettingsH3) timerSettingsH3.textContent = t.customizeIntervals;
    const settingsGroupLabels = document.querySelectorAll('.settings-group label');
    if (settingsGroupLabels[0]) settingsGroupLabels[0].textContent = t.workDuration;
    if (settingsGroupLabels[1]) settingsGroupLabels[1].textContent = t.breakDuration;
    const applyTimerSettings = document.getElementById('applyTimerSettings');
    if (applyTimerSettings) applyTimerSettings.textContent = t.applySettings;
    const timerStatsH3 = document.querySelector('.timer-stats h3');
    if (timerStatsH3) timerStatsH3.textContent = t.sessionStats;
    const statRowSpans = document.querySelectorAll('.stat-row span');
    if (statRowSpans[0]) statRowSpans[0].textContent = t.sessionsCompleted;
    if (statRowSpans[2]) statRowSpans[2].textContent = t.totalBreaks;
    if (statRowSpans[4]) statRowSpans[4].textContent = t.todaysFocus;
    // Quiz
    const quizUploadH3 = document.querySelector('.quiz-upload h3');
    if (quizUploadH3) quizUploadH3.textContent = t.loadQuiz;
    const loadQuizBtn = document.getElementById('loadQuizBtn');
    if (loadQuizBtn) loadQuizBtn.textContent = t.loadQuizJson;
    const quizFormatHelpSummary = document.querySelector('.quiz-format-help summary');
    if (quizFormatHelpSummary) quizFormatHelpSummary.textContent = '📋 ' + t.quizJsonFormat;
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle) quizTitle.textContent = t.quizTitle;
    const repetitionFlag = document.getElementById('repetitionFlag');
    if (repetitionFlag) repetitionFlag.textContent = '⚠️ ' + t.reviewNeeded;
    const prevQuestion = document.getElementById('prevQuestion');
    if (prevQuestion) prevQuestion.textContent = t.previous;
    const nextQuestion = document.getElementById('nextQuestion');
    if (nextQuestion) nextQuestion.textContent = t.next;
    const submitQuiz = document.getElementById('submitQuiz');
    if (submitQuiz) submitQuiz.textContent = t.submitQuiz;
    const quizResultsH2 = document.querySelector('#quizResults h2');
    if (quizResultsH2) quizResultsH2.textContent = t.quizResults;
    const resultLabels = document.querySelectorAll('.result-label');
    if (resultLabels[0]) resultLabels[0].textContent = t.score;
    if (resultLabels[1]) resultLabels[1].textContent = t.correct;
    const retakeQuiz = document.getElementById('retakeQuiz');
    if (retakeQuiz) retakeQuiz.textContent = t.retakeQuiz;
    const backToQuiz = document.getElementById('backToQuiz');
    if (backToQuiz) backToQuiz.textContent = t.backToLoad;
    // Notes
    const noteTitle = document.getElementById('noteTitle');
    if (noteTitle) noteTitle.placeholder = t.noteTitle;
    const saveNote = document.getElementById('saveNote');
    if (saveNote) saveNote.textContent = t.save;
    const deleteNote = document.getElementById('deleteNote');
    if (deleteNote) deleteNote.textContent = t.delete;
    const notesListH3 = document.querySelector('.notes-list h3');
    if (notesListH3) notesListH3.textContent = t.notesList;
    const noteContent = document.getElementById('noteContent');
    if (noteContent) noteContent.placeholder = t.writeNotes;
    // Progress
    const progressH2 = document.querySelector('#progress h2');
    if (progressH2) progressH2.textContent = t.studyProgress;
    const progressCardH3s = document.querySelectorAll('.progress-card h3');
    if (progressCardH3s[0]) progressCardH3s[0].textContent = t.dailyGoalTracking;
    if (progressCardH3s[1]) progressCardH3s[1].textContent = t.quizPerformance;
    if (progressCardH3s[2]) progressCardH3s[2].textContent = t.studyStreaks;
    if (progressCardH3s[3]) progressCardH3s[3].textContent = t.spacedRepetitionQueue;
    const exportData = document.getElementById('exportData');
    if (exportData) exportData.textContent = t.exportData;
    const importData = document.getElementById('importData');
    if (importData) importData.textContent = t.importData;
    const clearAllData = document.getElementById('clearAllData');
    if (clearAllData) clearAllData.textContent = t.clearAllData;
    // Settings
    const settingsModalH2 = document.querySelector('#settingsModal h2');
    if (settingsModalH2) settingsModalH2.textContent = t.settings;
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle && soundToggle.nextSibling && soundToggle.nextSibling.nodeType === 3) soundToggle.nextSibling.textContent = t.enableSound;
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        const label = themeSelect.closest('label');
        if (label && label.childNodes.length > 0) label.childNodes[0].textContent = t.theme;
        const optLight = themeSelect.querySelector('option[value="light"]');
        const optDark = themeSelect.querySelector('option[value="dark"]');
        if (optLight) optLight.textContent = t.light;
        if (optDark) optDark.textContent = t.dark;
    }
    // Timer label (dynamic)
    const timerLabel = document.getElementById('timerLabel');
    if (timerLabel) {
        timerLabel.textContent = timerLabel.textContent.includes('Work') || timerLabel.textContent.includes('العمل') ? t.workTime : t.breakTime;
    }
    // RTL support
    if (lang === 'ar') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.style.textAlign = 'right';
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.style.textAlign = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage and managers in correct order
    const storage = new StorageManager('studyDashboard');
    const subjectsManager = new SubjectsManager(storage);

    // --- Subject dropdown population ---
    function updateSubjectDropdowns() {
        const subjects = subjectsManager.subjects;
        // Quiz upload
        const quizSubject = document.getElementById('quizSubject');
        if (quizSubject) {
            quizSubject.innerHTML = '';
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                quizSubject.appendChild(opt);
            });
        }
        // Note editor
        const noteSubject = document.getElementById('noteSubject');
        if (noteSubject) {
            noteSubject.innerHTML = '';
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                noteSubject.appendChild(opt);
            });
        }
        // Notes filter
        const notesFilter = document.getElementById('notesFilterSubject');
        if (notesFilter) {
            notesFilter.innerHTML = '<option value="all">All Subjects</option>';
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                notesFilter.appendChild(opt);
            });
        }
        // Progress filter
        const progressFilter = document.getElementById('progressFilterSubject');
        if (progressFilter) {
            progressFilter.innerHTML = '<option value="all">All Subjects</option>';
            subjects.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                progressFilter.appendChild(opt);
            });
        }
    }
    updateSubjectDropdowns();
    // Update dropdowns when subjects change
    subjectsManager.onSubjectsChanged = updateSubjectDropdowns;

    // ...existing code...

    // Language selection
    const lang = storage.get('language', 'en');
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = lang;

    // Initialize all modules
    const timer = new PomodoroTimer(storage);
    StreakCounter.init(storage);
    const quiz = new QuizEngine(storage);
    const notes = new NotesManager(storage);
    StudyTracker.init(storage);
    UIController.init();
    FocusMode.init();
    ProgressAnalytics.init(storage);
    SubjectsDashboardAnalytics.init(storage, subjectsManager);
    
    // Initialize new modules
    AdminAuth.init(storage);
    LecturesManager.init(storage);
    FilesManager.init(storage);

    // Now update language UI
    updateLanguageUI(lang);
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            const selectedLang = e.target.value;
            storage.set('language', selectedLang);
            updateLanguageUI(selectedLang);
        });
    }

    // Update UI displays
    StudyTracker.updateTotalTime();
    StreakCounter.updateDisplay();

    // Periodic updates
    setInterval(() => {
        StudyTracker.updateTotalTime();
    }, 30000); // Update every 30 seconds
});
