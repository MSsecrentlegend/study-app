window.PortalBackend = {
    client: null,
    storage: null,
    ui: null,
    user: null,
    profile: null,
    configured: false,
    suppressProgressSync: false,
    progressSyncTimer: null,
    chatPollTimer: null,

    async loadClientLibrary() {
        if (window.supabase?.createClient) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            script.onload = resolve;
            script.onerror = () => reject(new Error('Could not load the account service library.'));
            document.head.appendChild(script);
        });
        if (!window.supabase?.createClient) {
            throw new Error('The account service library did not initialize.');
        }
    },

    async init(ui, storage) {
        this.ui = ui;
        this.storage = storage;
        const config = window.STUDY_APP_CONFIG || {};
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            this.ui.onBackendStatus(false);
            return;
        }

        try {
            await this.loadClientLibrary();
            this.client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
            this.configured = true;
            this.ui.onBackendStatus(true);
            this.client.auth.onAuthStateChange((_event, session) => {
                window.setTimeout(() => {
                    this.applySession(session).catch(error => {
                        console.error('Account session update failed:', error);
                        this.ui.showBackendError(error.message);
                    });
                }, 0);
            });
            const { data, error } = await this.client.auth.getSession();
            if (error) throw error;
            await this.applySession(data.session);
        } catch (error) {
            console.error('Cloud service initialization failed:', error);
            this.ui.showBackendError(error.message);
        }
    },

    isAdmin() {
        return Boolean(
            this.profile?.is_admin
            && this.user?.email?.toLowerCase() === 'mohamed.sonic369@gmail.com'
        );
    },

    async applySession(session) {
        const nextUser = session?.user || null;
        if (this.user?.id !== nextUser?.id) {
            window.clearTimeout(this.progressSyncTimer);
            this.progressSyncTimer = null;
        }
        this.user = nextUser;
        this.storage.setUserScope(this.user?.id);
        this.profile = null;
        if (this.user) {
            const { data, error } = await this.client
                .from('profiles')
                .select('id,display_name,is_admin')
                .eq('id', this.user.id)
                .maybeSingle();
            if (error) {
                this.ui.showBackendError(error.message);
                return;
            }
            this.profile = data;
        }
        this.ui.onSessionChanged(this.user, this.profile, this.isAdmin());
        if (!this.user) {
            window.clearInterval(this.chatPollTimer);
            this.chatPollTimer = null;
            this.ui.renderChatMessages([]);
            this.ui.renderNotifications([]);
            this.ui.setSharedFiles([]);
            return;
        }
        try {
            await Promise.all([
                this.loadProgress(),
                this.loadContent(),
                this.loadChat()
            ]);
            await this.loadExamResults();
            this.startChatPolling();
        } catch (error) {
            console.error('Cloud data loading failed:', error);
            this.ui.showBackendError(error.message);
        }
    },

    async signUp(name, email, password) {
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: { data: { display_name: name } }
        });
        if (error) throw error;
        return data;
    },

    async verifySignUpEmail(email, token) {
        const { data, error } = await this.client.auth.verifyOtp({
            email,
            token,
            type: 'signup'
        });
        if (error) throw error;
        return data;
    },

    async resendSignUpConfirmation(email) {
        const { error } = await this.client.auth.resend({ type: 'signup', email });
        if (error) throw error;
    },

    async signIn(email, password) {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
    },

    async updateProfile({ name, email, password }) {
        const updates = { data: { display_name: name } };
        if (email !== this.user.email) updates.email = email;
        if (password) updates.password = password;
        const { error: authError } = await this.client.auth.updateUser(updates);
        if (authError) throw authError;
        const { error: profileError } = await this.client
            .from('profiles')
            .update({ display_name: name })
            .eq('id', this.user.id);
        if (profileError) throw profileError;
        await this.applySession((await this.client.auth.getSession()).data.session);
    },

    async saveExamResult(result) {
        if (!this.user) return null;
        const examId = typeof result.examId === 'string'
            && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result.examId)
            ? result.examId
            : null;
        const { data, error } = await this.client.from('exam_results').insert({
            attempt_id: result.attemptId,
            user_id: this.user.id,
            exam_id: examId,
            student_name: result.studentName || this.profile?.display_name || this.user.email || 'Learner',
            quiz_title: result.quizTitle,
            score: result.score,
            correct_count: result.correctCount,
            total_questions: result.totalQuestions,
            created_at: result.date
        }).select('id').single();
        if (error) throw error;
        return data;
    },

    async loadExamResults() {
        if (!this.user) return;
        const { data, error } = await this.client.from('exam_results')
            .select('id,attempt_id,student_name,quiz_title,score,correct_count,total_questions,created_at')
            .eq('user_id', this.user.id)
            .order('created_at', { ascending: true });
        if (error) throw error;

        const results = this.storage.get('quizResults', []);
        const resultIndexes = new Map(results.map((result, index) => [result.attemptId, index]));
        data.forEach(row => {
            const result = {
                attemptId: row.attempt_id || row.id,
                studentName: row.student_name,
                quizTitle: row.quiz_title,
                score: row.score,
                correctCount: row.correct_count,
                totalQuestions: row.total_questions,
                date: row.created_at
            };
            const index = resultIndexes.get(result.attemptId);
            if (index === undefined) {
                resultIndexes.set(result.attemptId, results.length);
                results.push(result);
            } else {
                results[index] = result;
            }
        });
        this.storage.set('quizResults', results);
        this.ui.refreshAfterSync();
    },

    async loadProgress() {
        const { data, error } = await this.client
            .from('user_progress')
            .select('data')
            .eq('user_id', this.user.id)
            .maybeSingle();
        if (error) {
            this.ui.showBackendError(error.message);
            return;
        }

        const excludedKeys = new Set(['videos', 'exams', 'files', 'profileName']);
        const remoteData = Object.fromEntries(
            Object.entries(data?.data || {}).filter(([key]) => !excludedKeys.has(key))
        );
        this.suppressProgressSync = true;
        try {
            this.storage.replaceAll(remoteData);
        } finally {
            this.suppressProgressSync = false;
        }
        await this.saveProgress(remoteData);
        this.ui.refreshAfterSync();
    },

    scheduleProgressSync() {
        if (!this.configured || !this.user || this.suppressProgressSync) return;
        window.clearTimeout(this.progressSyncTimer);
        this.progressSyncTimer = window.setTimeout(() => {
            this.syncProgress().catch(error => {
                console.error('Progress sync failed:', error);
                this.ui.showBackendError(error.message);
            });
        }, 700);
    },

    async syncProgress() {
        if (!this.user) return;
        const excludedKeys = new Set(['videos', 'exams', 'files', 'profileName']);
        const data = Object.fromEntries(
            this.storage.getAllKeys()
                .filter(key => !excludedKeys.has(key))
                .map(key => [key, this.storage.get(key)])
        );
        await this.saveProgress(data);
    },

    async saveProgress(data) {
        if (!this.user) return;
        const { error } = await this.client.from('user_progress').upsert({
            user_id: this.user.id,
            data,
            updated_at: new Date().toISOString()
        });
        if (error) throw error;
    },

    async loadContent() {
        const [videos, exams, files] = await Promise.all([
            this.client.from('videos').select('id,title,youtube_id,subject,created_at').order('created_at', { ascending: false }),
            this.client.from('exams').select('id,title,description,subject,due_at,questions,created_at').order('created_at', { ascending: false }),
            this.client.from('study_files').select('id,title,description,subject,object_path,mime_type,created_at').order('created_at', { ascending: false })
        ]);

        for (const result of [videos, exams, files]) {
            if (result.error) {
                this.ui.showBackendError(result.error.message);
                return;
            }
        }

        this.ui.setSharedVideos(videos.data.map(row => ({
            id: row.id,
            title: row.title,
            videoId: row.youtube_id,
            subject: row.subject,
            addedAt: row.created_at
        })));
        this.ui.setSharedExams(exams.data.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            subject: row.subject,
            dueDate: row.due_at,
            questions: row.questions
        })));

        const signedFiles = await Promise.all(files.data.map(async file => {
            const downloadName = this.fileDownloadName(file.title, file.object_path, file.mime_type);
            const { data, error } = await this.client.storage
                .from('study-resources')
                .createSignedUrl(file.object_path, 3600);
            if (error) throw error;
            const { data: downloadData, error: downloadError } = await this.client.storage
                .from('study-resources')
                .createSignedUrl(file.object_path, 3600, { download: downloadName });
            if (downloadError) throw downloadError;
            return {
                id: file.id,
                name: file.title,
                description: file.description,
                subject: file.subject,
                url: data.signedUrl,
                downloadUrl: downloadData.signedUrl,
                downloadName,
                type: file.mime_type,
                objectPath: file.object_path
            };
        }));
        this.ui.setSharedFiles(signedFiles);
    },

    fileDownloadName(title, objectPath, mimeType) {
        const mimeExtensions = {
            'application/pdf': 'pdf',
            'text/plain': 'txt',
            'text/markdown': 'md',
            'image/png': 'png',
            'image/jpeg': 'jpg',
            'image/gif': 'gif'
        };
        const storedExtension = objectPath.split('/').pop()?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
        const extension = mimeExtensions[mimeType] || storedExtension;
        const safeTitle = title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'download';
        const baseTitle = safeTitle.replace(/\.(pdf|txt|md|png|jpe?g|gif)$/i, '');
        return extension ? `${baseTitle}.${extension}` : safeTitle;
    },

    async publishVideo(video) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { data, error } = await this.client.from('videos').insert({
            title: video.title,
            youtube_id: video.videoId,
            subject: video.subject,
            created_by: this.user.id
        }).select('id,title,youtube_id,subject,created_at').single();
        if (error) throw error;
        return {
            id: data.id,
            title: data.title,
            videoId: data.youtube_id,
            subject: data.subject,
            addedAt: data.created_at
        };
    },

    async updateVideo(id, video) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { data, error } = await this.client.from('videos').update({
            title: video.title,
            youtube_id: video.videoId,
            subject: video.subject
        }).eq('id', id).select('id,title,youtube_id,subject,created_at').single();
        if (error) throw error;
        return {
            id: data.id,
            title: data.title,
            videoId: data.youtube_id,
            subject: data.subject,
            addedAt: data.created_at
        };
    },

    async deleteVideo(id) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { error } = await this.client.from('videos').delete().eq('id', id).select('id').single();
        if (error) throw error;
    },

    async publishExam(exam) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { data, error } = await this.client.from('exams').insert({
            title: exam.title,
            description: exam.description || '',
            subject: exam.subject || 'Arabic',
            due_at: exam.dueDate || null,
            questions: exam.questions,
            created_by: this.user.id
        }).select('id,title,description,subject,due_at,questions').single();
        if (error) throw error;
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            dueDate: data.due_at,
            questions: data.questions
        };
    },

    async updateExam(id, exam) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { data, error } = await this.client.from('exams').update({
            title: exam.title,
            description: exam.description || '',
            subject: exam.subject || 'Arabic',
            due_at: exam.dueDate || null,
            questions: exam.questions
        }).eq('id', id).select('id,title,description,subject,due_at,questions').single();
        if (error) throw error;
        return {
            id: data.id,
            title: data.title,
            description: data.description,
            subject: data.subject,
            dueDate: data.due_at,
            questions: data.questions
        };
    },

    async deleteExam(id) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { error } = await this.client.from('exams').delete().eq('id', id).select('id').single();
        if (error) throw error;
    },

    async uploadFile(file, subject, title, description = '') {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const safeName = file.name.replace(/[^\w.-]+/g, '_');
        const objectPath = `${subject}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await this.client.storage
            .from('study-resources')
            .upload(objectPath, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { error: metadataError } = await this.client.from('study_files').insert({
            title,
            description,
            subject,
            object_path: objectPath,
            mime_type: file.type,
            created_by: this.user.id
        });
        if (metadataError) {
            const { error: cleanupError } = await this.client.storage
                .from('study-resources')
                .remove([objectPath]);
            if (cleanupError) console.error('Uploaded file cleanup failed:', cleanupError);
            throw metadataError;
        }
        await this.loadContent();
    },

    async updateFile(id, { file, subject, title, description = '' }) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        let newObjectPath = null;
        let oldObjectPath = null;
        const updates = { title, subject, description };
        if (file) {
            const { data: currentFile, error: currentFileError } = await this.client
                .from('study_files')
                .select('object_path')
                .eq('id', id)
                .single();
            if (currentFileError) throw currentFileError;
            oldObjectPath = currentFile.object_path;
            const safeName = file.name.replace(/[^\w.-]+/g, '_');
            newObjectPath = `${subject}/${Date.now()}-${safeName}`;
            const { error: uploadError } = await this.client.storage
                .from('study-resources')
                .upload(newObjectPath, file, { contentType: file.type, upsert: false });
            if (uploadError) throw uploadError;
            updates.object_path = newObjectPath;
            updates.mime_type = file.type;
        }

        const { error } = await this.client.from('study_files')
            .update(updates)
            .eq('id', id)
            .select('object_path')
            .single();
        if (error) {
            if (newObjectPath) {
                const { error: cleanupError } = await this.client.storage
                    .from('study-resources')
                    .remove([newObjectPath]);
                if (cleanupError) console.error('Replacement file cleanup failed:', cleanupError);
            }
            throw error;
        }
        if (oldObjectPath) {
            const { error: cleanupError } = await this.client.storage
                .from('study-resources')
                .remove([oldObjectPath]);
            if (cleanupError) {
                await this.loadContent();
                throw new Error(`File details were updated, but the replaced file could not be removed: ${cleanupError.message}`);
            }
        }
        await this.loadContent();
    },

    async deleteFile(id) {
        if (!this.isAdmin()) throw new Error('Only the platform owner can manage shared content.');
        const { data, error } = await this.client.from('study_files')
            .delete()
            .eq('id', id)
            .select('object_path')
            .single();
        if (error) throw error;
        const { error: storageError } = await this.client.storage
            .from('study-resources')
            .remove([data.object_path]);
        await this.loadContent();
        if (storageError) {
            throw new Error(`File entry was deleted, but the stored file could not be removed: ${storageError.message}`);
        }
    },

    async loadChat() {
        if (!this.user) return;
        const { data, error } = await this.client
            .from('chat_messages')
            .select('id,user_id,body,created_at,profiles(display_name)')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) {
            this.ui.showBackendError(error.message);
            return;
        }
        this.ui.renderChatMessages(data.reverse());
    },

    startChatPolling() {
        window.clearInterval(this.chatPollTimer);
        this.chatPollTimer = window.setInterval(() => {
            this.loadChat().catch(error => {
                console.error('Chat refresh failed:', error);
                this.ui.showBackendError(error.message);
            });
        }, 5000);
    },

    async sendChat(body) {
        const { error } = await this.client.from('chat_messages').insert({
            user_id: this.user.id,
            body
        });
        if (error) throw error;
        await this.loadChat();
    }
};
