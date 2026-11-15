window.StudyToolsManager = class StudyToolsManager {
    constructor(storage) {
        this.storage = storage;
        this.tasks = storage.get('studyTasks', []);
        this.tasks = Array.isArray(this.tasks)
            ? this.tasks.filter(task => task && typeof task.title === 'string') : [];
        this.decks = storage.get('flashcardDecks', []);
        this.decks = Array.isArray(this.decks)
            ? this.decks.filter(deck => deck && typeof deck.title === 'string')
                .map(deck => ({ ...deck, cards: Array.isArray(deck.cards) ? deck.cards : [] }))
            : [];
        const storedSettings = storage.get('focusSettings', {});
        const savedSettings = storedSettings && typeof storedSettings === 'object' ? storedSettings : {};
        this.settings = {
            workMinutes: Number.isInteger(savedSettings.workMinutes)
                && savedSettings.workMinutes >= 1 && savedSettings.workMinutes <= 180
                ? savedSettings.workMinutes : 25,
            restMinutes: Number.isInteger(savedSettings.restMinutes)
                && savedSettings.restMinutes >= 1 && savedSettings.restMinutes <= 60
                ? savedSettings.restMinutes : 5,
            promptInterval: Number.isInteger(savedSettings.promptInterval)
                && savedSettings.promptInterval >= 1 && savedSettings.promptInterval <= 180
                ? savedSettings.promptInterval : 15
        };
        this.isRunning = false;
        this.isWorkSession = true;
        this.timeRemaining = this.settings.workMinutes * 60;
        this.focusSeconds = 0;
        this.nextPromptAt = this.settings.promptInterval * 60;
        this.pendingPrompt = false;
        this.dirtyForms = new Set();
        this.selectedDeckId = this.decks[0]?.id || '';
        this.promptCard = null;
        this.resumeAfterPrompt = false;
        this.timer = null;
        this.bindEvents();
        this.renderTasks();
        this.renderDecks();
        this.renderFocusSettings();
        this.updateTimerDisplay();
        this.renderProgress();
    }

    text(key, values = {}) {
        return window.PortalUI.text(key, values);
    }

    makeId() {
        return window.crypto?.randomUUID?.()
            || `study-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    bindEvents() {
        document.getElementById('studyTaskForm').addEventListener('submit', event => {
            event.preventDefault();
            const title = document.getElementById('studyTaskTitle').value;
            if (!title.trim()) return;
            const scheduledAt = document.getElementById('studyTaskDate').value;
            this.tasks.unshift({
                id: this.makeId(),
                title,
                scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
                completed: false
            });
            this.storage.set('studyTasks', this.tasks);
            event.currentTarget.reset();
            this.renderTasks();
        });
        document.getElementById('studyTaskList').addEventListener('click', event => {
            const button = event.target.closest('button[data-task-action]');
            if (!button) return;
            const task = this.tasks.find(item => item.id === button.dataset.taskId);
            if (!task) return;
            if (button.dataset.taskAction === 'toggle') task.completed = !task.completed;
            else this.tasks = this.tasks.filter(item => item.id !== task.id);
            this.storage.set('studyTasks', this.tasks);
            this.renderTasks();
        });
        document.getElementById('focusStart').addEventListener('click', () => this.startTimer());
        document.getElementById('focusPause').addEventListener('click', () => this.pauseTimer());
        document.getElementById('focusReset').addEventListener('click', () => this.resetTimer());
        document.getElementById('focusSettingsForm').addEventListener('submit', event => {
            event.preventDefault();
            this.saveFocusSettings();
        });
        document.getElementById('flashcardDeckForm').addEventListener('submit', event => {
            event.preventDefault();
            const name = document.getElementById('flashcardDeckName').value;
            if (!name.trim()) return;
            const deck = { id: this.makeId(), title: name, cards: [] };
            this.decks.unshift(deck);
            this.selectedDeckId = deck.id;
            this.storage.set('flashcardDecks', this.decks);
            event.currentTarget.reset();
            this.renderDecks();
        });
        document.getElementById('flashcardDeckSelect').addEventListener('change', event => {
            this.selectedDeckId = event.currentTarget.value;
            this.renderCards();
        });
        document.getElementById('flashcardForm').addEventListener('submit', event => {
            event.preventDefault();
            const deck = this.decks.find(item => item.id === this.selectedDeckId);
            if (!deck) return;
            const front = document.getElementById('flashcardFront').value;
            const back = document.getElementById('flashcardBack').value;
            if (!front.trim() || !back.trim()) return;
            deck.cards.push({ id: this.makeId(), front, back, status: 'review' });
            this.storage.set('flashcardDecks', this.decks);
            event.currentTarget.reset();
            this.renderCards();
            this.checkPendingPrompt();
        });
        document.getElementById('flashcardList').addEventListener('click', event => {
            const button = event.target.closest('button[data-card-action]');
            if (!button) return;
            const card = this.findCard(button.dataset.cardId);
            if (!card) return;
            if (button.dataset.cardAction === 'delete') {
                this.decks = this.decks.map(deck => ({
                    ...deck,
                    cards: deck.cards.filter(item => item.id !== card.id)
                }));
            } else {
                card.status = button.dataset.cardAction === 'known' ? 'known' : 'review';
            }
            this.storage.set('flashcardDecks', this.decks);
            this.renderCards();
        });
        document.getElementById('reviewFlashcards').addEventListener('click', () => this.openRandomCard(false));
        document.getElementById('flashcardPromptReveal').addEventListener('click', () => {
            document.getElementById('flashcardPromptAnswer').classList.remove('hidden');
            document.getElementById('flashcardPromptReveal').classList.add('hidden');
            document.getElementById('flashcardMarkKnown').focus();
        });
        document.getElementById('flashcardMarkKnown').addEventListener('click', () => this.finishPrompt('known'));
        document.getElementById('flashcardMarkReview').addEventListener('click', () => this.finishPrompt('review'));
        document.getElementById('flashcardPrompt').addEventListener('cancel', event => event.preventDefault());
        document.addEventListener('focusout', () => window.setTimeout(() => this.checkPendingPrompt(), 0));
        document.addEventListener('input', event => {
            const form = event.target.closest('form');
            if (form) this.dirtyForms.add(form);
        });
        document.addEventListener('submit', event => this.dirtyForms.delete(event.target));
        document.addEventListener('reset', event => this.dirtyForms.delete(event.target));
    }

    renderTasks() {
        const container = document.getElementById('studyTaskList');
        container.replaceChildren();
        if (!this.tasks.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-inline';
            empty.textContent = this.text('noTasks');
            container.appendChild(empty);
            return;
        }
        this.tasks.forEach(task => {
            const row = document.createElement('div');
            row.className = `study-task-row${task.completed ? ' is-complete' : ''}`;
            const details = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = task.title;
            details.appendChild(title);
            if (task.scheduledAt) {
                const date = document.createElement('time');
                date.dateTime = task.scheduledAt;
                date.textContent = `${this.text('taskScheduled')}: ${new Intl.DateTimeFormat(
                    this.storage.get('language', 'ar') === 'ar' ? 'ar' : 'en',
                    { dateStyle: 'medium', timeStyle: 'short' }
                ).format(new Date(task.scheduledAt))}`;
                details.appendChild(date);
            }
            const actions = document.createElement('div');
            actions.className = 'focus-actions';
            [['toggle', task.completed ? 'reopenTask' : 'completeTask'], ['delete', 'deleteTask']]
                .forEach(([action, key]) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'btn btn-secondary';
                    button.dataset.taskAction = action;
                    button.dataset.taskId = task.id;
                    button.textContent = this.text(key);
                    actions.appendChild(button);
                });
            row.append(details, actions);
            container.appendChild(row);
        });
    }

    renderFocusSettings() {
        document.getElementById('focusWorkMinutes').value = this.settings.workMinutes;
        document.getElementById('focusRestMinutes').value = this.settings.restMinutes;
        document.getElementById('flashcardInterval').value = this.settings.promptInterval;
    }

    saveFocusSettings() {
        const workMinutes = Number(document.getElementById('focusWorkMinutes').value);
        const restMinutes = Number(document.getElementById('focusRestMinutes').value);
        const promptInterval = Number(document.getElementById('flashcardInterval').value);
        if (!Number.isInteger(workMinutes) || workMinutes < 1 || workMinutes > 180
            || !Number.isInteger(restMinutes) || restMinutes < 1 || restMinutes > 60
            || !Number.isInteger(promptInterval) || promptInterval < 1 || promptInterval > 180) {
            window.PortalUI.showFormMessage(
                document.getElementById('toolFeedback'),
                this.text('invalidFocusSettings'),
                'error'
            );
            return;
        }
        this.settings = { workMinutes, restMinutes, promptInterval };
        this.storage.set('focusSettings', this.settings);
        this.resetTimer();
        this.renderFocusSettings();
        window.PortalUI.showFormMessage(document.getElementById('toolFeedback'), '', '');
    }

    startTimer() {
        if (this.isRunning) return;
        this.isRunning = true;
        document.getElementById('focusStart').disabled = true;
        document.getElementById('focusPause').disabled = false;
        this.timer = window.setInterval(() => this.tick(), 1000);
    }

    pauseTimer() {
        this.isRunning = false;
        window.clearInterval(this.timer);
        this.timer = null;
        document.getElementById('focusStart').disabled = false;
        document.getElementById('focusPause').disabled = true;
    }

    resetTimer() {
        this.pauseTimer();
        this.isWorkSession = true;
        this.timeRemaining = this.settings.workMinutes * 60;
        this.focusSeconds = 0;
        this.pendingPrompt = false;
        this.nextPromptAt = this.settings.promptInterval * 60;
        this.updateTimerDisplay();
    }

    tick() {
        this.timeRemaining -= 1;
        if (this.isWorkSession) this.focusSeconds += 1;
        if (this.timeRemaining <= 0) this.completeTimerPhase();
        this.updateTimerDisplay();
        this.checkPendingPrompt();
    }

    completeTimerPhase() {
        this.pauseTimer();
        if (this.isWorkSession) {
            this.recordFocusSession();
            this.isWorkSession = false;
            this.timeRemaining = this.settings.restMinutes * 60;
        } else {
            this.isWorkSession = true;
            this.timeRemaining = this.settings.workMinutes * 60;
        }
        this.updateTimerDisplay();
    }

    recordFocusSession() {
        const date = new Date().toISOString().split('T')[0];
        const sessions = this.storage.get('dailySessions', {});
        const current = sessions[date];
        if (typeof current === 'number') sessions[date] += this.settings.workMinutes;
        else if (current && typeof current === 'object') {
            current.Arabic = (Number(current.Arabic) || 0) + this.settings.workMinutes;
        } else sessions[date] = this.settings.workMinutes;
        this.storage.set('dailySessions', sessions);

        const stats = this.storage.get('timerStats', {
            sessionsCompleted: 0,
            totalBreaks: 0,
            totalMinutesStudied: 0
        });
        stats.sessionsCompleted = (Number(stats.sessionsCompleted) || 0) + 1;
        stats.totalMinutesStudied = (Number(stats.totalMinutesStudied) || 0) + this.settings.workMinutes;
        this.storage.set('timerStats', stats);

        const streak = this.storage.get('streakData', {
            currentStreak: 0,
            longestStreak: 0,
            lastDate: null,
            studyDates: []
        });
        if (streak.lastDate !== date) {
            const previous = streak.lastDate ? new Date(`${streak.lastDate}T00:00:00Z`) : null;
            const today = new Date(`${date}T00:00:00Z`);
            const consecutive = previous && (today - previous) / 86400000 === 1;
            streak.currentStreak = consecutive ? (Number(streak.currentStreak) || 0) + 1 : 1;
            streak.longestStreak = Math.max(Number(streak.longestStreak) || 0, streak.currentStreak);
            streak.lastDate = date;
            streak.studyDates = [...new Set([...(streak.studyDates || []), date])];
            this.storage.set('streakData', streak);
        }
        this.renderProgress();
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        document.getElementById('focusTimerDisplay').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('focusTimerPhase').textContent =
            this.text(this.isWorkSession ? 'workSession' : 'restSession');
    }

    allCards() {
        return this.decks.flatMap(deck => deck.cards.map(card => ({ ...card, deckId: deck.id })));
    }

    findCard(cardId) {
        for (const deck of this.decks) {
            const card = deck.cards.find(item => item.id === cardId);
            if (card) return card;
        }
        return null;
    }

    renderDecks() {
        const select = document.getElementById('flashcardDeckSelect');
        const previous = this.selectedDeckId || select.value;
        select.replaceChildren();
        if (!this.decks.length) {
            const empty = document.createElement('option');
            empty.value = '';
            empty.textContent = this.text('createDeckFirst');
            select.appendChild(empty);
            select.disabled = true;
            document.getElementById('flashcardForm').querySelectorAll('input, textarea, button')
                .forEach(element => { element.disabled = true; });
            document.getElementById('reviewFlashcards').disabled = true;
        } else {
            this.decks.forEach(deck => {
                const option = document.createElement('option');
                option.value = deck.id;
                option.textContent = deck.title;
                select.appendChild(option);
            });
            this.selectedDeckId = this.decks.some(deck => deck.id === previous) ? previous : this.decks[0].id;
            select.value = this.selectedDeckId;
            select.disabled = false;
            document.getElementById('flashcardForm').querySelectorAll('input, textarea, button')
                .forEach(element => { element.disabled = false; });
            document.getElementById('reviewFlashcards').disabled = !this.allCards().length;
        }
        this.renderCards();
    }

    renderCards() {
        const container = document.getElementById('flashcardList');
        const deck = this.decks.find(item => item.id === this.selectedDeckId);
        const cards = deck?.cards || [];
        document.getElementById('flashcardCount').textContent =
            this.text('flashcardCount', { count: String(cards.length) });
        container.replaceChildren();
        if (!cards.length) {
            const empty = document.createElement('p');
            empty.className = 'empty-inline';
            empty.textContent = this.text('noFlashcards');
            container.appendChild(empty);
            document.getElementById('reviewFlashcards').disabled = !this.allCards().length;
            return;
        }
        cards.forEach(card => {
            const row = document.createElement('article');
            row.className = 'flashcard-row';
            const details = document.createElement('div');
            details.className = 'flashcard-content';
            const questionSide = document.createElement('div');
            questionSide.className = 'flashcard-side';
            const questionLabel = document.createElement('span');
            questionLabel.className = 'flashcard-side-label';
            questionLabel.textContent = this.text('questionSide');
            const front = document.createElement('strong');
            front.textContent = card.front;
            questionSide.append(questionLabel, front);
            const answerSide = document.createElement('div');
            answerSide.className = 'flashcard-side';
            const answerLabel = document.createElement('span');
            answerLabel.className = 'flashcard-side-label';
            answerLabel.textContent = this.text('answerSide');
            const back = document.createElement('p');
            back.textContent = card.back;
            answerSide.append(answerLabel, back);
            const status = document.createElement('small');
            status.className = 'flashcard-status';
            status.textContent = this.text(card.status === 'known' ? 'known' : 'needsReviewStatus');
            details.append(questionSide, answerSide, status);
            const actions = document.createElement('div');
            actions.className = 'focus-actions';
            [['known', 'markKnown'], ['review', 'needsReview'], ['delete', 'deleteTask']]
                .forEach(([action, key]) => {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'btn btn-secondary';
                    button.dataset.cardAction = action;
                    button.dataset.cardId = card.id;
                    button.textContent = this.text(key);
                    actions.appendChild(button);
                });
            row.append(details, actions);
            container.appendChild(row);
        });
        document.getElementById('reviewFlashcards').disabled = !this.allCards().length;
    }

    renderProgress() {
        const sessions = this.storage.get('dailySessions', {});
        const totalMinutes = Object.values(sessions).reduce((total, entry) => {
            if (typeof entry === 'number') return total + (Number.isFinite(entry) ? entry : 0);
            if (!entry || typeof entry !== 'object') return total;
            return total + Object.values(entry).reduce((sum, minutes) =>
                sum + (Number.isFinite(Number(minutes)) ? Number(minutes) : 0), 0);
        }, 0);
        document.getElementById('toolsStudyTime').textContent = String(Math.round(totalMinutes));
        const stats = this.storage.get('timerStats', {});
        document.getElementById('toolsFocusSessions').textContent =
            String(Number(stats.sessionsCompleted) || 0);
        const streak = this.storage.get('streakData', {});
        const today = new Date();
        const lastStudyDate = streak.lastDate ? new Date(`${streak.lastDate}T00:00:00Z`) : null;
        const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        const daysSinceStudy = lastStudyDate ? (todayUtc - lastStudyDate) / 86400000 : Infinity;
        document.getElementById('toolsStudyStreak').textContent =
            String(daysSinceStudy <= 1 ? Number(streak.currentStreak) || 0 : 0);
    }

    isSafeCheckpoint() {
        if (!document.getElementById('quizSession').classList.contains('hidden')) return false;
        if (document.querySelector('.chat-edit-form')) return false;
        if (document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return false;
        return ![...this.dirtyForms].some(form => form.isConnected);
    }

    checkPendingPrompt() {
        if (!this.allCards().length) return;
        if (this.focusSeconds >= this.nextPromptAt) this.pendingPrompt = true;
        if (this.pendingPrompt && !document.getElementById('flashcardPrompt').open
            && this.isSafeCheckpoint()) this.openRandomCard(true);
    }

    openRandomCard(isScheduled) {
        const cards = this.allCards();
        if (!cards.length) return;
        if (!this.isSafeCheckpoint()) {
            window.PortalUI.showFormMessage(
                document.getElementById('toolFeedback'),
                this.text('safeCheckpointDeferred'),
                'error'
            );
            return;
        }
        const card = cards[Math.floor(Math.random() * cards.length)];
        this.promptCard = { id: card.id, isScheduled };
        this.resumeAfterPrompt = this.isRunning;
        if (this.isRunning) this.pauseTimer();
        document.getElementById('flashcardPromptFront').textContent = card.front;
        document.getElementById('flashcardPromptBack').textContent = card.back;
        document.getElementById('flashcardPromptAnswer').classList.add('hidden');
        document.getElementById('flashcardPromptReveal').classList.remove('hidden');
        document.getElementById('flashcardPrompt').showModal();
        document.getElementById('flashcardPromptReveal').focus();
    }

    finishPrompt(status) {
        if (!this.promptCard) return;
        const card = this.findCard(this.promptCard.id);
        if (card) {
            card.status = status;
            this.storage.set('flashcardDecks', this.decks);
        }
        const isScheduled = this.promptCard.isScheduled;
        this.promptCard = null;
        if (isScheduled) {
            this.pendingPrompt = false;
            this.nextPromptAt = this.focusSeconds + this.settings.promptInterval * 60;
        }
        document.getElementById('flashcardPrompt').close();
        this.renderCards();
        window.PortalUI.showFormMessage(document.getElementById('toolFeedback'), '', '');
        if (this.resumeAfterPrompt) this.startTimer();
        this.resumeAfterPrompt = false;
    }

    refreshLanguage() {
        this.renderTasks();
        this.renderDecks();
        this.updateTimerDisplay();
        this.renderProgress();
    }
};
