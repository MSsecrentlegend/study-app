# Study Portal

A bilingual (English/Arabic) study portal with a dashboard, shared community chat, YouTube lessons, question-by-question exams, downloadable study files, and learner profiles.

## Run locally

1. Install Node.js if it is not already installed.
2. From this folder, run `node start-server.js`.
3. Open `http://localhost:8000`.

Without a configured backend, progress is saved in the current browser. Accounts, cross-device sync, group chat, and shared-content management require Supabase.

## Enable accounts and cross-device sync

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). Rerun it after schema updates, then follow [BACKEND-SETUP.md](./BACKEND-SETUP.md) to assign the platform owner.
3. In [`supabase-config.js`](./supabase-config.js), set the project URL and the project's **anon/public** key:

   ```js
   window.STUDY_APP_CONFIG = {
       supabaseUrl: 'https://your-project.supabase.co',
       supabaseAnonKey: 'your-anon-or-publishable-key'
   };
   ```

   The anon/public key is intended for browser use. **Never put a service-role key in this file.** Row-level security in the schema protects user progress and restricts shared-content management.
4. In Supabase **Authentication > Sign In / Providers**, enable email/password authentication and turn **Confirm email** off so users sign in immediately without a confirmation page. Email addresses will not be verified; see [BACKEND-SETUP.md](./BACKEND-SETUP.md) for security implications and owner setup.
5. Set the Supabase Auth **Site URL** and allowed redirect URLs to your deployed portal URL. Add `http://localhost:8000` while testing locally.
6. Create an account from **Profile**. Custom SMTP is optional for signup; it is only needed if you want Supabase to send recovery or email-change messages.

### Owner-only content management

The platform owner is assigned explicitly by the project owner using the account UUID in Supabase, rather than by an unverified email address. See [BACKEND-SETUP.md](./BACKEND-SETUP.md) for the one-time SQL step. The owner can publish announcements and manage shared videos, exams, and files; other learners cannot manage shared content. Use [`sample-quiz.json`](./sample-quiz.json) as a starting point for exam question formatting. Uploaded files and profile pictures use private Supabase Storage buckets. Profile pictures are shown to signed-in chat participants; profile bios follow each user's privacy setting.

## Using the portal

- **Dashboard:** progress, upcoming exams, recently added videos, and recent community messages.
- **Community:** one shared chat for signed-in learners.
- **Videos:** browse lessons by subject, view YouTube thumbnails, and watch a lesson.
- **Exams:** answer one question at a time and review previous results.
- **Files:** preview supported PDFs, text, Markdown, and images, or download them.
- **Profile:** manage account details and choose English or Arabic in Settings.
- **Settings:** new accounts start in dark mode and Arabic; change either preference at any time.

## Deployment notes

Host the static app files on a web host that serves `index.html`, `script.js`, `style.css`, `portal-backend.js`, and `supabase-config.js`. Add the deployed origin to Supabase Auth's allowed site and redirect URLs. Keep the Supabase anon/public key in the browser config; the schema's row-level security policies must remain enabled.
