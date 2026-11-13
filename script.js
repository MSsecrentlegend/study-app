// ============================================================================
// SUBJECTS DASHBOARD ANALYTICS - Per-subject analytics for dashboard tab
// ============================================================================
const DEFAULT_SUBJECTS = ['Arabic', 'English', 'History'];

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
        filter.replaceChildren();
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = PortalUI.text('allSubjects');
        filter.appendChild(allOption);
        this.subjectsManager.subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = PortalUI.subjectName(s);
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
                } else if (subject === DEFAULT_SUBJECTS[0] && typeof session === 'number') {
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
        const saved = this.storage.get('subjects', []);
        const custom = Array.isArray(saved)
            ? saved.filter(subject => typeof subject === 'string' && subject && subject.toLowerCase() !== 'general' && !DEFAULT_SUBJECTS.includes(subject))
            : [];
        const subjects = [...DEFAULT_SUBJECTS, ...custom];
        if (JSON.stringify(saved) !== JSON.stringify(subjects)) {
            this.storage.set('subjects', subjects);
        }
        return subjects;
    }

    saveSubjects() {
        this.storage.set('subjects', this.subjects);
    }

    addSubject(name) {
        if (!name || name.toLowerCase() === 'general' || this.subjects.includes(name)) return;
        this.subjects.push(name);
        this.saveSubjects();
        this.renderSubjectsList();
    }

    deleteSubject(name) {
        if (DEFAULT_SUBJECTS.includes(name)) return;
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
            div.textContent = PortalUI.subjectName(subject);
            if (!DEFAULT_SUBJECTS.includes(subject)) {
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
        this.userId = null;
    }

    setUserScope(userId) {
        this.userId = userId || null;
    }

    getStoragePrefix() {
        return this.userId
            ? `${this.namespace}_user_${encodeURIComponent(this.userId)}_`
            : `${this.namespace}_`;
    }

    getStorageKey(key) {
        return `${this.getStoragePrefix()}${key}`;
    }

    set(key, data) {
        try {
            localStorage.setItem(this.getStorageKey(key), JSON.stringify(data));
            window.PortalBackend?.scheduleProgressSync();
            return true;
        } catch (e) {
            console.error('Storage error:', e);
            return false;
        }
    }

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(this.getStorageKey(key));
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage error:', e);
            return defaultValue;
        }
    }

    remove(key) {
        localStorage.removeItem(this.getStorageKey(key));
    }

    clear() {
        const keys = Object.keys(localStorage);
        const prefix = this.getStoragePrefix();
        keys.filter(key => key.startsWith(prefix)
            && (this.userId || !key.startsWith(`${this.namespace}_user_`)))
            .forEach(key => localStorage.removeItem(key));
    }

    getAllKeys() {
        const keys = [];
        const prefix = this.getStoragePrefix();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)
                && (this.userId || !key.startsWith(`${this.namespace}_user_`))) {
                keys.push(key.replace(prefix, ''));
            }
        }
        return keys;
    }

    replaceAll(data) {
        this.getAllKeys()
            .filter(key => !Object.prototype.hasOwnProperty.call(data, key))
            .forEach(key => this.remove(key));
        Object.entries(data).forEach(([key, value]) => this.set(key, value));
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
        this.lastResult = null;
        this.studentName = '';
        this.userAnswers = [];
        this.currentQuestion = 0;
        this.quizSubmitted = false;

        this.setupEventListeners();
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
        document.getElementById('retakeQuiz').addEventListener('click', () => this.retakeQuiz());
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
                if (!this.isValidQuiz(quiz)) {
                    throw new Error(PortalUI.text('invalidExamFile'));
                }
                this.showNameModal(quiz);
            } catch (error) {
                alert(PortalUI.text('invalidQuizJson'));
            }
        };
        reader.readAsText(file);
    }

    isValidQuiz(quiz) {
        return Boolean(
            quiz &&
            typeof quiz.title === 'string' &&
            Array.isArray(quiz.questions) &&
            quiz.questions.length > 0 &&
            quiz.questions.every(question =>
                typeof question.text === 'string' &&
                Array.isArray(question.options) &&
                question.options.length >= 2 &&
                Number.isInteger(question.correct) &&
                question.correct >= 0 &&
                question.correct < question.options.length
            )
        );
    }

    showNameModal(quiz) {
        this.currentQuiz = quiz;
        if (window.PortalUI) {
            PortalUI.addExam(quiz, document.getElementById('quizSubject')?.value || DEFAULT_SUBJECTS[0]);
        }
        document.querySelector('.quiz-upload').classList.add('hidden');
        this.startQuiz(quiz);
    }

    startQuiz(quiz) {
        const user = window.PortalBackend?.user;
        this.studentName = window.PortalBackend?.profile?.display_name
            || user?.user_metadata?.display_name
            || user?.email?.split('@')[0]
            || PortalUI.text('guest');
        this.userAnswers = new Array(quiz.questions.length).fill(null);
        this.currentQuestion = 0;
        this.lastResult = null;
        this.quizSubmitted = false;

        document.getElementById('quizSession').classList.remove('hidden');
        document.getElementById('quizResults').classList.add('hidden');

        this.displayQuestion();
    }

    displayQuestion() {
        const question = this.currentQuiz.questions[this.currentQuestion];
        const isLastQuestion = this.currentQuestion === this.currentQuiz.questions.length - 1;
        const answeredCount = this.userAnswers.filter(answer => answer !== null).length;

        document.getElementById('quizTitle').textContent = this.currentQuiz.title || 'Quiz';
        document.getElementById('questionText').textContent = question.text;
        document.getElementById('questionProgress').textContent = PortalUI.text('answeredProgress', {
            answered: answeredCount,
            total: this.currentQuiz.questions.length
        });

        const progressPercent = (answeredCount / this.currentQuiz.questions.length) * 100;
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

    }

    selectAnswer(index) {
        this.userAnswers[this.currentQuestion] = index;
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach((btn, i) => {
            btn.classList.toggle('selected', i === index);
        });
        const answeredCount = this.userAnswers.filter(answer => answer !== null).length;
        document.getElementById('questionProgress').textContent = PortalUI.text('answeredProgress', {
            answered: answeredCount,
            total: this.currentQuiz.questions.length
        });
        document.getElementById('progressFill').style.width =
            `${(answeredCount / this.currentQuiz.questions.length) * 100}%`;
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

    async submitQuiz() {
        if (this.quizSubmitted) return;
        this.quizSubmitted = true;
        const submitButton = document.getElementById('submitQuiz');
        submitButton.disabled = true;
        const saveMessage = document.getElementById('examSaveMessage');
        saveMessage.textContent = PortalUI.text('savingExamResult');
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

        // Save quiz result locally
        const results = this.storage.get('quizResults', []);
        const result = {
            attemptId: window.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
                const random = Math.random() * 16 | 0;
                return (character === 'x' ? random : (random & 3 | 8)).toString(16);
            }),
            quizTitle: this.currentQuiz.title,
            date: new Date().toISOString(),
            score: score,
            correctCount: correctCount,
            totalQuestions: this.currentQuiz.questions.length,
            studentName: this.studentName
        };
        results.push(result);
        const savedLocally = this.storage.set('quizResults', results);
        PortalUI.updateDashboard();
        PortalUI.renderExamResults();
        this.displayResults(correctCount, wrongAnswers, score);
        try {
            if (window.PortalBackend?.user) {
                await PortalBackend.saveExamResult({
                    ...result,
                    examId: this.currentQuiz.id
                });
                saveMessage.textContent = PortalUI.text(savedLocally ? 'examResultSaved' : 'examResultSavedOnlineOnly');
            } else {
                saveMessage.textContent = PortalUI.text(savedLocally ? 'examResultSavedLocally' : 'localSaveFailed');
            }
        } catch (error) {
            saveMessage.textContent = PortalUI.text(savedLocally ? 'examResultCloudSaveFailed' : 'examResultSaveFailed', {
                message: error.message
            });
            console.error('Exam result cloud save failed:', error);
        } finally {
            submitButton.disabled = false;
        }
    }

    displayResults(correctCount, wrongAnswers, score) {
        this.lastResult = { correctCount, wrongAnswers, score };
        document.getElementById('quizSession').classList.add('hidden');
        document.getElementById('quizResults').classList.remove('hidden');

        document.getElementById('finalScore').textContent = `${score}%`;
        document.getElementById('correctCount').textContent = `${correctCount}/${this.currentQuiz.questions.length}`;

        const reviewContainer = document.getElementById('reviewContainer');
        reviewContainer.replaceChildren();
        const reviewHeading = document.createElement('h3');
        reviewHeading.textContent = PortalUI.text('reviewAnswers');
        reviewContainer.appendChild(reviewHeading);

        if (wrongAnswers.length > 0) {
            const wrongHeading = document.createElement('h4');
            wrongHeading.textContent = PortalUI.text('wrongAnswers');
            reviewContainer.appendChild(wrongHeading);
            wrongAnswers.forEach(wrong => {
                const div = document.createElement('div');
                div.className = 'review-item';
                const question = document.createElement('p');
                const questionText = document.createElement('strong');
                questionText.textContent = wrong.text;
                question.appendChild(questionText);
                const userAnswer = document.createElement('p');
                userAnswer.textContent = `${PortalUI.text('yourAnswer')}: ${wrong.userAnswer ?? PortalUI.text('noAnswer')}`;
                const correctAnswer = document.createElement('p');
                correctAnswer.textContent = `${PortalUI.text('correctAnswer')}: ${wrong.correctAnswer}`;
                correctAnswer.style.color = 'var(--success-color)';
                div.append(question, userAnswer, correctAnswer);
                reviewContainer.appendChild(div);
            });
        }

    }

    resetQuiz() {
        this.currentQuiz = null;
        this.lastResult = null;
        this.studentName = '';
        this.userAnswers = [];
        this.currentQuestion = 0;

        document.getElementById('quizSession').classList.add('hidden');
        document.getElementById('quizResults').classList.add('hidden');

        document.getElementById('quizFile').value = '';
    }

    retakeQuiz() {
        if (!this.currentQuiz) {
            this.resetQuiz();
            return;
        }
        this.userAnswers = new Array(this.currentQuiz.questions.length).fill(null);
        this.currentQuestion = 0;
        document.getElementById('quizResults').classList.add('hidden');
        document.getElementById('quizSession').classList.remove('hidden');
        this.displayQuestion();
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
        const subject = document.getElementById('noteSubject') ? document.getElementById('noteSubject').value : DEFAULT_SUBJECTS[0];

        if (!content.trim()) {
            alert(PortalUI.text('noteContentRequired'));
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
        alert(PortalUI.text('noteSaved'));
    }

    deleteNote() {
        if (!this.currentNoteId) return;
        if (!confirm(PortalUI.text('confirmDeleteNote'))) return;

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
            const folderTitle = document.createElement('strong');
            folderTitle.textContent = `📁 ${PortalUI.subjectName(subject)}`;
            folderDiv.appendChild(folderTitle);
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
// SUBJECT TOOLS - Helpers and resources for each subject
// ============================================================================
class SubjectToolsManager {
    constructor(storage) {
        this.storage = storage;
        this.subjects = [
            {
                key: 'arabic',
                label: 'Arabic',
                overview: 'Dictionary, grammar checks, and detailed إعراب analysis for Arabic sentences.',
                tools: [
                    { title: 'Arabic Dictionary Lookup', keyword: 'dictionary' },
                    { title: 'Arabic Grammar Checker', keyword: 'grammar' },
                    { title: 'I‘rab / Syntax Assistant', keyword: 'iʿrab' }
                ],
                resources: [
                    { title: 'Almaany Arabic Dictionary', url: 'https://www.almaany.com/ar/', description: 'Arabic meanings with sample usage and root forms.' },
                    { title: 'Nahw Grammar Lessons', url: 'https://www.arabicgrammar.com/', description: 'Structured grammar lessons for Arabic syntax and morphology.' },
                    { title: 'Arabic Syntax Guide', url: 'https://qfi.org/resource/the-basics-of-arabic-grammar/', description: 'Practical guides for Arabic sentence structure and case endings.' }
                ]
            },
            {
                key: 'math',
                label: 'Math',
                overview: 'Scientific calculator, graph plotter, and math resources for algebra and geometry.',
                tools: [
                    { title: 'Scientific Calculator', keyword: 'calculator' },
                    { title: 'Graphing Tool', keyword: 'graph' },
                    { title: 'Formula Reference', keyword: 'formulas' }
                ],
                resources: [
                    { title: 'Khan Academy Math', url: 'https://www.khanacademy.org/math', description: 'Free math lessons and practice across school topics.' },
                    { title: 'Desmos Graphing Calculator', url: 'https://www.desmos.com/calculator', description: 'Interactive graphing for algebra and functions.' },
                    { title: 'Math is Fun', url: 'https://www.mathsisfun.com/', description: 'Clear explanations and examples for core math ideas.' }
                ]
            },
            {
                key: 'english',
                label: 'English',
                overview: 'Grammar checking, dictionary lookup, and thesaurus support for English with Arabic translations.',
                tools: [
                    { title: 'English Dictionary Lookup', keyword: 'dictionary' },
                    { title: 'Grammar Checker', keyword: 'grammar' },
                    { title: 'Thesaurus Lookup', keyword: 'thesaurus' }
                ],
                resources: [
                    { title: 'Cambridge Dictionary', url: 'https://dictionary.cambridge.org/', description: 'Definitions, pronunciation, and grammar examples.' },
                    { title: 'Merriam-Webster Thesaurus', url: 'https://www.merriam-webster.com/thesaurus', description: 'Synonyms and antonyms for richer vocabulary.' },
                    { title: 'Oxford Learner’s Dictionaries', url: 'https://www.oxfordlearnersdictionaries.com/', description: 'Learner-friendly English usage and examples.' }
                ]
            }
        ];

        this.arabicDictionary = {
            كتاب: { meaningAr: 'كتاب', meaningEn: 'book', root: 'ك ت ب', pos: 'اسم', example: 'قرأتُ كتابًا مفيدًا.' },
            طالب: { meaningAr: 'طالب', meaningEn: 'student', root: 'ط ل ب', pos: 'اسم', example: 'الطالبُ مجتهدٌ.' },
            مدرسة: { meaningAr: 'مدرسة', meaningEn: 'school', root: 'م د ر س', pos: 'اسم', example: 'المدرسةُ واسعةٌ.' },
            درس: { meaningAr: 'درس', meaningEn: 'lesson', root: 'د ر س', pos: 'اسم', example: 'درسُ اليومِ مفيدٌ.' },
            علم: { meaningAr: 'علم', meaningEn: 'knowledge', root: 'ع ل م', pos: 'اسم', example: 'العلمُ نورٌ.' },
            كتب: { meaningAr: 'كتب', meaningEn: 'he wrote / books', root: 'ك ت ب', pos: 'فعل / اسم', example: 'كتبَ الرسالةَ.' },
            قرأ: { meaningAr: 'قرأ', meaningEn: 'he read', root: 'ق ر أ', pos: 'فعل', example: 'قرأَ الطالبُ الكتابَ.' },
            بيت: { meaningAr: 'بيت', meaningEn: 'house', root: 'ب ي ت', pos: 'اسم', example: 'البيتُ جميلٌ.' },
            كبير: { meaningAr: 'كبير', meaningEn: 'big', root: 'ك ب ر', pos: 'صفة', example: 'الكتابُ كبيرٌ.' }
        };

        this.englishTranslations = {
            improve: 'تحسين',
            student: 'طالب',
            school: 'مدرسة',
            study: 'يدرس',
            book: 'كتاب',
            difficult: 'صعب',
            easy: 'سهل',
            help: 'مساعدة',
            grammar: 'قواعد',
            sentence: 'جملة'
        };

        this.mathHistory = [];

        this.currentSubject = 'arabic';
        this.renderTabs();
        this.renderSection();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('subjectToolsSearchBtn')?.addEventListener('click', () => this.handleSearch());
        document.getElementById('subjectToolsSearch')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.handleSearch();
            }
        });

        document.getElementById('subjectToolsTabs')?.addEventListener('click', (event) => {
            const button = event.target.closest('.subject-tool-btn');
            if (!button) return;
            const subject = button.dataset.subject;
            if (subject) {
                this.changeSubject(subject);
            }
        });
    }

    renderTabs() {
        const tabsContainer = document.getElementById('subjectToolsTabs');
        if (!tabsContainer) return;
        tabsContainer.innerHTML = this.subjects.map(subject => `
            <button type="button" class="subject-tool-btn${subject.key === this.currentSubject ? ' active' : ''}" data-subject="${subject.key}">
                ${subject.label}
            </button>
        `).join('');
    }

    changeSubject(subjectKey) {
        if (this.currentSubject === subjectKey) return;
        this.currentSubject = subjectKey;
        this.renderTabs();
        this.renderSection();
    }

    handleSearch() {
        const query = document.getElementById('subjectToolsSearch')?.value.trim().toLowerCase() || '';
        this.renderSection(query);
    }

    getCurrentSubject() {
        return this.subjects.find(subject => subject.key === this.currentSubject);
    }

    renderSection(searchQuery = '') {
        const content = document.getElementById('subjectToolsContent');
        if (!content) return;

        const subject = this.getCurrentSubject();
        if (!subject) return;

        const searchResults = this.searchItems(searchQuery, subject);
        const searchHtml = searchQuery ? this.renderSearchResults(searchResults, searchQuery) : '';
        const toolPanel = this.renderSubjectPanel(subject);
        const resourcePanel = this.renderResourcePanel(subject);

        content.innerHTML = `${searchHtml}${toolPanel}${resourcePanel}`;
        this.attachSubjectListeners(subject);
    }

    searchItems(query, currentSubject) {
        if (!query) return [];
        const normalized = query.toLowerCase();
        const allItems = this.subjects.flatMap(subject => [
            ...subject.tools.map(tool => ({ subject: subject.key, title: tool.title, type: 'tool' })),
            ...subject.resources.map(resource => ({ subject: subject.key, title: resource.title, type: 'resource', url: resource.url }))
        ]);
        return allItems.filter(item => item.title.toLowerCase().includes(normalized));
    }

    renderSearchResults(results, query) {
        if (results.length === 0) {
            return `<div class="tool-card"><h4>Search Results</h4><p class="tool-output">No tools or resources found for "${query}". Try simpler keywords like dictionary, grammar, calculator, or thesaurus.</p></div>`;
        }

        return `
            <div class="tool-card">
                <h4>Search Results</h4>
                <div class="search-results">
                    ${results.map(result => `
                        <div class="result-item" data-subject="${result.subject}" data-type="${result.type}" data-url="${result.url || ''}">
                            <strong>${result.title}</strong>
                            <div>Subject: ${this.subjects.find(s => s.key === result.subject)?.label || result.subject}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderSubjectPanel(subject) {
        return `
            <div class="tool-panel">
                <div class="tool-card">
                    <h3>${subject.label}</h3>
                    <p>${subject.overview}</p>
                </div>
                ${this.renderSubjectTools(subject)}
            </div>
        `;
    }

    renderSubjectTools(subject) {
        if (subject.key === 'arabic') {
            return `
                <div class="tool-grid">
                    <div class="tool-card arabic-tool">
                        <h4>Arabic Dictionary Lookup</h4>
                        <label for="arabicLookupInput">Enter Arabic or English word</label>
                        <input id="arabicLookupInput" dir="auto" type="text" placeholder="مثال: كتاب or book" class="input-field">
                        <div class="tool-actions">
                            <button id="arabicLookupBtn" class="btn btn-primary">Lookup</button>
                        </div>
                        <div id="arabicLookupResult" class="tool-output">Type a word and click Lookup.</div>
                    </div>
                    <div class="tool-card arabic-tool">
                        <h4>Arabic Grammar Checker</h4>
                        <label for="arabicGrammarInput">Enter a short sentence</label>
                        <textarea id="arabicGrammarInput" dir="auto" placeholder="اكتب جملة عربية هنا..."></textarea>
                        <div class="tool-actions">
                            <button id="arabicGrammarBtn" class="btn btn-primary">Check Grammar</button>
                        </div>
                        <div id="arabicGrammarResult" class="tool-output">Paste a sentence to get grammar hints.</div>
                    </div>
                    <div class="tool-card arabic-tool">
                        <h4>I‘rab / Syntax Assistant</h4>
                        <label for="arabicI3rabInput">Enter a sentence for detailed analysis</label>
                        <input id="arabicI3rabInput" dir="auto" type="text" placeholder="مثال: الطالبُ يدرسُ الدرسَ" class="input-field">
                        <div class="tool-actions">
                            <button id="arabicI3rabBtn" class="btn btn-primary">Analyze</button>
                        </div>
                        <div id="arabicI3rabResult" class="tool-output">This tool analyzes Arabic sentence structure and case endings.</div>
                    </div>
                </div>
            `;
        }

        if (subject.key === 'math') {
            return `
                <div class="tool-grid">
                    <div class="tool-card">
                        <h4>Scientific Calculator</h4>
                        <label for="mathCalcInput">Enter expression</label>
                        <input id="mathCalcInput" type="text" placeholder="Example: 2*(3+1)/4 or sin(45)" class="input-field">
                        <div class="tool-actions">
                            <button id="mathCalcBtn" class="btn btn-primary">Calculate</button>
                        </div>
                        <div id="mathCalcResult" class="tool-output">Enter a math expression and click Calculate.</div>
                        <div id="mathCalcHistory" class="tool-output" style="font-size:0.95rem;">Calculation history will appear here.</div>
                    </div>
                    <div class="tool-card">
                        <h4>Graphing Tool</h4>
                        <label for="mathGraphInput">Function of x</label>
                        <input id="mathGraphInput" type="text" placeholder="Example: x^2 - 3*x + 2" class="input-field">
                        <div class="tool-actions">
                            <button id="mathGraphBtn" class="btn btn-primary">Plot Graph</button>
                        </div>
                        <div class="tool-output">
                            <canvas id="mathGraphCanvas" width="500" height="260"></canvas>
                            <div id="mathGraphHint" style="margin-top:0.75rem;color:var(--text-secondary);font-size:0.9rem;">Supported functions: sin, cos, tan, sqrt, abs, log, exp, PI, E.</div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (subject.key === 'english') {
            return `
                <div class="tool-grid">
                    <div class="tool-card">
                        <h4>English Dictionary Lookup</h4>
                        <label for="englishLookupInput">Enter English word</label>
                        <input id="englishLookupInput" type="text" placeholder="Example: improve" class="input-field">
                        <div class="tool-actions">
                            <button id="englishLookupBtn" class="btn btn-primary">Lookup</button>
                        </div>
                        <div id="englishLookupResult" class="tool-output">Searches the free dictionary API for definitions and examples.</div>
                    </div>
                    <div class="tool-card">
                        <h4>Grammar Checker</h4>
                        <label for="englishGrammarInput">Enter a sentence</label>
                        <textarea id="englishGrammarInput" placeholder="Type an English sentence here..."></textarea>
                        <div class="tool-actions">
                            <button id="englishGrammarBtn" class="btn btn-primary">Check Grammar</button>
                        </div>
                        <div id="englishGrammarResult" class="tool-output">Simple grammar hints will appear here.</div>
                    </div>
                    <div class="tool-card">
                        <h4>Thesaurus Lookup</h4>
                        <label for="englishThesaurusInput">Enter word</label>
                        <input id="englishThesaurusInput" type="text" placeholder="Example: strong" class="input-field">
                        <div class="tool-actions">
                            <button id="englishThesaurusBtn" class="btn btn-primary">Find Synonyms</button>
                        </div>
                        <div id="englishThesaurusResult" class="tool-output">Shows synonyms from a free API when available.</div>
                    </div>
                </div>
            `;
        }

        return '<div class="tool-card"><p>No subject tools available.</p></div>';
    }

    renderResourcePanel(subject) {
        return `
            <div class="resource-card">
                <h4>Curated Resources</h4>
                <ul class="resource-list">
                    ${subject.resources.map(resource => `
                        <li>
                            <a href="${resource.url}" target="_blank" rel="noopener noreferrer">${resource.title}</a>
                            ${resource.description ? `<p style="margin:0.4rem 0 0; color: var(--text-secondary); font-size:0.95rem;">${resource.description}</p>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    attachSubjectListeners(subject) {
        if (subject.key === 'arabic') {
            document.getElementById('arabicLookupBtn')?.addEventListener('click', () => this.lookupArabicWord());
            document.getElementById('arabicGrammarBtn')?.addEventListener('click', () => this.checkArabicGrammar());
            document.getElementById('arabicI3rabBtn')?.addEventListener('click', () => this.analyzeArabicI3rab());
        }

        if (subject.key === 'math') {
            document.getElementById('mathCalcBtn')?.addEventListener('click', () => this.calculateMathExpression());
            document.getElementById('mathGraphBtn')?.addEventListener('click', () => this.plotMathGraph());
        }

        if (subject.key === 'english') {
            document.getElementById('englishLookupBtn')?.addEventListener('click', () => this.lookupEnglishWord());
            document.getElementById('englishGrammarBtn')?.addEventListener('click', () => this.checkEnglishGrammar());
            document.getElementById('englishThesaurusBtn')?.addEventListener('click', () => this.lookupEnglishThesaurus());
        }

        const searchResults = document.querySelectorAll('.search-results .result-item');
        searchResults.forEach(item => {
            item.addEventListener('click', () => {
                const subject = item.dataset.subject;
                if (subject) {
                    this.changeSubject(subject);
                    document.getElementById('subjectToolsSearch').value = '';
                    this.renderSection();
                }
            });
        });
    }

    lookupArabicWord() {
        const input = document.getElementById('arabicLookupInput');
        const result = document.getElementById('arabicLookupResult');
        const word = input?.value.trim();
        if (!word) {
            if (result) result.textContent = 'Please enter a word.';
            return;
        }

        const englishMatch = word.toLowerCase();
        if (/[A-Za-z]/.test(word)) {
            const translation = this.englishTranslations[englishMatch];
            if (translation) {
                result.textContent = `English: ${word}\nArabic: ${translation}`;
                return;
            }
            result.textContent = `No local Arabic translation found for "${word}". Try another English word.`;
            return;
        }

        const entry = this.arabicDictionary[word];
        if (entry) {
            result.textContent = `الكلمة: ${entry.meaningAr}\nالنوع: ${entry.pos}\nالمعنى بالإنجليزية: ${entry.meaningEn}\nالجذر: ${entry.root}\nمثال: ${entry.example}`;
            return;
        }

        result.textContent = 'No local Arabic entry found. Extend the dictionary or connect to an Arabic dictionary API for richer results.';
    }

    checkArabicGrammar() {
        const input = document.getElementById('arabicGrammarInput');
        const result = document.getElementById('arabicGrammarResult');
        const text = input?.value.trim();
        if (!text) {
            if (result) result.textContent = 'Please enter a sentence to check.';
            return;
        }

        const issues = [];
        if (text.includes('  ')) issues.push('احذف المسافات المكررة واستخدم مسافة واحدة فقط.');
        if (/[A-Za-z]/.test(text)) issues.push('الجملة تحتوي على أحرف لاتينية؛ يرجى استخدام حروف عربية.');
        if (text.length < 10) issues.push('اكتب جملة أطول للحصول على تحليل أفضل.');
        if (!/[.!؟]$/.test(text)) issues.push('يفضل أن تنتهي الجملة بنقطة أو علامة استفهام أو تعجب.');

        const nominalSentence = /^[^\s]+\s+[^\s]+/.test(text) && !/^(ي|ت|أ|س)/.test(text);
        if (nominalSentence) {
            issues.push('الجملة تبدو اسمية. تأكد من وجود مبتدأ وخبر مناسبين.');
        }

        result.textContent = issues.length > 0 ? `ملاحظات لغوية:\n- ${issues.join('\n- ')}` : 'لا توجد أخطاء واضحة. هذه ملاحظات عامة فقط لتحسين صياغة الجملة.';
    }

    analyzeArabicI3rab() {
        const input = document.getElementById('arabicI3rabInput');
        const result = document.getElementById('arabicI3rabResult');
        const text = input?.value.trim();
        if (!text) {
            if (result) result.textContent = 'Please enter a sentence for syntax analysis.';
            return;
        }

        const particles = ['في', 'من', 'على', 'إلى', 'عن', 'ب', 'ك', 'ل', 'سوف', 'لم', 'لن', 'إن', 'أن', 'كان', 'هل', 'ما', 'ماذا', 'لمّا', 'أنّ', 'لكن', 'بل'];
        const verbs = ['ذهب', 'يذهب', 'درس', 'يدرس', 'قرأ', 'يقرأ', 'كتب', 'يكتب', 'عمل', 'يفعل', 'أكل', 'يشرب', 'نام', 'يسافر', 'كان', 'يكون'];
        const pronouns = ['أنا', 'أنت', 'أنتِ', 'هو', 'هي', 'نحن', 'أنتم', 'أنتن', 'هم', 'هن', 'هما'];
        const words = text.split(/\s+/).filter(Boolean);

        const analysis = words.map(word => {
            let role = 'اسم محتمل';
            let caseHint = 'مرفوع محتمل';

            if (particles.includes(word)) {
                role = 'حرف جر / أداة';
                caseHint = 'لاحقاً اسم مجرور أو جملة فعلية';
            } else if (pronouns.includes(word)) {
                role = 'ضمير';
                caseHint = 'مرفوع غالباً كفاعل أو مبتدأ';
            } else if (verbs.includes(word) || /^[ي|ت|أ|س][\u0600-\u06FF]+$/.test(word) || /^(فعل|كتب|درس)$/.test(word)) {
                role = 'فعل';
                caseHint = 'لا ينعوت بالحركات هنا ويأتي بعده فاعل ومنصوبات';
            } else if (word.endsWith('ُ') || word.endsWith('ٌ') || word.endsWith('وا') || word.endsWith('ون')) {
                role = 'فاعل أو مبتدأ';
                caseHint = 'مرفوع';
            } else if (word.endsWith('َ') || word.endsWith('ً') || word.endsWith('ا') || word.endsWith('ة')) {
                role = 'مفعول به أو خبر';
                caseHint = 'منصوب أو خبر ممكن';
            } else if (word.startsWith('ال')) {
                role = 'اسم معرفة';
                caseHint = 'قد يكون مبتدأ أو خبر أو مضاف إليه';
            }

            return { word, role, caseHint };
        });

        const first = words[0] || '';
        const sentenceType = verbs.includes(first) || first.startsWith('ي') || first.startsWith('ت') || first.startsWith('أ') ? 'جملة فعلية محتملة' : 'جملة اسمية محتملة';

        let summary = `نوع الجملة: ${sentenceType}\n`;
        summary += 'تحليل الكلمات:\n';
        summary += analysis.map((item, idx) => `${idx + 1}. ${item.word} — ${item.role} — ${item.caseHint}`).join('\n');

        const prepositionIndex = words.findIndex(w => particles.includes(w));
        if (prepositionIndex !== -1 && prepositionIndex < words.length - 1) {
            summary += `\n\nجار ومجرور محتمل: ${words[prepositionIndex]} ${words[prepositionIndex + 1]}`;
        }

        summary += '\n\nملاحظة: هذا تحليل مبسط. راجع قواعد النحو العربية للتحقق من حالة الإعراب النهائية.';
        result.textContent = summary;
    }

    calculateMathExpression() {
        const input = document.getElementById('mathCalcInput');
        const result = document.getElementById('mathCalcResult');
        const expression = input?.value.trim();
        if (!expression) {
            if (result) result.textContent = 'Please enter a math expression to calculate.';
            return;
        }

        const sanitized = expression.replace(/\^/g, '**');
        try {
            const value = this.safeEvalMath(sanitized, 0);
            result.textContent = `Result: ${value}`;
        } catch (error) {
            result.textContent = `Error evaluating expression: ${error.message}`;
        }
    }

    plotMathGraph() {
        const input = document.getElementById('mathGraphInput');
        const canvas = document.getElementById('mathGraphCanvas');
        const resultHint = document.getElementById('mathGraphHint');
        const expression = input?.value.trim();
        if (!expression || !canvas) {
            if (resultHint) resultHint.textContent = 'Enter a function like x^2 - 3*x + 2 to see the graph.';
            return;
        }

        const sanitized = expression.replace(/\^/g, '**');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, width, height);

        const points = [];
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 0; i <= 100; i++) {
            const x = -10 + (20 * i / 100);
            try {
                const y = this.safeEvalMath(sanitized, x);
                if (typeof y === 'number' && Number.isFinite(y)) {
                    points.push({ x, y });
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            } catch {
                // ignore bad points
            }
        }

        if (points.length === 0) {
            resultHint.textContent = 'Could not plot this expression. Try a simpler formula using x, +, -, *, /, ^, sin, cos, sqrt.';
            return;
        }

        const yRange = Math.max(maxY - minY, 1);
        const toCanvasX = x => ((x + 10) / 20) * width;
        const toCanvasY = y => height - ((y - minY) / yRange) * height;

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, toCanvasY(0));
        ctx.lineTo(width, toCanvasY(0));
        ctx.moveTo(toCanvasX(0), 0);
        ctx.lineTo(toCanvasX(0), height);
        ctx.stroke();

        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        points.forEach((point, index) => {
            const cx = toCanvasX(point.x);
            const cy = toCanvasY(point.y);
            if (index === 0) ctx.moveTo(cx, cy);
            else ctx.lineTo(cx, cy);
        });
        ctx.stroke();

        resultHint.textContent = `Graph plotted for y = ${expression}.`;
    }

    lookupEnglishWord() {
        const input = document.getElementById('englishLookupInput');
        const result = document.getElementById('englishLookupResult');
        const word = input?.value.trim();
        if (!word) {
            if (result) result.textContent = 'Please enter a word.';
            return;
        }

        if (result) result.textContent = 'Looking up word...';
        fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || !data[0]) {
                    result.textContent = `No definition found for "${word}".`;
                    return;
                }
                const entry = data[0];
                const meaning = entry.meanings?.[0];
                const definition = meaning?.definitions?.[0]?.definition || 'No definition available.';
                const example = meaning?.definitions?.[0]?.example || '';
                result.textContent = `Definition: ${definition}${example ? `\nExample: ${example}` : ''}`;
            })
            .catch(() => {
                if (result) result.textContent = 'Could not connect to the dictionary API. Check your internet connection.';
            });
    }

    checkEnglishGrammar() {
        const input = document.getElementById('englishGrammarInput');
        const result = document.getElementById('englishGrammarResult');
        const text = input?.value.trim();
        if (!text) {
            if (result) result.textContent = 'Please enter an English sentence.';
            return;
        }

        const issues = [];
        const lower = text.toLowerCase();
        if (/(\b)(the|a|an)\s+\1/.test(lower)) issues.push('Repeated article detected.');
        if (/\b(very very|so so|really really)\b/.test(lower)) issues.push('Avoid repeated intensifiers.');
        if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) issues.push('Check capitalization; do not capitalize common words in the middle of a sentence.');
        if (!/[.!?]$/.test(text)) issues.push('Consider ending the sentence with a period, question mark, or exclamation point.');

        result.textContent = issues.length > 0 ? `Grammar hints:\n- ${issues.join('\n- ')}` : 'No obvious grammar issues detected. For deeper checking, use a dedicated grammar service.';
    }

    lookupEnglishThesaurus() {
        const input = document.getElementById('englishThesaurusInput');
        const result = document.getElementById('englishThesaurusResult');
        const word = input?.value.trim();
        if (!word) {
            if (result) result.textContent = 'Please enter a word.';
            return;
        }

        if (result) result.textContent = 'Looking up synonyms...';
        fetch(`https://api.datamuse.com/words?ml=${encodeURIComponent(word)}&max=8`)
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    result.textContent = `No synonyms found for "${word}".`;
                    return;
                }
                const synonyms = data.map(item => item.word).join(', ');
                result.textContent = `Synonyms: ${synonyms}`;
            })
            .catch(() => {
                if (result) result.textContent = 'Could not reach the thesaurus API. Check your network.';
            });
    }

    safeEvalMath(expression, xValue) {
        const normalized = expression.replace(/[^0-9a-zA-Z+\-*/().,\s_^]/g, '');
        const allowed = /^(?:[0-9xX+\-*/().,\s^eE]+|(?:sin|cos|tan|abs|sqrt|log|exp|pow|PI|E))*$/i;
        if (!allowed.test(normalized)) {
            throw new Error('Expression contains unsupported characters or functions.');
        }

        const expressionWithX = normalized.replace(/\^/g, '**').replace(/x/gi, `(${xValue})`);
        const fn = new Function(`return ${expressionWithX};`);
        const result = fn();
        if (typeof result !== 'number' || !Number.isFinite(result)) {
            throw new Error('Invalid numeric result.');
        }
        return result;
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
    static init(storage) {
        this.setupTabNavigation();
        this.setupSettings(storage);
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
                const pane = document.getElementById(tabName);
                if (pane) pane.classList.add('active');
                if (window.PortalUI) PortalUI.setPage(tabName);
            });
        });

        document.querySelectorAll('[data-open-tab]').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector(`.tab-btn[data-tab="${button.dataset.openTab}"]`)?.click();
            });
        });
        document.querySelectorAll('[data-open-profile]').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelector('.tab-btn[data-tab="profile"]')?.click();
            });
        });
    }

    static setupSettings(storage) {
        const settingsModal = document.getElementById('settingsModal');
        document.getElementById('settingsToggle').addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });

        document.getElementById('closeSettings').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            const settings = storage.get('settings', {});
            settings.soundEnabled = e.target.checked;
            storage.set('settings', settings);
        });

        const settings = storage.get('settings', {});
        document.getElementById('soundToggle').checked = settings.soundEnabled !== false;
        document.getElementById('themeSelect').value = settings.theme || 'dark';
        PortalUI.applyTheme(settings.theme || 'dark', storage, false);
        document.getElementById('themeSelect').addEventListener('change', (e) => {
            PortalUI.applyTheme(e.target.value, storage);
        });
        document.getElementById('themeToggle').addEventListener('click', () => {
            const current = storage.get('settings', {}).theme || 'dark';
            PortalUI.applyTheme(current === 'dark' ? 'light' : 'dark', storage);
        });

        [
            ['notificationsToggle', 'notificationsEnabled'],
            ['chatNotificationsToggle', 'chatNotifications'],
            ['announcementNotificationsToggle', 'announcementNotifications']
        ].forEach(([id, key]) => {
            const checkbox = document.getElementById(id);
            checkbox.checked = settings[key] !== false;
            checkbox.addEventListener('change', () => {
                const nextSettings = storage.get('settings', {});
                nextSettings[key] = checkbox.checked;
                storage.set('settings', nextSettings);
                PortalUI.renderNotifications(PortalBackend.chatMessages || []);
            });
        });

        document.getElementById('profileVisibilityToggle').addEventListener('change', async event => {
            const checkbox = event.currentTarget;
            try {
                await PortalBackend.updateProfileVisibility(checkbox.checked);
            } catch (error) {
                checkbox.checked = !checkbox.checked;
                PortalUI.showFormMessage(document.getElementById('profileEditMessage'), error.message, 'error');
                console.error('Profile privacy update failed:', error);
            }
        });

        document.getElementById('replayTutorial').addEventListener('click', () => PortalUI.startTutorial(true));
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
        this.setupEventListeners();
        this.render();
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

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                if (!AdminAuth.isAdmin()) {
                    alert('Admin mode required to upload videos');
                    return;
                }
                fileInput.click();
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.uploadLecture(e.target.files[0]);
                }
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
        const uploadBtn = document.getElementById('uploadLectureBtn');
        
        // Disable button and show loading state
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('type', 'lecture');

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`Video "${file.name}" uploaded successfully! All users will see it.`);
                document.getElementById('lectureFile').value = '';
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload Lecture Video';
                // Refresh the lectures list from server
                this.loadLecturesFromServer();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            alert(`Upload failed: ${error.message}`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload Lecture Video';
        });
    }

    static loadLecturesFromServer() {
        fetch('/api/lectures')
            .then(response => response.json())
            .then(lectures => {
                // Convert server response to expected format
                this.lectures = {};
                lectures.forEach(lecture => {
                    const subject = lecture.name.split('_')[0] || 'Other';
                    if (!this.lectures[subject]) {
                        this.lectures[subject] = [];
                    }
                    this.lectures[subject].push({
                        name: lecture.name,
                        url: lecture.url,
                        size: 0
                    });
                });
                this.render();
            })
            .catch(error => console.error('Error loading lectures:', error));
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
        this.setupEventListeners();
        this.render();
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

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                if (!AdminAuth.isAdmin()) {
                    alert('Admin mode required to upload files');
                    return;
                }
                fileInput.click();
            });
            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.uploadFile(e.target.files[0]);
                }
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
        const uploadBtn = document.getElementById('uploadFileBtn');
        
        // Disable button and show loading state
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Uploading...';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);
        formData.append('type', 'file');

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert(`File "${file.name}" uploaded successfully! All users will see it.`);
                document.getElementById('fileUploadInput').value = '';
                uploadBtn.disabled = false;
                uploadBtn.textContent = 'Upload File';
                // Refresh the files list from server
                this.loadFilesFromServer();
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        })
        .catch(error => {
            alert(`Upload failed: ${error.message}`);
            uploadBtn.disabled = false;
            uploadBtn.textContent = 'Upload File';
        });
    }

    static loadFilesFromServer() {
        fetch('/api/files')
            .then(response => response.json())
            .then(files => {
                // Convert server response to expected format
                this.files = {};
                files.forEach(file => {
                    const subject = file.name.split('_')[0] || 'Other';
                    if (!this.files[subject]) {
                        this.files[subject] = [];
                    }
                    this.files[subject].push({
                        name: file.name,
                        url: file.url,
                        size: 0,
                        type: file.name.split('.').pop()
                    });
                });
                this.render();
            })
            .catch(error => console.error('Error loading files:', error));
    }

    static render() {
        const container = document.getElementById('filesFolders');
        if (!container) return;
        container.innerHTML = '';

        const files = Object.entries(this.files).flatMap(([subject, entries]) =>
            entries.map(file => ({ ...file, subject }))
        );
        if (!files.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            const heading = document.createElement('h3');
            heading.textContent = PortalUI.text('noFilesYet');
            const description = document.createElement('p');
            description.textContent = PortalUI.text('filesSetupText');
            empty.append(heading, description);
            container.appendChild(empty);
            return;
        }

        files.forEach(file => {
            const card = document.createElement('article');
            card.className = 'resource-card';
            const icon = document.createElement('span');
            icon.className = 'resource-icon';
            icon.textContent = this.fileExtension(file) === 'pdf' ? '▤' : '▧';
            const details = document.createElement('div');
            details.className = 'resource-details';
            const name = document.createElement('strong');
            name.textContent = file.name;
            const meta = document.createElement('span');
            meta.textContent = `${PortalUI.subjectName(file.subject)} · ${this.fileExtension(file).toUpperCase()}`;
            details.append(name, meta);

            const actions = document.createElement('div');
            actions.className = 'resource-actions';
            const view = document.createElement('button');
            view.className = 'btn btn-secondary';
            view.type = 'button';
            view.textContent = PortalUI.text('viewFile');
            view.addEventListener('click', () => this.openFile(file));
            const download = document.createElement('a');
            download.className = 'btn btn-primary';
            download.href = file.downloadUrl || file.url;
            download.download = file.downloadName || file.name;
            download.target = '_blank';
            download.rel = 'noopener noreferrer';
            download.textContent = PortalUI.text('downloadFile');
            download.addEventListener('click', () => this.trackDownload(file));
            actions.append(view, download);
            card.append(icon, details, actions);
            if (PortalBackend.configured && PortalBackend.isAdmin()) {
                const adminActions = document.createElement('div');
                adminActions.className = 'resource-admin-actions';
                adminActions.append(
                    PortalUI.createAdminButton('edit', () => PortalUI.editFile(file)),
                    PortalUI.createAdminButton('delete', () => PortalUI.deleteFile(file))
                );
                card.appendChild(adminActions);
            }
            container.appendChild(card);
        });
    }

    static fileExtension(file) {
        const type = (file.type || '').toLowerCase();
        const typeExtensions = {
            'application/pdf': 'pdf',
            'text/plain': 'txt',
            'text/markdown': 'md',
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/gif': 'gif'
        };
        return typeExtensions[type] || file.name.split('.').pop().toLowerCase();
    }

    static trackDownload(file) {
        const downloaded = PortalUI.storage.get('downloadedFiles', []);
        const key = file.objectPath || file.url || file.name;
        if (!downloaded.includes(key)) {
            downloaded.push(key);
            PortalUI.storage.set('downloadedFiles', downloaded);
            PortalUI.updateDashboard();
        }
    }

    static openFile(file) {
        if (!file.url) return;
        const url = new URL(file.url, window.location.href);
        if (!['http:', 'https:'].includes(url.protocol)) return;
        const modal = document.getElementById('fileViewerModal');
        const viewer = document.getElementById('fileViewer');
        const extension = this.fileExtension(file);
        if (!['pdf', 'txt', 'md', 'png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
            window.open(url.href, '_blank', 'noopener,noreferrer');
            return;
        }
        document.getElementById('fileViewerTitle').textContent = file.name;
        viewer.src = url.href;
        modal.classList.remove('hidden');
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
        subjectTools: 'Subject Tools',
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
        subjectTools: 'أدوات المواد',
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

const PORTAL_TRANSLATIONS = {
    en: {
        metaDescription: 'Luma Study — your calm, connected learning space', mainNavigation: 'Main navigation',
        closeVideo: 'Close video', youtubePlayer: 'YouTube video player', closeFileViewer: 'Close file viewer', filePreview: 'File preview',
        closeSettings: 'Close settings', closeWelcome: 'Close', changeLanguage: 'Change language', english: 'English', arabic: 'Arabic',
        enableSound: 'Enable sound notifications', theme: 'Theme:', light: 'Light', dark: 'Dark',
        madeWithLove: 'Made with ❤️ by',
        enterYourName: 'Please enter your name:', nameExample: 'e.g., John Doe', startQuiz: 'Start quiz',
        invalidQuizJson: 'Could not load the quiz. Check that the selected file is valid quiz JSON.',
        enterName: 'Please enter your name.', reviewAnswers: 'Review answers', wrongAnswers: 'Wrong answers:',
        savingExamResult: 'Saving your score…', examResultSaved: 'Score saved to your account.',
        examResultSavedOnlineOnly: 'Score saved to your account, but not on this device.',
        examResultSavedLocally: 'Score saved on this device. Sign in to save it to your account.',
        examResultCloudSaveFailed: 'Score saved on this device, but account sync failed: {message}',
        examResultSaveFailed: 'Could not save your score on this device or to your account: {message}',
        localSaveFailed: 'Could not save this score on this device.',
        yourAnswer: 'Your answer', correctAnswer: 'Correct answer', noAnswer: 'No answer selected',
        noteContentRequired: 'Note content cannot be empty.', noteSaved: 'Note saved!', confirmDeleteNote: 'Delete this note?',
        subjectArabic: 'Arabic', subjectEnglish: 'English', subjectHistory: 'History',
        quizTitle: 'Quiz', questionPrompt: 'Question text here', loadQuiz: 'Load quiz',
        loadQuizJson: 'Load quiz JSON', quizJsonFormat: 'Quiz JSON format',
        previous: '← Previous', next: 'Next →', submitQuiz: 'Submit quiz',
        quizResults: 'Quiz results', score: 'Score', correct: 'Correct',
        retakeQuiz: 'Retake quiz', backToLoad: 'Back to exams',
        workspace: 'WORKSPACE', dashboard: 'Dashboard', community: 'Community', videos: 'Videos', exams: 'Exams', files: 'Files', profile: 'Profile', settings: 'Settings', language: 'Language:',
        detailedProgress: 'Detailed study progress and data',
        guest: 'Guest learner', localProgress: 'Progress saved on this device', learningSpace: 'YOUR LEARNING SPACE',
        dashboardIntro: 'A clear view of your learning, all in one calm space.', globalRoom: 'GLOBAL ROOM',
        communityIntro: 'Ask a question, share an idea, and learn together.', everyoneTogether: 'Everyone, together',
        studyCommunity: 'Study community', oneSharedRoom: 'One shared room for every learner', setupRequired: 'Setup required',
        communityReadyTitle: 'Your study community is ready', communitySetupText: 'Connect a shared account and database to enable live messages for everyone.',
        setUpAccount: 'Set up an account', writeMessage: 'Write a message...', send: 'Send',
        communitySetupNote: 'Live chat is unavailable until shared backend credentials are configured.',
        yourAccount: 'YOUR ACCOUNT', profileIntro: 'Manage your account and keep your learning in sync.',
        notSignedIn: 'Not signed in', deviceOnly: 'Device-only mode', cloudSync: 'CLOUD SYNC',
        createAccount: 'Create your account', alreadyHaveAccount: 'I already have an account',
        backendSetupNeeded: 'Backend setup needed', backendSetupDescription: 'To enable secure sign-in and sync between devices, create a Supabase project and configure its public project URL and anonymous key. Never put a service-role key in the website.',
        name: 'Name', email: 'Email', password: 'Password', signOut: 'Sign out',
        knowledgeCheck: 'KNOWLEDGE CHECK', examIntro: 'Choose an exam and take it one question at a time.',
        yourJourney: 'YOUR JOURNEY', pastResults: 'Previous results', noResultsYet: 'Your completed exams and scores will appear here.',
        welcomeBack: 'WELCOME BACK', readyForToday: 'Ready for today?', browseExams: 'Browse exams',
        examsCompleted: 'Exams completed', yourCompletedExams: 'Your completed exams', videosWatched: 'Videos watched',
        keepLearning: 'Keep learning at your pace', filesDownloaded: 'Files downloaded', resourcesForLater: 'Resources saved for later',
        studyStreak: 'Study streak', daysInARow: 'days in a row', whatsNext: "WHAT'S NEXT", upcomingExams: 'Upcoming exams',
        viewAll: 'View all →', noUpcomingExams: 'No upcoming exams yet.', freshlyAdded: 'FRESHLY ADDED',
        newVideos: 'New videos', noVideosYet: 'No videos have been added yet.', stayInTheLoop: 'STAY IN THE LOOP',
        updatesAndMessages: 'Updates & messages', openCommunity: 'Open community →', noNotifications: 'You’re all caught up.',
        watchAndLearn: 'WATCH & LEARN', videosIntro: 'Lessons and explainers, organized by subject.',
        resourceLibrary: 'RESOURCE LIBRARY', filesIntro: 'Browse, preview, and download books and study resources.',
        noFilesYet: 'No shared files are available yet.', filesSetupText: 'Study books and resources will appear here once they are added.',
        viewFile: 'Preview', downloadFile: 'Download',
        addVideo: 'Add video', videoTitle: 'Video title', youtubeTitleAuto: 'Fetched from YouTube', subject: 'Subject', youtubeUrl: 'YouTube link',
        videoLocalNotice: 'Only the platform owner can publish shared videos. Configure the backend and assign an owner account to enable content management.',
        saveVideo: 'Save video', cancel: 'Cancel', filterBySubject: 'Filter by subject', allSubjects: 'All subjects',
        fetchingVideoTitle: 'Getting the title from YouTube…', videoTitleLoaded: 'YouTube title loaded.',
        videoTitleUnavailable: 'Could not get this video title from YouTube. Check the link and try again.',
        edit: 'Edit', delete: 'Delete', confirmDeleteVideo: 'Delete this video?', confirmDeleteExam: 'Delete this exam?', confirmDeleteFile: 'Delete this file?',
        examJsonPlaceholder: 'Paste exam JSON here to create or edit an exam.',
        chooseFileOptional: 'Choose a file (optional when editing)', watchOnYoutube: 'Watch on YouTube',
        ownerOnly: 'Only the platform owner can add, edit, or delete shared content.',
        videosSetupText: 'YouTube lessons added by your study platform will appear here.',
        videoSavedLocal: 'Video saved on this device. Shared publishing requires backend setup.',
        invalidYoutube: 'Enter a valid YouTube video link.', answeredProgress: '{answered} of {total} answered',
        startExam: 'Start exam', questions: 'questions', noExams: 'No exams are available yet.',
        accountSetupRequired: 'Account service is not configured yet. Your account has not been created.',
        signIn: 'Sign in', noAccount: 'Need an account?', alreadyHaveAccountShort: 'Already registered?',
        newPassword: 'New password (optional)', saveChanges: 'Save changes', accountSettings: 'Account settings',
        accountCreated: 'Account created and signed in.', authRateLimit: 'Too many requests. Please wait a while before trying again.',
        invalidEmail: 'Enter a valid email address.',
        signInSuccess: 'Signed in successfully.', invalidCredentials: 'Email or password is incorrect.',
        accountExists: 'An account already exists for this email.', passwordTooShort: 'Use a password with at least 8 characters.',
        unexpectedError: 'Something went wrong. Please try again.', profileUpdated: 'Profile updated.',
        signInToChat: 'Sign in to join the chat', signInToChatNote: 'Sign in to read and send messages in the shared group.',
        cloudSynced: 'Synced across devices', signInToSync: 'Sign in to sync your progress', cloudSyncOn: 'Cloud sync is on',
        connected: 'Connected', noChatMessages: 'Be the first to start the conversation.',
        addEmoji: 'Add emoji', emojiPicker: 'Emoji picker',
        viewChatProfileFor: 'View {name}’s profile', profileLoading: 'Loading profile…',
        privateChatProfile: 'This learner keeps their profile private.', emptyChatProfileBio: 'No bio has been added.',
        chatProfileLoadFailed: 'Could not load this profile.', confirmDeleteChatMessage: 'Delete this message?',
        messageRequired: 'A message cannot be empty.', editMessagePlaceholder: 'Edit your message...',
        signInFirst: 'Sign in to join the shared group.', communityRespect: 'Keep the conversation kind and on topic.',
        adminOnly: 'Only platform admins can publish shared content.', chooseExamFile: 'Choose a valid exam JSON file.',
        invalidExamFile: 'Exam JSON must contain a title and valid multiple-choice questions.',
        examPublished: 'Exam published for all learners.', publishExam: 'Publish exam', examJson: 'Exam JSON',
        dueDate: 'Due date (optional)', addFile: 'Add file', fileTitle: 'File title', chooseFile: 'Choose a file',
        uploadFile: 'Upload file', fileDetailsRequired: 'Choose a file and enter its title.',
        unsupportedFileType: 'Use a PDF, text, Markdown, or image file.', fileUploaded: 'File shared with all learners.',
        videoPublished: 'Video published for all learners.', videoUpdated: 'Video updated.', examUpdated: 'Exam updated.', examDeleted: 'Exam deleted.',
        fileUpdated: 'File updated.', fileDeleted: 'File deleted.',
        tools: 'Tools', toolsIntro: 'Helpful study tools will live here.', toolsComingSoon: 'Tools are coming soon',
        toolsEmptyText: 'We’ll add useful learning tools here in a future update.',
        bio: 'Bio', bioPlaceholder: 'Tell other learners a little about yourself',
        profilePicture: 'Profile picture',
        fromTheOwner: 'FROM THE OWNER', announcements: 'Announcements', newAnnouncement: 'New announcement',
        announcementTitle: 'Announcement title', announcementMessage: 'Write an update for all learners...',
        publishAnnouncement: 'Publish', noAnnouncements: 'No announcements yet.',
        announcementPublished: 'Announcement published for all learners.',
        announcementDeleted: 'Announcement deleted.', announcementRequired: 'Enter a title and message.',
        confirmDeleteAnnouncement: 'Delete this announcement?',
        markAllRead: 'Mark all read', notificationsCount: '{count} unread notifications',
        notificationSettings: 'Notification settings', inAppNotifications: 'Show in-app notifications',
        chatNotifications: 'Community message alerts', announcementNotifications: 'Owner announcement alerts',
        privacySettings: 'Privacy', publicProfile: 'Share my bio with signed-in learners',
        privacyHint: 'Your email and password are never shown. Profile pictures are visible to signed-in chat members.',
        accountManagement: 'Account management', accountManagementHint: 'Change your password or sign out from your profile.',
        replayTutorial: 'Show the tutorial again', themeSwitchToDark: 'Dark mode', themeSwitchToLight: 'Light mode',
        avatarTooLarge: 'Profile pictures must be 2 MB or smaller.',
        invalidAvatarType: 'Choose a JPG, PNG, or WebP profile picture.',
        welcomeTitle: 'Welcome to Luma Study',
        welcomeDescription: 'Create an account to sync your learning between devices, or explore the study space first.',
        exploreFirst: 'Explore first', tutorialTitle: 'A quick tour',
        tutorialDashboard: 'Your dashboard brings together study progress, announcements, recent messages, and upcoming exams.',
        tutorialExams: 'Open Exams to take a quiz, review your results, and see upcoming exams.',
        tutorialResources: 'Use Videos for lessons and Files for shared books and study resources.',
        tutorialCommunity: 'Community is the shared chat. Your profile button is at the bottom of the sidebar; Tools is ready for future features.',
        tutorialSettings: 'Use the sun/moon button to change the theme. Settings includes language, notifications, privacy, and tutorial options.',
        skipTutorial: 'Skip tour', finishTutorial: 'Finish',
        disableEmailConfirmation: 'Email confirmation is still enabled in Supabase. Turn it off to sign users in immediately.'
    },
    ar: {
        metaDescription: 'لوما للدراسة — مساحة تعلم هادئة ومترابطة', mainNavigation: 'التنقل الرئيسي',
        closeVideo: 'إغلاق الفيديو', youtubePlayer: 'مشغل فيديو يوتيوب', closeFileViewer: 'إغلاق عارض الملفات', filePreview: 'معاينة الملف',
        closeSettings: 'إغلاق الإعدادات', closeWelcome: 'إغلاق', changeLanguage: 'تغيير اللغة', english: 'الإنجليزية', arabic: 'العربية',
        enableSound: 'تفعيل إشعارات الصوت', theme: 'المظهر:', light: 'فاتح', dark: 'داكن',
        madeWithLove: 'صُنع بكل ❤️ بواسطة',
        enterYourName: 'يرجى إدخال اسمك:', nameExample: 'مثال: أحمد محمد', startQuiz: 'ابدأ الاختبار',
        invalidQuizJson: 'تعذر تحميل الاختبار. تحقق من أن الملف المحدد بصيغة JSON صالحة للاختبارات.',
        enterName: 'يرجى إدخال اسمك.', reviewAnswers: 'مراجعة الإجابات', wrongAnswers: 'الإجابات الخاطئة:',
        savingExamResult: 'جارٍ حفظ نتيجتك…', examResultSaved: 'تم حفظ النتيجة في حسابك.',
        examResultSavedOnlineOnly: 'تم حفظ النتيجة في حسابك، لكن لم تُحفظ على هذا الجهاز.',
        examResultSavedLocally: 'تم حفظ النتيجة على هذا الجهاز. سجل الدخول لحفظها في حسابك.',
        examResultCloudSaveFailed: 'تم حفظ النتيجة على هذا الجهاز، لكن تعذرت المزامنة مع الحساب: {message}',
        examResultSaveFailed: 'تعذر حفظ النتيجة على هذا الجهاز أو في حسابك: {message}',
        localSaveFailed: 'تعذر حفظ النتيجة على هذا الجهاز.',
        yourAnswer: 'إجابتك', correctAnswer: 'الإجابة الصحيحة', noAnswer: 'لم يتم اختيار إجابة',
        noteContentRequired: 'لا يمكن أن يكون محتوى الملاحظة فارغاً.', noteSaved: 'تم حفظ الملاحظة!', confirmDeleteNote: 'هل تريد حذف هذه الملاحظة؟',
        subjectArabic: 'العربية', subjectEnglish: 'الإنجليزية', subjectHistory: 'التاريخ',
        quizTitle: 'الاختبار', questionPrompt: 'نص السؤال هنا', loadQuiz: 'تحميل اختبار',
        loadQuizJson: 'تحميل اختبار JSON', quizJsonFormat: 'تنسيق اختبار JSON',
        previous: 'السابق ←', next: '→ التالي', submitQuiz: 'إرسال الاختبار',
        quizResults: 'نتائج الاختبار', score: 'النتيجة', correct: 'صحيح',
        retakeQuiz: 'إعادة الاختبار', backToLoad: 'العودة إلى الاختبارات',
        workspace: 'مساحة العمل', dashboard: 'لوحة التحكم', community: 'المجتمع', videos: 'الفيديوهات', exams: 'الاختبارات', files: 'الملفات', profile: 'الملف الشخصي', settings: 'الإعدادات', language: 'اللغة:',
        detailedProgress: 'تفاصيل تقدم الدراسة والبيانات',
        guest: 'متعلم زائر', localProgress: 'التقدم محفوظ على هذا الجهاز', learningSpace: 'مساحة التعلم الخاصة بك',
        dashboardIntro: 'تابع تعلمك بوضوح وفي مساحة هادئة واحدة.', globalRoom: 'الغرفة العامة',
        communityIntro: 'اطرح سؤالاً وشارك فكرة وتعلم مع الآخرين.', everyoneTogether: 'الجميع معاً',
        studyCommunity: 'مجتمع الدراسة', oneSharedRoom: 'غرفة واحدة لجميع المتعلمين', setupRequired: 'الإعداد مطلوب',
        communityReadyTitle: 'مجتمع الدراسة جاهز', communitySetupText: 'اربط حساباً وقاعدة بيانات مشتركة لتفعيل الرسائل المباشرة للجميع.',
        setUpAccount: 'إعداد حساب', writeMessage: 'اكتب رسالة...', send: 'إرسال',
        communitySetupNote: 'المحادثة المباشرة غير متاحة حتى إعداد بيانات الخادم المشترك.',
        yourAccount: 'حسابك', profileIntro: 'أدر حسابك واحتفظ بتقدمك متزامناً.',
        notSignedIn: 'لم يتم تسجيل الدخول', deviceOnly: 'الحفظ على هذا الجهاز فقط', cloudSync: 'المزامنة السحابية',
        createAccount: 'أنشئ حسابك', alreadyHaveAccount: 'لدي حساب بالفعل',
        backendSetupNeeded: 'يلزم إعداد الخادم', backendSetupDescription: 'لتفعيل تسجيل الدخول الآمن والمزامنة بين الأجهزة، أنشئ مشروع Supabase وأضف رابط المشروع والمفتاح العام المجهول. لا تضع مفتاح الخدمة السري في الموقع.',
        name: 'الاسم', email: 'البريد الإلكتروني', password: 'كلمة المرور', signOut: 'تسجيل الخروج',
        knowledgeCheck: 'اختبر معلوماتك', examIntro: 'اختر اختباراً وأجب عن الأسئلة واحداً تلو الآخر.',
        yourJourney: 'رحلتك', pastResults: 'النتائج السابقة', noResultsYet: 'ستظهر هنا الاختبارات المكتملة ودرجاتك.',
        welcomeBack: 'مرحباً بعودتك', readyForToday: 'هل أنت مستعد لليوم؟', browseExams: 'تصفح الاختبارات',
        examsCompleted: 'الاختبارات المكتملة', yourCompletedExams: 'اختباراتك المكتملة', videosWatched: 'الفيديوهات المشاهدة',
        keepLearning: 'واصل التعلم بالوتيرة المناسبة لك', filesDownloaded: 'الملفات المنزلة', resourcesForLater: 'مصادر محفوظة لاحقاً',
        studyStreak: 'سلسلة الدراسة', daysInARow: 'أيام متتالية', whatsNext: 'ماذا بعد؟', upcomingExams: 'الاختبارات القادمة',
        viewAll: 'عرض الكل ←', noUpcomingExams: 'لا توجد اختبارات قادمة حالياً.', freshlyAdded: 'أضيفت حديثاً',
        newVideos: 'فيديوهات جديدة', noVideosYet: 'لم تتم إضافة فيديوهات بعد.', stayInTheLoop: 'ابق على اطلاع',
        updatesAndMessages: 'التحديثات والرسائل', openCommunity: 'افتح المجتمع ←', noNotifications: 'أنت على اطلاع بكل شيء.',
        watchAndLearn: 'شاهد وتعلم', videosIntro: 'دروس وشروحات مرتبة حسب المادة.',
        resourceLibrary: 'مكتبة المصادر', filesIntro: 'تصفح الكتب ومصادر الدراسة واعرضها أو نزّلها.',
        noFilesYet: 'لا توجد ملفات مشتركة حالياً.', filesSetupText: 'ستظهر كتب الدراسة والمصادر هنا عند إضافتها.',
        viewFile: 'معاينة', downloadFile: 'تنزيل',
        addVideo: 'إضافة فيديو', videoTitle: 'عنوان الفيديو', youtubeTitleAuto: 'يُجلب من يوتيوب', subject: 'المادة', youtubeUrl: 'رابط يوتيوب',
        videoLocalNotice: 'مالك المنصة وحده يستطيع نشر الفيديوهات المشتركة. أعد إعداد الخادم وعيّن حساباً للمالك لتفعيل إدارة المحتوى.',
        saveVideo: 'حفظ الفيديو', cancel: 'إلغاء', filterBySubject: 'تصفية حسب المادة', allSubjects: 'كل المواد',
        fetchingVideoTitle: 'جارٍ جلب العنوان من يوتيوب…', videoTitleLoaded: 'تم جلب عنوان الفيديو من يوتيوب.',
        videoTitleUnavailable: 'تعذر جلب عنوان الفيديو من يوتيوب. تحقق من الرابط وحاول مرة أخرى.',
        edit: 'تعديل', delete: 'حذف', confirmDeleteVideo: 'هل تريد حذف هذا الفيديو؟', confirmDeleteExam: 'هل تريد حذف هذا الاختبار؟', confirmDeleteFile: 'هل تريد حذف هذا الملف؟',
        examJsonPlaceholder: 'الصق بيانات الاختبار بصيغة JSON لإنشاء اختبار أو تعديله.',
        chooseFileOptional: 'اختر ملفاً (اختياري عند التعديل)', watchOnYoutube: 'شاهد على يوتيوب',
        ownerOnly: 'مالك المنصة وحده يستطيع إضافة المحتوى المشترك أو تعديله أو حذفه.',
        videosSetupText: 'ستظهر هنا دروس يوتيوب التي تضيفها منصة الدراسة.',
        videoSavedLocal: 'تم حفظ الفيديو على هذا الجهاز. النشر المشترك يتطلب إعداد الخادم.',
        invalidYoutube: 'أدخل رابط فيديو يوتيوب صالحاً.', answeredProgress: 'تمت الإجابة عن {answered} من {total}',
        startExam: 'ابدأ الاختبار', questions: 'أسئلة', noExams: 'لا توجد اختبارات متاحة حالياً.',
        accountSetupRequired: 'خدمة الحساب غير مُعدة بعد. لم يتم إنشاء حسابك.',
        signIn: 'تسجيل الدخول', noAccount: 'تحتاج إلى حساب؟', alreadyHaveAccountShort: 'لديك حساب بالفعل؟',
        newPassword: 'كلمة مرور جديدة (اختياري)', saveChanges: 'حفظ التغييرات', accountSettings: 'إعدادات الحساب',
        accountCreated: 'تم إنشاء الحساب وتسجيل الدخول.', authRateLimit: 'طلبات كثيرة. انتظر قليلاً قبل المحاولة مجدداً.',
        invalidEmail: 'أدخل بريداً إلكترونياً صالحاً.',
        signInSuccess: 'تم تسجيل الدخول بنجاح.', invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
        accountExists: 'يوجد حساب مسجل بهذا البريد الإلكتروني.', passwordTooShort: 'استخدم كلمة مرور من 8 أحرف على الأقل.',
        unexpectedError: 'حدث خطأ. حاول مرة أخرى.', profileUpdated: 'تم تحديث الملف الشخصي.',
        signInToChat: 'سجل الدخول للانضمام إلى المحادثة', signInToChatNote: 'سجل الدخول لقراءة الرسائل وإرسالها في المجموعة.',
        cloudSynced: 'متزامن بين الأجهزة', signInToSync: 'سجل الدخول لمزامنة تقدمك', cloudSyncOn: 'المزامنة السحابية مفعلة',
        connected: 'متصل', noChatMessages: 'ابدأ المحادثة وكن أول من يرسل رسالة.',
        addEmoji: 'إضافة رمز تعبيري', emojiPicker: 'اختيار رمز تعبيري',
        viewChatProfileFor: 'عرض الملف الشخصي لـ{name}', profileLoading: 'جارٍ تحميل الملف الشخصي…',
        privateChatProfile: 'هذا المتعلم يحتفظ بملفه الشخصي خاصاً.', emptyChatProfileBio: 'لم تتم إضافة نبذة.',
        chatProfileLoadFailed: 'تعذر تحميل هذا الملف الشخصي.', confirmDeleteChatMessage: 'هل تريد حذف هذه الرسالة؟',
        messageRequired: 'لا يمكن أن تكون الرسالة فارغة.', editMessagePlaceholder: 'عدّل رسالتك...',
        signInFirst: 'سجل الدخول للانضمام إلى المجموعة.', communityRespect: 'يرجى الحفاظ على حوار لطيف ومرتبط بالدراسة.',
        adminOnly: 'يمكن لمسؤولي المنصة فقط نشر المحتوى المشترك.', chooseExamFile: 'اختر ملف JSON صالحاً للاختبار.',
        invalidExamFile: 'يجب أن يحتوي JSON على عنوان وأسئلة اختيار من متعدد صالحة.',
        examPublished: 'تم نشر الاختبار لجميع المتعلمين.', publishExam: 'نشر الاختبار', examJson: 'ملف JSON للاختبار',
        dueDate: 'موعد الاختبار (اختياري)', addFile: 'إضافة ملف', fileTitle: 'عنوان الملف', chooseFile: 'اختر ملفاً',
        uploadFile: 'رفع الملف', fileDetailsRequired: 'اختر ملفاً وأدخل عنوانه.',
        unsupportedFileType: 'استخدم PDF أو ملفاً نصياً أو Markdown أو صورة.', fileUploaded: 'تمت مشاركة الملف مع جميع المتعلمين.',
        videoPublished: 'تم نشر الفيديو لجميع المتعلمين.', videoUpdated: 'تم تحديث الفيديو.', examUpdated: 'تم تحديث الاختبار.', examDeleted: 'تم حذف الاختبار.',
        fileUpdated: 'تم تحديث الملف.', fileDeleted: 'تم حذف الملف.',
        tools: 'الأدوات', toolsIntro: 'ستتوفر أدوات الدراسة المفيدة هنا.', toolsComingSoon: 'الأدوات قادمة قريباً',
        toolsEmptyText: 'سنضيف أدوات تعليمية مفيدة هنا في تحديث مستقبلي.',
        bio: 'نبذة', bioPlaceholder: 'أخبر المتعلمين قليلاً عن نفسك',
        profilePicture: 'الصورة الشخصية',
        fromTheOwner: 'من مالك المنصة', announcements: 'الإعلانات', newAnnouncement: 'إعلان جديد',
        announcementTitle: 'عنوان الإعلان', announcementMessage: 'اكتب تحديثاً لجميع المتعلمين...',
        publishAnnouncement: 'نشر', noAnnouncements: 'لا توجد إعلانات بعد.',
        announcementPublished: 'تم نشر الإعلان لجميع المتعلمين.',
        announcementDeleted: 'تم حذف الإعلان.', announcementRequired: 'أدخل عنواناً ورسالة.',
        confirmDeleteAnnouncement: 'هل تريد حذف هذا الإعلان؟',
        markAllRead: 'تحديد الكل كمقروء', notificationsCount: '{count} إشعار غير مقروء',
        notificationSettings: 'إعدادات الإشعارات', inAppNotifications: 'عرض الإشعارات داخل الموقع',
        chatNotifications: 'تنبيهات رسائل المجتمع', announcementNotifications: 'تنبيهات إعلانات المالك',
        privacySettings: 'الخصوصية', publicProfile: 'مشاركة نبذتي مع المتعلمين المسجلين',
        privacyHint: 'لن يظهر بريدك الإلكتروني أو كلمة مرورك. تظهر الصور الشخصية لأعضاء المحادثة المسجلين.',
        accountManagement: 'إدارة الحساب', accountManagementHint: 'غيّر كلمة المرور أو سجّل الخروج من ملفك الشخصي.',
        replayTutorial: 'عرض الشرح مرة أخرى', themeSwitchToDark: 'الوضع الداكن', themeSwitchToLight: 'الوضع الفاتح',
        avatarTooLarge: 'يجب ألا يتجاوز حجم الصورة الشخصية 2 ميغابايت.',
        invalidAvatarType: 'اختر صورة بصيغة JPG أو PNG أو WebP.',
        welcomeTitle: 'مرحباً بك في لوما للدراسة',
        welcomeDescription: 'أنشئ حساباً لمزامنة تعلمك بين الأجهزة، أو استكشف مساحة الدراسة أولاً.',
        exploreFirst: 'استكشف أولاً', tutorialTitle: 'جولة سريعة',
        tutorialDashboard: 'تجمع لوحة التحكم تقدمك الدراسي والإعلانات والرسائل الحديثة والاختبارات القادمة.',
        tutorialExams: 'افتح الاختبارات لأداء الاختبارات ومراجعة النتائج والاطلاع على المواعيد القادمة.',
        tutorialResources: 'استخدم الفيديوهات للدروس والملفات للكتب ومصادر الدراسة المشتركة.',
        tutorialCommunity: 'المجتمع هو المحادثة المشتركة. زر ملفك الشخصي أسفل القائمة الجانبية، والأدوات جاهزة للميزات المستقبلية.',
        tutorialSettings: 'استخدم زر الشمس والقمر لتغيير المظهر. تتضمن الإعدادات اللغة والإشعارات والخصوصية وخيارات الشرح.',
        skipTutorial: 'تخطي الجولة', finishTutorial: 'إنهاء',
        disableEmailConfirmation: 'لا يزال تأكيد البريد مفعلاً في Supabase. أوقفه لتسجيل دخول المستخدمين فوراً.'
    }
};

function updateLanguageUI(lang) {
    const t = LANGUAGES[lang] || LANGUAGES.en;
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) languageSelect.value = lang;
    // Header
    const h1 = document.querySelector('.site-title');
    if (h1) h1.textContent = 'Luma Study';
    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels[0]) statLabels[0].textContent = t.totalStudied;
    if (statLabels[1]) statLabels[1].textContent = t.dailyStreak;
    // Tabs
    document.querySelectorAll('.tab-btn [data-i18n]').forEach(label => {
        const key = label.dataset.i18n;
        if (PORTAL_TRANSLATIONS[lang]?.[key]) label.textContent = PORTAL_TRANSLATIONS[lang][key];
    });
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
    const quizFormatHelpSummary = document.querySelector('.quiz-format-help summary [data-i18n="quizJsonFormat"]');
    if (quizFormatHelpSummary) quizFormatHelpSummary.textContent = t.quizJsonFormat;
    const quizTitle = document.getElementById('quizTitle');
    if (quizTitle && !window.quizEngine?.currentQuiz) quizTitle.textContent = t.quizTitle;
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
    // Timer label (dynamic)
    const timerLabel = document.getElementById('timerLabel');
    if (timerLabel) {
        timerLabel.textContent = timerLabel.textContent.includes('Work') || timerLabel.textContent.includes('العمل') ? t.workTime : t.breakTime;
    }
    // RTL support
    if (lang === 'ar') {
        document.documentElement.lang = 'ar';
        document.documentElement.setAttribute('dir', 'rtl');
        document.body.style.textAlign = 'right';
    } else {
        document.documentElement.lang = 'en';
        document.documentElement.setAttribute('dir', 'ltr');
        document.body.style.textAlign = '';
    }
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const translation = PORTAL_TRANSLATIONS[lang]?.[element.dataset.i18n];
        if (translation) element.textContent = translation;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const translation = PORTAL_TRANSLATIONS[lang]?.[element.dataset.i18nPlaceholder];
        if (translation) element.placeholder = translation;
    });
    document.querySelectorAll('[data-i18n-title], [data-i18n-aria-label], [data-i18n-content]').forEach(element => {
        [
            ['title', element.dataset.i18nTitle],
            ['aria-label', element.dataset.i18nAriaLabel],
            ['content', element.dataset.i18nContent]
        ].forEach(([attribute, key]) => {
            const translation = PORTAL_TRANSLATIONS[lang]?.[key];
            if (!translation) return;
            if (attribute === 'content') element.setAttribute('content', translation);
            else element.setAttribute(attribute, translation);
        });
    });
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab || 'dashboard';
    if (window.PortalUI) {
        PortalUI.setPage(activeTab);
        PortalUI.refreshDynamicLabels();
        PortalUI.updateDate();
        PortalUI.populateSubjects();
        PortalUI.renderVideos();
        PortalUI.renderExams();
        PortalUI.renderExamResults();
        PortalUI.updateDashboard();
        PortalUI.renderAnnouncements();
        PortalUI.renderNotifications(PortalBackend.chatMessages || []);
        PortalUI.syncProfileDisplay();
        FilesManager.render();
    }
    window.subjectsManager?.renderSubjectsList();
    if (window.quizEngine?.currentQuiz && !document.getElementById('quizSession').classList.contains('hidden')) {
        window.quizEngine.displayQuestion();
    } else if (window.quizEngine?.currentQuiz
        && window.quizEngine.lastResult
        && !document.getElementById('quizResults').classList.contains('hidden')) {
        window.quizEngine.displayResults(
            window.quizEngine.lastResult.correctCount,
            window.quizEngine.lastResult.wrongAnswers,
            window.quizEngine.lastResult.score
        );
    }
}

window.PortalUI = {
    storage: null,
    videos: [],
    exams: [],
    announcements: [],
    notificationEntries: [],
    announcementToastTimers: new Map(),
    hasReceivedAnnouncements: false,
    avatarPreviewUrl: null,
    currentTab: 'dashboard',
    authMode: 'signup',
    editingVideoId: null,
    editingExamId: null,
    editingFile: null,
    tutorialStep: 0,
    tutorialActive: false,
    lastTutorialUserId: null,
    lastSessionUserId: null,
    chatEditingMessageId: null,
    chatSavingMessageId: null,
    chatNeedsInitialScroll: false,
    chatProfileTrigger: null,
    chatProfileRequestId: 0,

    subjectName(subject) {
        const key = {
            Arabic: 'subjectArabic',
            English: 'subjectEnglish',
            History: 'subjectHistory'
        }[subject];
        return key ? this.text(key) : subject;
    },

    text(key, values = {}) {
        let value = PORTAL_TRANSLATIONS[this.storage?.get('language', 'ar') || 'ar']?.[key]
            || PORTAL_TRANSLATIONS.en[key]
            || key;
        Object.entries(values).forEach(([name, replacement]) => {
            value = value.replace(`{${name}}`, replacement);
        });
        return value;
    },

    showFormMessage(element, message, type = '') {
        if (!element) return;
        element.textContent = message;
        element.classList.toggle('success', type === 'success');
        element.classList.toggle('error', type === 'error');
    },

    applyTheme(theme, storage = this.storage, persist = true) {
        const selectedTheme = theme === 'dark' ? 'dark' : 'light';
        document.body.classList.toggle('dark-theme', selectedTheme === 'dark');
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = selectedTheme;
        if (persist && storage) {
            const settings = storage.get('settings', {});
            settings.theme = selectedTheme;
            storage.set('settings', settings);
        }
        const icon = document.getElementById('themeToggleIcon');
        const label = document.getElementById('themeToggleLabel');
        const button = document.getElementById('themeToggle');
        const switchingToDark = selectedTheme === 'light';
        if (icon) icon.textContent = switchingToDark ? '☾' : '☀';
        if (label) label.textContent = this.text(switchingToDark ? 'themeSwitchToDark' : 'themeSwitchToLight');
        if (button) {
            button.setAttribute('aria-pressed', String(selectedTheme === 'dark'));
            button.setAttribute('aria-label', this.text(switchingToDark ? 'themeSwitchToDark' : 'themeSwitchToLight'));
        }
    },

    bindOnboarding() {
        const welcomeModal = document.getElementById('welcomeModal');
        const tutorialModal = document.getElementById('tutorialModal');
        const dismissWelcome = () => {
            welcomeModal.classList.add('hidden');
            localStorage.setItem('lumaWelcomeSeen', 'true');
        };
        document.getElementById('closeWelcome').addEventListener('click', dismissWelcome);
        document.getElementById('welcomeExplore').addEventListener('click', dismissWelcome);
        document.getElementById('welcomeCreateAccount').addEventListener('click', () => {
            dismissWelcome();
            document.querySelector('.tab-btn[data-tab="profile"]')?.click();
            document.getElementById('profileName').focus();
        });
        document.getElementById('closeTutorial').addEventListener('click', () => this.finishTutorial());
        document.getElementById('tutorialSkip').addEventListener('click', () => this.finishTutorial());
        document.getElementById('tutorialPrevious').addEventListener('click', () => {
            this.tutorialStep = Math.max(0, this.tutorialStep - 1);
            this.renderTutorialStep();
        });
        document.getElementById('tutorialNext').addEventListener('click', () => {
            if (this.tutorialStep >= 4) {
                this.finishTutorial();
                return;
            }
            this.tutorialStep += 1;
            this.renderTutorialStep();
        });
        [welcomeModal, tutorialModal].forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target !== modal) return;
                if (modal === welcomeModal) dismissWelcome();
                else this.finishTutorial();
            });
        });
    },

    startTutorial(force = false) {
        if (!force && this.storage.get('tutorialCompleted', false)) return;
        this.tutorialStep = 0;
        this.tutorialActive = true;
        document.getElementById('tutorialModal').classList.remove('hidden');
        this.renderTutorialStep();
    },

    renderTutorialStep() {
        const keys = [
            'tutorialDashboard',
            'tutorialExams',
            'tutorialResources',
            'tutorialCommunity',
            'tutorialSettings'
        ];
        document.getElementById('tutorialStepText').textContent = this.text(keys[this.tutorialStep]);
        document.getElementById('tutorialProgress').textContent = `${this.tutorialStep + 1} / ${keys.length}`;
        document.getElementById('tutorialPrevious').disabled = this.tutorialStep === 0;
        document.getElementById('tutorialNext').textContent = this.text(
            this.tutorialStep === keys.length - 1 ? 'finishTutorial' : 'next'
        );
    },

    finishTutorial() {
        document.getElementById('tutorialModal').classList.add('hidden');
        this.tutorialActive = false;
        if (PortalBackend.user) this.storage.set('tutorialCompleted', true);
    },

    showWelcomeIfNeeded() {
        if (!PortalBackend.user && localStorage.getItem('lumaWelcomeSeen') !== 'true') {
            document.getElementById('welcomeModal').classList.remove('hidden');
        }
    },

    refreshDynamicLabels() {
        const user = PortalBackend.user;
        const configured = PortalBackend.configured;
        document.getElementById('chatConnection').textContent =
            this.text(user ? 'connected' : (configured ? 'signInToChat' : 'setupRequired'));
        document.querySelector('.chat-note').textContent = this.text(
            user ? 'communityRespect' : (configured ? 'signInToChatNote' : 'communitySetupNote')
        );
        document.getElementById('sidebarAccountState').textContent = this.text(
            user ? 'cloudSynced' : (configured ? 'signInToSync' : 'localProgress')
        );
        document.querySelector('#syncStatus > span:last-child').textContent = this.text(
            user ? 'cloudSyncOn' : (configured ? 'signInToSync' : 'deviceOnly')
        );
        document.getElementById('authHeading').textContent = this.text(
            user ? 'accountSettings' : (this.authMode === 'signup' ? 'createAccount' : 'signIn')
        );
        this.applyTheme(this.storage.get('settings', {}).theme || 'dark', this.storage, false);
        if (!user) {
            document.getElementById('authSubmit').textContent = this.text(
                this.authMode === 'signup' ? 'createAccount' : 'signIn'
            );
            document.getElementById('authModeToggle').textContent = this.text(
                this.authMode === 'signup' ? 'alreadyHaveAccount' : 'noAccount'
            );
        }
        document.getElementById('showVideoForm').textContent = this.text('addVideo');
        document.getElementById('saveVideoButton').textContent = this.text(this.editingVideoId ? 'saveChanges' : 'saveVideo');
        document.getElementById('showExamForm').textContent = this.text('publishExam');
        document.getElementById('publishExamButton').textContent = this.text(this.editingExamId ? 'saveChanges' : 'publishExam');
        document.getElementById('showFileForm').textContent = this.text('addFile');
        document.getElementById('uploadSharedFile').textContent = this.text(this.editingFile ? 'saveChanges' : 'uploadFile');
    },

    init(storage) {
        this.storage = storage;
        this.videos = this.storage.get('videos', []);
        this.exams = this.storage.get('exams', []);
        this.bindVideoControls();
        this.bindContentManagement();
        this.bindProfileForm();
        this.bindAnnouncements();
        this.bindChat();
        this.bindOnboarding();
        this.bindVideoModal();
        this.bindFileModal();
        this.populateSubjects();
        this.renderVideos();
        this.renderExams();
        this.renderExamResults();
        this.updateDashboard();
        this.setPage('dashboard');
        this.updateDate();
        this.syncProfileDisplay();
        this.renderAnnouncements();
        this.renderNotifications([]);
        document.getElementById('notificationToggle')?.addEventListener('click', () => {
            this.markNotificationsRead();
            document.querySelector('.tab-btn[data-tab="dashboard"]')?.click();
            window.setTimeout(() => {
                document.getElementById('notificationsPanel').scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 0);
        });
        document.getElementById('markNotificationsRead')?.addEventListener('click', () => this.markNotificationsRead());
        document.getElementById('videoSubjectFilter')?.addEventListener('change', () => this.renderVideos());
        window.PortalBackend.init(this, storage);
    },

    setPage(tab) {
        this.currentTab = tab;
        if (tab === 'community' && this.chatNeedsInitialScroll) {
            window.requestAnimationFrame(() => {
                if (this.currentTab !== 'community' || !this.chatNeedsInitialScroll) return;
                const container = document.getElementById('chatMessages');
                container.scrollTop = container.scrollHeight;
                this.chatNeedsInitialScroll = false;
            });
        }
        const pageTitle = document.getElementById('pageTitle');
        const pageDescription = document.getElementById('pageDescription');
        const titleKey = tab === 'dashboard' ? 'dashboard' : tab;
        const descriptionKeys = {
            dashboard: 'dashboardIntro',
            community: 'communityIntro',
            videos: 'videosIntro',
            exams: 'examIntro',
            files: 'filesIntro',
            profile: 'profileIntro',
            tools: 'toolsIntro'
        };
        if (pageTitle) pageTitle.textContent = this.text(titleKey);
        if (pageDescription) pageDescription.textContent = this.text(descriptionKeys[tab] || 'dashboardIntro');
    },

    updateDate() {
        const node = document.getElementById('todayLabel');
        if (!node) return;
        const lang = this.storage.get('language', 'ar');
        node.textContent = new Intl.DateTimeFormat(lang === 'ar' ? 'ar' : 'en', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }).format(new Date());
    },

    populateSubjects() {
        const subjects = this.storage.get('subjects', DEFAULT_SUBJECTS);
        ['videoSubjectInput', 'videoSubjectFilter', 'fileSubjectInput'].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            const previous = select.value;
            const allOption = id === 'videoSubjectFilter';
            select.replaceChildren();
            if (allOption) {
                const option = document.createElement('option');
                option.value = 'all';
                option.textContent = this.text('allSubjects');
                select.appendChild(option);
            }
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject;
                option.textContent = this.subjectName(subject);
                select.appendChild(option);
            });
            if ([...select.options].some(option => option.value === previous)) select.value = previous;
        });
    },

    createAdminButton(labelKey, handler) {
        const button = document.createElement('button');
        button.className = 'btn btn-secondary admin-item-button';
        button.type = 'button';
        button.textContent = this.text(labelKey);
        button.addEventListener('click', handler);
        return button;
    },

    selectSubject(select, subject) {
        if (![...select.options].some(option => option.value === subject)) {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            select.appendChild(option);
        }
        select.value = subject;
    },

    bindVideoControls() {
        const form = document.getElementById('videoAdminForm');
        document.getElementById('showVideoForm')?.addEventListener('click', () => {
            this.clearVideoForm();
            form?.classList.remove('hidden');
            document.getElementById('videoTitleInput')?.focus();
        });
        document.getElementById('cancelVideoButton')?.addEventListener('click', () => {
            form?.classList.add('hidden');
            this.clearVideoForm();
        });
        document.getElementById('saveVideoButton')?.addEventListener('click', () => this.saveVideo());
        document.getElementById('videoUrlInput')?.addEventListener('change', () => this.loadVideoTitle());
        document.getElementById('videoUrlInput')?.addEventListener('keydown', event => {
            if (event.key === 'Enter') this.saveVideo();
        });
    },

    bindContentManagement() {
        const examForm = document.getElementById('examAdminForm');
        const fileForm = document.getElementById('fileAdminForm');
        document.getElementById('showExamForm')?.addEventListener('click', () => this.openNewExamForm());
        document.getElementById('cancelExamButton')?.addEventListener('click', () => this.closeExamForm());
        document.getElementById('publishExamButton')?.addEventListener('click', () => this.publishExam());
        document.getElementById('examJsonInput')?.addEventListener('change', async event => {
            const file = event.target.files[0];
            if (file) document.getElementById('examJsonText').value = await file.text();
        });
        document.getElementById('showFileForm')?.addEventListener('click', () => this.openNewFileForm());
        document.getElementById('cancelFileForm')?.addEventListener('click', () => this.closeFileForm());
        document.getElementById('uploadSharedFile')?.addEventListener('click', () => this.uploadSharedFile());
    },

    openNewExamForm() {
        this.editingExamId = null;
        document.getElementById('examAdminForm').classList.remove('hidden');
        document.getElementById('examJsonInput').value = '';
        document.getElementById('examJsonText').value = '';
        document.getElementById('examDueDateInput').value = '';
        document.getElementById('publishExamButton').textContent = this.text('publishExam');
        document.getElementById('examFormMessage').textContent = '';
    },

    closeExamForm() {
        this.editingExamId = null;
        document.getElementById('examAdminForm').classList.add('hidden');
        document.getElementById('examJsonInput').value = '';
        document.getElementById('examJsonText').value = '';
        document.getElementById('examDueDateInput').value = '';
        document.getElementById('publishExamButton').textContent = this.text('publishExam');
    },

    openNewFileForm() {
        this.editingFile = null;
        document.getElementById('fileAdminForm').classList.remove('hidden');
        document.getElementById('fileTitleInput').value = '';
        document.getElementById('fileSubjectInput').selectedIndex = 0;
        document.getElementById('sharedFileInput').value = '';
        document.getElementById('uploadSharedFile').textContent = this.text('uploadFile');
        document.getElementById('fileFormMessage').textContent = '';
    },

    closeFileForm() {
        this.editingFile = null;
        document.getElementById('fileAdminForm').classList.add('hidden');
        document.getElementById('fileTitleInput').value = '';
        document.getElementById('sharedFileInput').value = '';
        document.getElementById('uploadSharedFile').textContent = this.text('uploadFile');
    },

    async publishExam() {
        const message = document.getElementById('examFormMessage');
        const file = document.getElementById('examJsonInput').files[0];
        const jsonText = document.getElementById('examJsonText').value.trim() || (file ? await file.text() : '');
        if (!PortalBackend.configured || !PortalBackend.isAdmin()) {
            message.textContent = this.text('ownerOnly');
            return;
        }
        if (!jsonText) {
            message.textContent = this.text('chooseExamFile');
            return;
        }
        try {
            const exam = JSON.parse(jsonText);
            if (!window.quizEngine.isValidQuiz(exam)) {
                throw new Error(this.text('invalidExamFile'));
            }
            const dueValue = document.getElementById('examDueDateInput').value;
            exam.subject = exam.subject || document.getElementById('quizSubject').value || DEFAULT_SUBJECTS[0];
            exam.dueDate = dueValue ? new Date(dueValue).toISOString() : null;
            const editing = Boolean(this.editingExamId);
            const published = editing
                ? await PortalBackend.updateExam(this.editingExamId, exam)
                : await PortalBackend.publishExam(exam);
            this.exams = [published, ...this.exams.filter(existing => existing.id !== published.id)];
            this.renderExams();
            this.updateDashboard();
            this.closeExamForm();
            message.textContent = this.text(editing ? 'examUpdated' : 'examPublished');
        } catch (error) {
            message.textContent = error.message;
            console.error('Exam publishing failed:', error);
        }
    },

    editExam(exam) {
        this.editingExamId = exam.id;
        document.getElementById('examAdminForm').classList.remove('hidden');
        document.getElementById('examJsonInput').value = '';
        document.getElementById('examJsonText').value = JSON.stringify({
            title: exam.title,
            description: exam.description || '',
            questions: exam.questions
        }, null, 2);
        document.getElementById('examDueDateInput').value = exam.dueDate
            ? new Date(new Date(exam.dueDate).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
            : '';
        const subjectSelect = document.getElementById('quizSubject');
        this.selectSubject(subjectSelect, exam.subject || DEFAULT_SUBJECTS[0]);
        document.getElementById('publishExamButton').textContent = this.text('saveChanges');
        document.getElementById('examFormMessage').textContent = '';
        document.getElementById('examJsonText').focus();
    },

    async deleteExam(exam) {
        if (!window.confirm(this.text('confirmDeleteExam'))) return;
        try {
            await PortalBackend.deleteExam(exam.id);
            this.exams = this.exams.filter(item => item.id !== exam.id);
            this.renderExams();
            this.updateDashboard();
        } catch (error) {
            this.showBackendError(error.message);
            console.error('Exam deletion failed:', error);
        }
    },

    async uploadSharedFile() {
        const message = document.getElementById('fileFormMessage');
        const file = document.getElementById('sharedFileInput').files[0];
        const title = document.getElementById('fileTitleInput').value.trim();
        const editing = this.editingFile;
        const allowedTypes = new Set([
            'application/pdf', 'text/plain', 'text/markdown',
            'image/png', 'image/jpeg', 'image/gif'
        ]);
        if (!PortalBackend.configured || !PortalBackend.isAdmin()) {
            message.textContent = this.text('ownerOnly');
            return;
        }
        if ((!file && !editing) || !title) {
            message.textContent = this.text('fileDetailsRequired');
            return;
        }
        if (file && !allowedTypes.has(file.type)) {
            message.textContent = this.text('unsupportedFileType');
            return;
        }
        const button = document.getElementById('uploadSharedFile');
        button.disabled = true;
        try {
            const subject = document.getElementById('fileSubjectInput').value;
            if (editing) {
                await PortalBackend.updateFile(editing.id, { file, subject, title });
            } else {
                await PortalBackend.uploadFile(file, subject, title);
            }
            this.closeFileForm();
            message.textContent = this.text(editing ? 'fileUpdated' : 'fileUploaded');
        } catch (error) {
            message.textContent = error.message;
            console.error('File upload failed:', error);
        } finally {
            button.disabled = false;
        }
    },

    editFile(file) {
        this.editingFile = file;
        document.getElementById('fileAdminForm').classList.remove('hidden');
        document.getElementById('fileTitleInput').value = file.name;
        this.selectSubject(document.getElementById('fileSubjectInput'), file.subject || DEFAULT_SUBJECTS[0]);
        document.getElementById('sharedFileInput').value = '';
        document.getElementById('uploadSharedFile').textContent = this.text('saveChanges');
        document.getElementById('fileFormMessage').textContent = '';
        document.getElementById('fileTitleInput').focus();
    },

    async deleteFile(file) {
        if (!window.confirm(this.text('confirmDeleteFile'))) return;
        try {
            await PortalBackend.deleteFile(file.id);
        } catch (error) {
            this.showBackendError(error.message);
            console.error('File deletion failed:', error);
        }
    },

    youtubeId(value) {
        try {
            const url = new URL(value);
            if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname)) return null;
            const id = url.hostname.includes('youtu.be')
                ? url.pathname.slice(1).split('/')[0]
                : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
            return id && /^[\w-]{11}$/.test(id) ? id : null;
        } catch {
            return null;
        }
    },

    async fetchYouTubeTitle(videoId) {
        const videoUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
        const endpoint = new URL('https://www.youtube.com/oembed');
        endpoint.searchParams.set('url', videoUrl);
        endpoint.searchParams.set('format', 'json');
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(endpoint, { signal: controller.signal });
            if (!response.ok) throw new Error(`YouTube title lookup failed (${response.status}).`);
            const metadata = await response.json();
            const title = typeof metadata.title === 'string' ? metadata.title.trim() : '';
            if (!title) throw new Error('YouTube did not return a video title.');
            return title;
        } finally {
            window.clearTimeout(timeout);
        }
    },

    async loadVideoTitle() {
        const url = document.getElementById('videoUrlInput').value.trim();
        const videoId = this.youtubeId(url);
        const titleInput = document.getElementById('videoTitleInput');
        const message = document.getElementById('videoFormMessage');
        titleInput.value = '';
        if (!videoId) return;
        message.textContent = this.text('fetchingVideoTitle');
        try {
            titleInput.value = await this.fetchYouTubeTitle(videoId);
            message.textContent = this.text('videoTitleLoaded');
        } catch (error) {
            message.textContent = this.text('videoTitleUnavailable');
            console.error('YouTube title lookup failed:', error);
        }
    },

    async saveVideo() {
        const url = document.getElementById('videoUrlInput').value.trim();
        const videoId = this.youtubeId(url);
        const message = document.getElementById('videoFormMessage');
        if (!videoId) {
            message.textContent = this.text('invalidYoutube');
            return;
        }
        if (!PortalBackend.configured || !PortalBackend.isAdmin()) {
            message.textContent = this.text('ownerOnly');
            return;
        }
        const saveButton = document.getElementById('saveVideoButton');
        saveButton.disabled = true;
        const editing = Boolean(this.editingVideoId);
        let title;
        try {
            message.textContent = this.text('fetchingVideoTitle');
            title = await this.fetchYouTubeTitle(videoId);
        } catch (error) {
            message.textContent = this.text('videoTitleUnavailable');
            console.error('YouTube title lookup failed:', error);
            saveButton.disabled = false;
            return;
        }
        document.getElementById('videoTitleInput').value = title;
        const video = {
            title,
            videoId,
            subject: document.getElementById('videoSubjectInput').value || DEFAULT_SUBJECTS[0],
            addedAt: new Date().toISOString()
        };
        let record;
        try {
            record = editing
                ? await PortalBackend.updateVideo(this.editingVideoId, video)
                : await PortalBackend.publishVideo(video);
        } catch (error) {
            message.textContent = error.message;
            console.error(editing ? 'Video update failed:' : 'Video publishing failed:', error);
            saveButton.disabled = false;
            return;
        } finally {
            saveButton.disabled = false;
        }
        this.videos = editing
            ? this.videos.map(item => item.id === record.id ? record : item)
            : [record, ...this.videos];
        this.renderVideos();
        this.updateDashboard();
        this.clearVideoForm();
        message.textContent = this.text(editing ? 'videoUpdated' : 'videoPublished');
    },

    editVideo(video) {
        this.editingVideoId = video.id;
        document.getElementById('videoAdminForm').classList.remove('hidden');
        document.getElementById('videoTitleInput').value = video.title;
        document.getElementById('videoUrlInput').value = `https://www.youtube.com/watch?v=${video.videoId}`;
        this.selectSubject(document.getElementById('videoSubjectInput'), video.subject || DEFAULT_SUBJECTS[0]);
        document.getElementById('saveVideoButton').textContent = this.text('saveChanges');
        document.getElementById('videoFormMessage').textContent = '';
        document.getElementById('videoTitleInput').focus();
    },

    async deleteVideo(video) {
        if (!window.confirm(this.text('confirmDeleteVideo'))) return;
        try {
            await PortalBackend.deleteVideo(video.id);
            this.videos = this.videos.filter(item => item.id !== video.id);
            this.renderVideos();
            this.updateDashboard();
        } catch (error) {
            this.showBackendError(error.message);
            console.error('Video deletion failed:', error);
        }
    },

    clearVideoForm() {
        this.editingVideoId = null;
        document.getElementById('videoTitleInput').value = '';
        document.getElementById('videoUrlInput').value = '';
        document.getElementById('videoFormMessage').textContent = '';
        document.getElementById('saveVideoButton').textContent = this.text('saveVideo');
    },

    renderVideos() {
        const grid = document.getElementById('videoGrid');
        const filter = document.getElementById('videoSubjectFilter')?.value || 'all';
        const list = this.videos.filter(video => filter === 'all' || video.subject === filter);
        if (!grid) return;
        grid.replaceChildren();
        document.getElementById('videoCount').textContent = String(list.length);
        if (!list.length) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `<div class="empty-state-icon">▷</div><h3>${this.escapeHtml(this.text('noVideosYet'))}</h3><p>${this.escapeHtml(this.text('videosSetupText'))}</p>`;
            grid.appendChild(emptyState);
            return;
        }
        list.forEach(video => {
            const article = document.createElement('article');
            article.className = 'video-card';
            const button = document.createElement('button');
            button.className = 'video-card-button';
            button.type = 'button';
            button.setAttribute('aria-label', `${this.text('videos')}: ${video.title}`);
            const thumbnail = document.createElement('div');
            thumbnail.className = 'video-thumbnail';
            const image = document.createElement('img');
            image.src = `https://img.youtube.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
            image.alt = '';
            image.loading = 'lazy';
            const play = document.createElement('span');
            play.className = 'video-play';
            play.textContent = '▶';
            thumbnail.append(image, play);
            const info = document.createElement('div');
            info.className = 'video-card-info';
            const title = document.createElement('strong');
            title.textContent = video.title;
            const subject = document.createElement('span');
            subject.textContent = this.subjectName(video.subject || DEFAULT_SUBJECTS[0]);
            info.append(title, subject);
            button.append(thumbnail, info);
            button.addEventListener('click', () => this.openVideo(video));
            article.appendChild(button);
            if (PortalBackend.configured && PortalBackend.isAdmin()) {
                const adminActions = document.createElement('div');
                adminActions.className = 'video-admin-actions';
                adminActions.append(
                    this.createAdminButton('edit', () => this.editVideo(video)),
                    this.createAdminButton('delete', () => this.deleteVideo(video))
                );
                article.appendChild(adminActions);
            }
            grid.appendChild(article);
        });
    },

    openVideo(video) {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');
        const origin = ['http:', 'https:'].includes(window.location.protocol)
            ? `&origin=${encodeURIComponent(window.location.origin)}`
            : '';
        player.src = `https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?autoplay=1${origin}`;
        document.getElementById('videoModalTitle').textContent = video.title;
        const youtubeLink = document.getElementById('watchOnYoutube');
        youtubeLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.videoId)}`;
        modal.classList.remove('hidden');
        modal.querySelector('.video-modal-close').focus();
        const watched = this.storage.get('watchedVideos', []);
        if (!watched.includes(video.id)) {
            watched.push(video.id);
            this.storage.set('watchedVideos', watched);
            this.updateDashboard();
        }
    },

    bindVideoModal() {
        const modal = document.getElementById('videoModal');
        const close = () => {
            modal.classList.add('hidden');
            document.getElementById('videoPlayer').src = '';
        };
        document.getElementById('closeVideoModal')?.addEventListener('click', close);
        modal?.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
        });
    },

    bindFileModal() {
        const modal = document.getElementById('fileViewerModal');
        const close = () => {
            modal.classList.add('hidden');
            document.getElementById('fileViewer').src = 'about:blank';
        };
        document.getElementById('closeFileViewer')?.addEventListener('click', close);
        modal?.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
        });
    },

    addExam(quiz, subject) {
        if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) return;
        const exams = this.exams;
        const existing = exams.find(exam => exam.title === quiz.title);
        const record = {
            id: existing?.id || `exam-${Date.now()}`,
            title: quiz.title || this.text('exams'),
            description: quiz.description || '',
            subject: quiz.subject || subject || DEFAULT_SUBJECTS[0],
            dueDate: quiz.dueDate || quiz.scheduledAt || null,
            questions: quiz.questions
        };
        const nextExams = existing
            ? exams.map(exam => exam.id === existing.id ? record : exam)
            : [record, ...exams];
        this.exams = nextExams;
        this.storage.set('exams', nextExams);
        this.renderExams();
        this.renderExamResults();
        this.updateDashboard();
    },

    renderExams() {
        const container = document.getElementById('examCatalog');
        if (!container) return;
        const exams = this.exams;
        container.replaceChildren();
        if (!exams.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-inline';
            empty.textContent = this.text('noExams');
            container.appendChild(empty);
            return;
        }
        exams.forEach(exam => {
            const card = document.createElement('article');
            card.className = 'exam-card';
            const info = document.createElement('div');
            const heading = document.createElement('h3');
            heading.textContent = exam.title;
            const description = document.createElement('p');
            description.textContent = exam.description || this.subjectName(exam.subject || DEFAULT_SUBJECTS[0]);
            const count = document.createElement('small');
            count.textContent = `${exam.questions.length} ${this.text('questions')}`;
            info.append(heading, description, count);
            const start = document.createElement('button');
            start.className = 'btn btn-primary';
            start.type = 'button';
            start.textContent = this.text('startExam');
            start.addEventListener('click', () => {
                if (!window.quizEngine) return;
                window.quizEngine.currentQuiz = exam;
                document.getElementById('quizSubject').value = exam.subject || DEFAULT_SUBJECTS[0];
                window.quizEngine.showNameModal(exam);
            });
            card.append(info, start);
            if (PortalBackend.configured && PortalBackend.isAdmin()) {
                const adminActions = document.createElement('div');
                adminActions.className = 'exam-admin-actions';
                adminActions.append(
                    this.createAdminButton('edit', () => this.editExam(exam)),
                    this.createAdminButton('delete', () => this.deleteExam(exam))
                );
                card.appendChild(adminActions);
            }
            container.appendChild(card);
        });
    },

    renderExamResults() {
        const container = document.getElementById('examResultsList');
        if (!container) return;
        const results = [...this.storage.get('quizResults', [])].reverse();
        container.replaceChildren();
        if (!results.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-inline';
            empty.textContent = this.text('noResultsYet');
            container.appendChild(empty);
            return;
        }
        results.forEach(result => {
            const row = document.createElement('div');
            row.className = 'exam-result-row';
            const title = document.createElement('strong');
            title.textContent = result.quizTitle || this.text('exams');
            const date = document.createElement('span');
            const parsedDate = new Date(result.date);
            date.textContent = Number.isNaN(parsedDate.getTime())
                ? ''
                : new Intl.DateTimeFormat(
                    this.storage.get('language', 'ar') === 'ar' ? 'ar' : 'en',
                    { dateStyle: 'medium' }
                ).format(parsedDate);
            const score = document.createElement('b');
            score.textContent = `${result.score}%`;
            row.append(title, date, score);
            container.appendChild(row);
        });
    },

    updateDashboard() {
        const exams = this.storage.get('quizResults', []);
        const watched = this.storage.get('watchedVideos', []);
        const downloaded = this.storage.get('downloadedFiles', []);
        document.getElementById('dashboardExams').textContent = String(exams.length);
        document.getElementById('dashboardVideos').textContent = String(watched.length);
        document.getElementById('dashboardFiles').textContent = String(downloaded.length);
        const latestVideos = [...this.videos].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt)).slice(0, 3);
        this.renderCompactList('dashboardNewVideos', latestVideos, video => {
            const text = `${video.title} · ${video.subject || DEFAULT_SUBJECTS[0]}`;
            return { text, tab: 'videos' };
        });
        const upcoming = this.exams
            .filter(exam => exam.dueDate && Date.parse(exam.dueDate) > Date.now())
            .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate))
            .slice(0, 3);
        this.renderCompactList('upcomingExams', upcoming, exam => ({
            text: `${exam.title} · ${exam.questions.length} ${this.text('questions')}`,
            tab: 'exams'
        }));
        this.updateDate();
    },

    renderCompactList(id, entries, describe) {
        const container = document.getElementById(id);
        if (!container) return;
        container.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-inline';
            empty.textContent = this.text(id === 'upcomingExams' ? 'noUpcomingExams' : 'noVideosYet');
            container.appendChild(empty);
            return;
        }
        entries.forEach(entry => {
            const row = document.createElement('button');
            row.className = 'compact-list-item';
            row.type = 'button';
            row.textContent = describe(entry).text;
            row.addEventListener('click', () => document.querySelector(`.tab-btn[data-tab="${describe(entry).tab}"]`)?.click());
            container.appendChild(row);
        });
    },

    bindProfileForm() {
        document.getElementById('authForm')?.addEventListener('submit', async event => {
            event.preventDefault();
            const message = document.getElementById('authMessage');
            if (!PortalBackend.configured) {
                this.showFormMessage(message, this.text('accountSetupRequired'), 'error');
                return;
            }
            const name = document.getElementById('profileName').value.trim();
            const email = document.getElementById('profileEmailInput').value.trim();
            const password = document.getElementById('profilePassword').value;
            const submit = document.getElementById('authSubmit');
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                this.showFormMessage(message, this.text('invalidEmail'), 'error');
                return;
            }
            submit.disabled = true;
            this.showFormMessage(message, '');
            try {
                if (this.authMode === 'signup') {
                    await PortalBackend.signUp(name, email, password);
                    document.getElementById('profilePassword').value = '';
                    this.showFormMessage(message, this.text('accountCreated'), 'success');
                } else {
                    await PortalBackend.signIn(email, password);
                    document.getElementById('profilePassword').value = '';
                    this.showFormMessage(message, this.text('signInSuccess'), 'success');
                }
            } catch (error) {
                this.showFormMessage(message, this.authErrorMessage(error), 'error');
                console.error('Account authentication failed:', error);
            } finally {
                submit.disabled = false;
            }
        });
        document.getElementById('authModeToggle')?.addEventListener('click', () => {
            document.getElementById('authForm').classList.remove('hidden');
            this.authMode = this.authMode === 'signup' ? 'signin' : 'signup';
            this.showFormMessage(document.getElementById('authMessage'), '');
            this.refreshDynamicLabels();
            document.querySelector('label[for="profileName"]')?.classList.toggle('hidden', this.authMode === 'signin');
            document.getElementById('profileName').classList.toggle('hidden', this.authMode === 'signin');
            document.getElementById('profileName').required = this.authMode === 'signup';
            document.getElementById('profilePassword').autocomplete = this.authMode === 'signup' ? 'new-password' : 'current-password';
        });
        document.getElementById('profileAvatarFile')?.addEventListener('change', event => {
            const file = event.currentTarget.files[0];
            if (!file) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
                this.showFormMessage(
                    document.getElementById('profileEditMessage'),
                    this.text(file.size > 2 * 1024 * 1024 ? 'avatarTooLarge' : 'invalidAvatarType'),
                    'error'
                );
                event.currentTarget.value = '';
                return;
            }
            this.setAvatarImages(URL.createObjectURL(file), document.getElementById('profileDisplayName').textContent, true);
        });
        document.getElementById('profileEditForm')?.addEventListener('submit', async event => {
            event.preventDefault();
            const message = document.getElementById('profileEditMessage');
            const saveButton = event.currentTarget.querySelector('button[type="submit"]');
            saveButton.disabled = true;
            try {
                await PortalBackend.updateProfile({
                    name: document.getElementById('profileEditName').value.trim(),
                    bio: document.getElementById('profileBio').value.trim(),
                    password: document.getElementById('profileNewPassword').value,
                    avatarFile: document.getElementById('profileAvatarFile').files[0] || null
                });
                document.getElementById('profileNewPassword').value = '';
                document.getElementById('profileAvatarFile').value = '';
                this.showFormMessage(message, this.text('profileUpdated'), 'success');
            } catch (error) {
                this.showFormMessage(message, this.authErrorMessage(error), 'error');
                console.error('Profile update failed:', error);
            } finally {
                saveButton.disabled = false;
            }
        });
        document.getElementById('signOutButton')?.addEventListener('click', async () => {
            try {
                await PortalBackend.signOut();
            } catch (error) {
                this.showBackendError(error.message);
                console.error('Sign-out failed:', error);
            }
        });
    },

    setAvatarImages(url, name, isPreview = false) {
        const initial = name.trim().charAt(0).toUpperCase() || 'L';
        document.getElementById('profileAvatarInitial').textContent = initial;
        document.getElementById('sidebarAvatarInitial').textContent = initial;
        const oldPreview = this.avatarPreviewUrl;
        if (oldPreview) URL.revokeObjectURL(oldPreview);
        this.avatarPreviewUrl = isPreview ? url : null;
        [
            document.getElementById('profileAvatarImage'),
            document.getElementById('sidebarAvatarImage')
        ].forEach(image => {
            image.onerror = () => {
                image.classList.add('hidden');
                image.removeAttribute('src');
                image.parentElement.querySelector('span').classList.remove('hidden');
            };
            const initialNode = image.parentElement.querySelector('span');
            if (url) {
                image.src = url;
                image.classList.remove('hidden');
                initialNode.classList.add('hidden');
            } else {
                image.classList.add('hidden');
                image.removeAttribute('src');
                initialNode.classList.remove('hidden');
            }
        });
    },

    bindAnnouncements() {
        const form = document.getElementById('announcementForm');
        const feedback = document.getElementById('announcementFeedback');
        document.getElementById('showAnnouncementForm')?.addEventListener('click', () => {
            form.classList.remove('hidden');
            document.getElementById('announcementTitle').focus();
        });
        document.getElementById('cancelAnnouncement')?.addEventListener('click', () => {
            form.classList.add('hidden');
            form.reset();
            this.showFormMessage(feedback, '');
        });
        form?.addEventListener('submit', async event => {
            event.preventDefault();
            const title = document.getElementById('announcementTitle').value.trim();
            const body = document.getElementById('announcementBody').value.trim();
            const submit = document.getElementById('publishAnnouncement');
            if (!PortalBackend.configured || !PortalBackend.isAdmin()) {
                this.showFormMessage(feedback, this.text('ownerOnly'), 'error');
                return;
            }
            if (!title || !body) {
                this.showFormMessage(feedback, this.text('announcementRequired'), 'error');
                return;
            }
            submit.disabled = true;
            try {
                await PortalBackend.publishAnnouncement({ title, body });
                form.reset();
                form.classList.add('hidden');
                this.showFormMessage(feedback, this.text('announcementPublished'), 'success');
            } catch (error) {
                this.showFormMessage(feedback, error.message, 'error');
                console.error('Announcement publishing failed:', error);
            } finally {
                submit.disabled = false;
            }
        });
    },

    bindChat() {
        document.getElementById('chatForm')?.addEventListener('submit', async event => {
            event.preventDefault();
            const input = document.getElementById('chatInput');
            const body = input.value.trim();
            if (!body || !PortalBackend.user) return;
            const button = event.currentTarget.querySelector('button[type="submit"]');
            button.disabled = true;
            try {
                await PortalBackend.sendChat(body);
                input.value = '';
            } catch (error) {
                this.showBackendError(error.message);
                console.error('Sending chat message failed:', error);
            } finally {
                button.disabled = !PortalBackend.user;
            }
        });
        const input = document.getElementById('chatInput');
        const toggle = document.getElementById('chatEmojiToggle');
        const picker = document.getElementById('chatEmojiPicker');
        const closePicker = (returnFocus = false) => {
            picker.classList.add('hidden');
            toggle.setAttribute('aria-expanded', 'false');
            if (returnFocus) toggle.focus();
        };
        toggle?.addEventListener('click', () => {
            const isOpening = picker.classList.contains('hidden');
            picker.classList.toggle('hidden', !isOpening);
            toggle.setAttribute('aria-expanded', String(isOpening));
            if (isOpening) picker.querySelector('button')?.focus();
        });
        picker?.addEventListener('click', event => {
            const emojiButton = event.target.closest('button[data-emoji]');
            if (!emojiButton) return;
            const emoji = emojiButton.dataset.emoji;
            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            const nextValue = `${input.value.slice(0, start)}${emoji}${input.value.slice(end)}`;
            if (nextValue.length > input.maxLength) return;
            input.setRangeText(emoji, start, end, 'end');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.focus();
            closePicker();
        });
        document.addEventListener('click', event => {
            if (!picker.classList.contains('hidden')
                && !picker.contains(event.target)
                && event.target !== toggle) {
                closePicker();
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !picker.classList.contains('hidden')) {
                closePicker(true);
            }
        });
        const modal = document.getElementById('chatProfileModal');
        const close = () => {
            modal.classList.add('hidden');
            this.chatProfileRequestId++;
            this.chatProfileTrigger?.focus();
            this.chatProfileTrigger = null;
        };
        document.getElementById('closeChatProfile')?.addEventListener('click', close);
        modal?.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !modal.classList.contains('hidden')) close();
        });
    },

    async openChatProfile(userId, fallbackName, trigger) {
        const modal = document.getElementById('chatProfileModal');
        const title = document.getElementById('chatProfileTitle');
        const bio = document.getElementById('chatProfileBio');
        const requestId = ++this.chatProfileRequestId;
        this.chatProfileTrigger = trigger;
        title.textContent = fallbackName;
        bio.textContent = this.text('profileLoading');
        modal.classList.remove('hidden');
        document.getElementById('closeChatProfile').focus();
        try {
            const profile = await PortalBackend.loadChatProfile(userId);
            if (requestId !== this.chatProfileRequestId || modal.classList.contains('hidden')) return;
            title.textContent = profile.displayName || fallbackName;
            bio.textContent = profile.bioVisible
                ? (profile.bio || this.text('emptyChatProfileBio'))
                : this.text('privateChatProfile');
        } catch (error) {
            if (requestId !== this.chatProfileRequestId || modal.classList.contains('hidden')) return;
            bio.textContent = this.text('chatProfileLoadFailed');
            this.showBackendError(error.message);
            console.error('Learner profile loading failed:', error);
        }
    },

    authErrorMessage(error) {
        const code = error?.code || error?.message || '';
        if (/email_confirmation_required/i.test(code)) return this.text('disableEmailConfirmation');
        if (/rate.?limit|too many requests/i.test(code)) return this.text('authRateLimit');
        if (/invalid login credentials/i.test(code)) return this.text('invalidCredentials');
        if (/already registered|user already exists/i.test(code)) return this.text('accountExists');
        if (/password should be at least|password.*characters/i.test(code)) return this.text('passwordTooShort');
        return error?.message || this.text('unexpectedError');
    },

    onBackendStatus(configured) {
        document.getElementById('authSetupNotice').classList.toggle('hidden', configured);
        document.getElementById('chatConnection').textContent =
            this.text(configured ? 'signInToChat' : 'setupRequired');
        document.querySelector('.chat-note').textContent =
            this.text(configured ? 'signInToChatNote' : 'communitySetupNote');
        document.getElementById('videoLocalNotice').textContent = this.text('videoLocalNotice');
        this.showFormMessage(
            document.getElementById('authMessage'),
            configured ? '' : this.text('backendSetupNeeded'),
            configured ? '' : 'error'
        );
        const canManage = configured && PortalBackend.isAdmin();
        document.getElementById('showVideoForm').classList.toggle('hidden', !canManage);
        document.getElementById('showExamForm').classList.toggle('hidden', !canManage);
        document.getElementById('showFileForm').classList.toggle('hidden', !canManage);
        document.getElementById('showAnnouncementForm').classList.toggle('hidden', !canManage);
        document.getElementById('videoAdminForm').classList.add('hidden');
        if (!configured) this.showWelcomeIfNeeded();
    },

    onSessionChanged(user, profile, isAdmin) {
        const profileName = profile?.display_name?.trim();
        const metadataName = user?.user_metadata?.display_name?.trim();
        const name = (profileName && profileName !== 'Learner' ? profileName : null)
            || metadataName
            || profileName
            || user?.email?.split('@')[0]
            || this.text('guest');
        document.getElementById('profileDisplayName').textContent = name;
        document.getElementById('profileEmail').textContent = user?.email || this.text('notSignedIn');
        document.getElementById('sidebarUserName').textContent = name;
        this.setAvatarImages(profile?.avatar_url || '', name);
        const bioDisplay = document.getElementById('profileBioDisplay');
        bioDisplay.textContent = profile?.bio || '';
        bioDisplay.classList.toggle('hidden', !profile?.bio);
        document.getElementById('sidebarAccountState').textContent = this.text(
            user ? 'cloudSynced' : (PortalBackend.configured ? 'signInToSync' : 'localProgress')
        );
        document.querySelector('#syncStatus > span:last-child').textContent = this.text(
            user ? 'cloudSyncOn' : (PortalBackend.configured ? 'signInToSync' : 'deviceOnly')
        );
        document.getElementById('authForm').classList.toggle('hidden', Boolean(user));
        document.getElementById('profileEditForm').classList.toggle('hidden', !user);
        document.getElementById('authModeToggle').classList.toggle('hidden', Boolean(user));
        document.getElementById('signOutButton').classList.toggle('hidden', !user);
        document.getElementById('authHeading').textContent =
            user ? this.text('accountSettings') : this.text(this.authMode === 'signup' ? 'createAccount' : 'signIn');
        document.getElementById('authSetupNotice').classList.toggle('hidden', PortalBackend.configured);
        if (user) {
            document.getElementById('profileEditName').value = name;
            document.getElementById('profileEditEmail').value = user.email || '';
            document.getElementById('profileBio').value = profile?.bio || '';
            document.getElementById('profileVisibilityToggle').checked = profile?.is_public !== false;
            document.getElementById('profileVisibilityToggle').disabled = false;
        } else {
            document.getElementById('profileVisibilityToggle').checked = true;
            document.getElementById('profileVisibilityToggle').disabled = true;
        }
        document.getElementById('chatInput').disabled = !user;
        document.querySelector('#chatForm button[type="submit"]').disabled = !user;
        document.getElementById('chatEmojiToggle').disabled = !user;
        document.getElementById('chatConnection').textContent = this.text(user ? 'connected' : 'signInToChat');
        document.querySelector('.chat-note').textContent = this.text(
            user ? 'communityRespect' : (PortalBackend.configured ? 'signInToChatNote' : 'communitySetupNote')
        );
        document.getElementById('showExamForm').classList.toggle('hidden', !isAdmin);
        document.getElementById('showFileForm').classList.toggle('hidden', !isAdmin);
        document.getElementById('showVideoForm').classList.toggle('hidden', !isAdmin);
        document.getElementById('showAnnouncementForm').classList.toggle('hidden', !isAdmin);
        document.getElementById('videoLocalNotice').classList.toggle('hidden', PortalBackend.configured);
        if (PortalBackend.configured && !user) {
            this.videos = [];
            this.exams = [];
            this.renderVideos();
            this.renderExams();
        }
        if (!isAdmin) {
            document.getElementById('videoAdminForm').classList.add('hidden');
            document.getElementById('examAdminForm').classList.add('hidden');
            document.getElementById('fileAdminForm').classList.add('hidden');
        }
        updateLanguageUI(this.storage.get('language', 'ar'));
        if (user) {
            if (this.lastTutorialUserId !== user.id && !this.storage.get('tutorialCompleted', false)) {
                this.startTutorial();
            }
            this.lastTutorialUserId = user.id;
            localStorage.setItem('lumaWelcomeSeen', 'true');
        } else {
            if (this.tutorialActive) {
                document.getElementById('tutorialModal').classList.add('hidden');
                this.tutorialActive = false;
            }
            this.lastTutorialUserId = null;
            this.showWelcomeIfNeeded();
        }
        this.lastSessionUserId = user?.id || null;
    },

    showBackendError(message) {
        const authMessage = document.getElementById('authMessage');
        const chatNote = document.querySelector('.chat-note');
        if (authMessage) this.showFormMessage(authMessage, message, 'error');
        if (chatNote) chatNote.textContent = message;
    },

    refreshAfterSync() {
        this.renderExamResults();
        this.updateDashboard();
        this.syncProfileDisplay();
        const language = this.storage.get('language', 'ar');
        updateLanguageUI(language);
    },

    setSharedVideos(videos) {
        this.videos = videos;
        this.renderVideos();
        this.updateDashboard();
    },

    setSharedExams(exams) {
        this.exams = exams;
        this.renderExams();
        this.updateDashboard();
    },

    setSharedFiles(files) {
        FilesManager.files = files.reduce((grouped, file) => {
            (grouped[file.subject] ||= []).push(file);
            return grouped;
        }, {});
        FilesManager.render();
    },

    renderChatMessages(messages, forceBottom = false) {
        const container = document.getElementById('chatMessages');
        const isVisible = container.clientHeight > 0;
        const wasAtBottom = isVisible
            && container.scrollHeight - container.scrollTop - container.clientHeight < 48;
        const previousScrollTop = container.scrollTop;
        container.replaceChildren();
        if (!messages.length) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            const heading = document.createElement('h3');
            heading.textContent = this.text('communityReadyTitle');
            const description = document.createElement('p');
            description.textContent = this.text('noChatMessages');
            empty.append(heading, description);
            container.appendChild(empty);
        } else {
            messages.forEach(message => {
                const row = document.createElement('article');
                row.className = `chat-message${message.user_id === PortalBackend.user?.id ? ' own-message' : ''}`;
                const profile = Array.isArray(message.profiles) ? message.profiles[0] : message.profiles;
                const authorName = profile?.display_name || this.text('guest');
                const heading = document.createElement('div');
                heading.className = 'chat-message-heading';
                const avatar = document.createElement('span');
                avatar.className = 'chat-avatar';
                avatar.setAttribute('aria-hidden', 'true');
                const avatarInitial = document.createElement('span');
                avatarInitial.textContent = Array.from(authorName.trim())[0]?.toLocaleUpperCase() || 'L';
                avatar.appendChild(avatarInitial);
                if (message.avatar_url) {
                    const image = document.createElement('img');
                    image.src = message.avatar_url;
                    image.alt = '';
                    image.loading = 'lazy';
                    image.onerror = () => image.remove();
                    avatar.appendChild(image);
                }
                const author = document.createElement('button');
                author.type = 'button';
                author.className = 'chat-author';
                author.textContent = authorName;
                author.setAttribute('aria-label', this.text('viewChatProfileFor', { name: authorName }));
                author.addEventListener('click', () => this.openChatProfile(message.user_id, authorName, author));
                const time = document.createElement('time');
                time.dateTime = message.created_at;
                time.textContent = new Intl.DateTimeFormat(
                    this.storage.get('language', 'ar') === 'ar' ? 'ar' : 'en',
                    { hour: 'numeric', minute: '2-digit' }
                ).format(new Date(message.created_at));
                heading.append(avatar, author, time);
                const isOwnMessage = message.user_id === PortalBackend.user?.id;
                if (isOwnMessage && this.chatEditingMessageId !== message.id) {
                    const actions = document.createElement('div');
                    actions.className = 'chat-message-actions';
                    const editButton = document.createElement('button');
                    editButton.type = 'button';
                    editButton.dataset.i18n = 'edit';
                    editButton.textContent = this.text('edit');
                    editButton.addEventListener('click', () => {
                        this.chatEditingMessageId = message.id;
                        this.renderChatMessages(messages);
                        document.querySelector('.chat-edit-form textarea')?.focus();
                    });
                    const deleteButton = document.createElement('button');
                    deleteButton.type = 'button';
                    deleteButton.dataset.i18n = 'delete';
                    deleteButton.textContent = this.text('delete');
                    deleteButton.addEventListener('click', async () => {
                        if (!window.confirm(this.text('confirmDeleteChatMessage'))) return;
                        deleteButton.disabled = true;
                        try {
                            await PortalBackend.deleteChatMessage(message.id);
                        } catch (error) {
                            deleteButton.disabled = false;
                            this.showBackendError(error.message);
                            console.error('Chat message deletion failed:', error);
                        }
                    });
                    actions.append(editButton, deleteButton);
                    heading.appendChild(actions);
                }
                row.appendChild(heading);
                if (isOwnMessage && this.chatEditingMessageId === message.id) {
                    const form = document.createElement('form');
                    form.className = 'chat-edit-form';
                    const textarea = document.createElement('textarea');
                    textarea.maxLength = 1000;
                    textarea.required = true;
                    textarea.placeholder = this.text('editMessagePlaceholder');
                    textarea.dataset.i18nPlaceholder = 'editMessagePlaceholder';
                    textarea.value = message.body;
                    textarea.setAttribute('aria-label', this.text('editMessagePlaceholder'));
                    textarea.dataset.i18nAriaLabel = 'editMessagePlaceholder';
                    const controls = document.createElement('div');
                    controls.className = 'chat-edit-actions';
                    const saveButton = document.createElement('button');
                    saveButton.type = 'submit';
                    saveButton.className = 'btn btn-primary';
                    saveButton.dataset.i18n = 'saveChanges';
                    saveButton.textContent = this.text('saveChanges');
                    const cancelButton = document.createElement('button');
                    cancelButton.type = 'button';
                    cancelButton.className = 'btn btn-secondary';
                    cancelButton.dataset.i18n = 'cancel';
                    cancelButton.textContent = this.text('cancel');
                    cancelButton.addEventListener('click', () => {
                        this.chatEditingMessageId = null;
                        this.renderChatMessages(messages);
                    });
                    controls.append(saveButton, cancelButton);
                    form.append(textarea, controls);
                    form.addEventListener('submit', async event => {
                        event.preventDefault();
                        const body = textarea.value.trim();
                        if (!body) {
                            this.showBackendError(this.text('messageRequired'));
                            textarea.focus();
                            return;
                        }
                        saveButton.disabled = true;
                        this.chatEditingMessageId = null;
                        this.chatSavingMessageId = message.id;
                        try {
                            await PortalBackend.editChatMessage(message.id, body);
                        } catch (error) {
                            this.chatEditingMessageId = message.id;
                            saveButton.disabled = false;
                            this.showBackendError(error.message);
                            console.error('Chat message update failed:', error);
                        } finally {
                            this.chatSavingMessageId = null;
                        }
                    });
                    row.appendChild(form);
                } else {
                    const body = document.createElement('p');
                    body.textContent = message.body;
                    row.appendChild(body);
                }
                container.appendChild(row);
            });
        }
        const shouldScrollToBottom = forceBottom || wasAtBottom || this.chatNeedsInitialScroll;
        if (shouldScrollToBottom && !isVisible) this.chatNeedsInitialScroll = true;
        if (isVisible && shouldScrollToBottom) {
            container.scrollTop = container.scrollHeight;
            this.chatNeedsInitialScroll = false;
        } else if (isVisible) {
            container.scrollTop = previousScrollTop;
        }
        this.renderNotifications(messages);
    },

    setAnnouncements(announcements) {
        const previousIds = new Set(this.announcements.map(item => item.id));
        this.announcements = announcements || [];
        if (!this.hasReceivedAnnouncements) {
            const newest = this.announcements[0];
            if (newest) this.showAnnouncementToast(newest);
            this.hasReceivedAnnouncements = true;
        } else {
            this.announcements
                .filter(item => !previousIds.has(item.id))
                .slice(0, 3)
                .forEach(item => this.showAnnouncementToast(item));
        }
        this.renderAnnouncements();
        this.renderNotifications(PortalBackend.chatMessages || []);
    },

    showAnnouncementToast(announcement) {
        const shownIds = new Set(this.storage.get('shownAnnouncementToastIds', []));
        if (shownIds.has(announcement.id)) return;
        shownIds.add(announcement.id);
        this.storage.set('shownAnnouncementToastIds', [...shownIds].slice(-200));

        const region = document.getElementById('announcementToasts');
        const toast = document.createElement('button');
        toast.type = 'button';
        toast.className = 'announcement-toast';
        toast.dataset.announcementId = announcement.id;
        toast.setAttribute('aria-label', announcement.title);
        const title = document.createElement('strong');
        title.textContent = announcement.title;
        const body = document.createElement('span');
        body.textContent = announcement.body;
        toast.append(title, body);
        toast.addEventListener('click', () => {
            this.markNotificationRead(`announcement:${announcement.id}`);
            this.dismissAnnouncementToast(announcement.id);
        });
        region.appendChild(toast);
        this.announcementToastTimers.set(
            announcement.id,
            window.setTimeout(() => this.dismissAnnouncementToast(announcement.id), 8000)
        );
    },

    dismissAnnouncementToast(id) {
        const timer = this.announcementToastTimers.get(id);
        if (timer) window.clearTimeout(timer);
        this.announcementToastTimers.delete(id);
        document.querySelectorAll('.announcement-toast').forEach(toast => {
            if (toast.dataset.announcementId === String(id)) toast.remove();
        });
    },

    renderAnnouncements() {
        const container = document.getElementById('announcementsList');
        if (!container) return;
        container.replaceChildren();
        if (!this.announcements.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-inline';
            empty.textContent = this.text('noAnnouncements');
            container.appendChild(empty);
            return;
        }
        this.announcements.forEach(announcement => {
            const article = document.createElement('article');
            article.className = 'announcement-item';
            const heading = document.createElement('div');
            heading.className = 'announcement-heading';
            const title = document.createElement('h4');
            title.textContent = announcement.title;
            const time = document.createElement('time');
            time.dateTime = announcement.created_at;
            time.textContent = new Intl.DateTimeFormat(
                this.storage.get('language', 'ar') === 'ar' ? 'ar' : 'en',
                { dateStyle: 'medium' }
            ).format(new Date(announcement.created_at));
            heading.append(title, time);
            if (PortalBackend.isAdmin()) {
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'text-button announcement-delete';
                remove.textContent = this.text('delete');
                remove.addEventListener('click', async () => {
                    if (!window.confirm(this.text('confirmDeleteAnnouncement'))) return;
                    try {
                        await PortalBackend.deleteAnnouncement(announcement.id);
                    } catch (error) {
                        this.showBackendError(error.message);
                        console.error('Announcement deletion failed:', error);
                    }
                });
                heading.appendChild(remove);
            }
            const body = document.createElement('p');
            body.textContent = announcement.body;
            article.append(heading, body);
            container.appendChild(article);
        });
    },

    renderNotifications(messages) {
        const container = document.getElementById('dashboardNotifications');
        if (!container) return;
        container.replaceChildren();
        const settings = this.storage.get('settings', {});
        const entries = [];
        if (settings.notificationsEnabled !== false) {
            if (settings.announcementNotifications !== false) {
                this.announcements.slice(0, 10).forEach(item => entries.push({
                    id: `announcement:${item.id}`,
                    title: item.title,
                    body: item.body,
                    createdAt: item.created_at,
                    type: 'announcement'
                }));
            }
            if (settings.chatNotifications !== false) {
                [...messages].slice(-10).forEach(item => {
                    if (item.user_id === PortalBackend.user?.id) return;
                    const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                    entries.push({
                        id: `message:${item.id}`,
                        title: profile?.display_name || this.text('guest'),
                        body: item.body,
                        createdAt: item.created_at,
                        type: 'message'
                    });
                });
            }
        }
        entries.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        this.notificationEntries = entries.slice(0, 15);
        const readIds = new Set(this.storage.get('readNotificationIds', []));
        const unreadCount = this.notificationEntries.filter(entry => !readIds.has(entry.id)).length;
        const badge = document.getElementById('notificationBadge');
        const notificationButton = document.getElementById('notificationToggle');
        badge.textContent = String(unreadCount);
        badge.classList.toggle('hidden', unreadCount === 0);
        notificationButton.setAttribute('aria-label', this.text('notificationsCount', { count: unreadCount }));

        if (!this.notificationEntries.length) {
            container.className = 'empty-inline';
            container.textContent = this.text('noNotifications');
            return;
        }
        container.className = 'notification-list';
        this.notificationEntries.forEach(entry => {
            const row = document.createElement('article');
            row.className = `notification-item${readIds.has(entry.id) ? '' : ' unread'}`;
            const heading = document.createElement('strong');
            heading.textContent = entry.type === 'announcement'
                ? `${this.text('announcements')}: ${entry.title}`
                : `${this.text('community')}: ${entry.title}`;
            const body = document.createElement('p');
            body.textContent = entry.body;
            const time = document.createElement('time');
            time.dateTime = entry.createdAt;
            time.textContent = new Intl.DateTimeFormat(
                this.storage.get('language', 'ar') === 'ar' ? 'ar' : 'en',
                { dateStyle: 'short', timeStyle: 'short' }
            ).format(new Date(entry.createdAt));
            row.append(heading, body, time);
            container.appendChild(row);
        });
    },

    syncProfileDisplay() {
        if (PortalBackend.user) return;
        const savedName = this.storage.get('profileName', '');
        const name = savedName || this.text('guest');
        document.getElementById('sidebarUserName').textContent = name;
        document.getElementById('profileDisplayName').textContent = name;
        document.getElementById('profileEmail').textContent = this.text('notSignedIn');
        this.setAvatarImages('', name);
        if (savedName) document.getElementById('profileName').value = savedName;
    },

    markNotificationsRead() {
        const readIds = new Set(this.storage.get('readNotificationIds', []));
        this.notificationEntries.forEach(entry => readIds.add(entry.id));
        this.storage.set('readNotificationIds', [...readIds].slice(-200));
        this.renderNotifications(PortalBackend.chatMessages || []);
    },

    markNotificationRead(id) {
        const readIds = new Set(this.storage.get('readNotificationIds', []));
        readIds.add(id);
        this.storage.set('readNotificationIds', [...readIds].slice(-200));
        this.renderNotifications(PortalBackend.chatMessages || []);
    },

    escapeHtml(value) {
        const element = document.createElement('span');
        element.textContent = value;
        return element.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize storage and managers in correct order
    const storage = new StorageManager('studyDashboard');
    const subjectsManager = new SubjectsManager(storage);
    window.subjectsManager = subjectsManager;

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
                opt.textContent = PortalUI.subjectName(s);
                quizSubject.appendChild(opt);
            });
        }
    }
    updateSubjectDropdowns();
    // Update dropdowns when subjects change
    subjectsManager.onSubjectsChanged = updateSubjectDropdowns;

    // ...existing code...

    // Language selection
    const lang = storage.get('language', 'ar');
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) langSelect.value = lang;

    const quiz = new QuizEngine(storage);
    window.quizEngine = quiz;
    UIController.init(storage);
    FilesManager.init(storage);
    PortalUI.init(storage);

    // Now update language UI
    updateLanguageUI(lang);
    updateSubjectDropdowns();
    subjectsManager.renderSubjectsList();
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            const selectedLang = e.target.value;
            storage.set('language', selectedLang);
            updateLanguageUI(selectedLang);
            updateSubjectDropdowns();
            subjectsManager.renderSubjectsList();
        });
    }

});