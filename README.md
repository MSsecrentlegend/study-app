# Study Portal

A bilingual (English/Arabic) study portal with a dashboard, shared community chat, YouTube lessons, question-by-question exams, downloadable study files, and learner profiles.

## Run locally

1. Install Node.js if it is not already installed.
2. From this folder, run `node start-server.js`.
3. Open `http://localhost:8000`.

Without a configured backend, progress is saved in the current browser. Accounts, cross-device sync, group chat, and shared-content management require Supabase.

## Enable accounts and cross-device sync

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql). If you already set up the portal, run it again to apply the owner-only permissions.
3. In [`supabase-config.js`](./supabase-config.js), set the project URL and the project's **anon/public** key:

   ```js
   window.STUDY_APP_CONFIG = {
       supabaseUrl: 'https://your-project.supabase.co',
       supabaseAnonKey: 'your-anon-or-publishable-key'
   };
   ```

   The anon/public key is intended for browser use. **Never put a service-role key in this file.** Row-level security in the schema protects user progress and restricts shared-content management.
4. In Supabase Auth, enable email confirmations and configure the site URL plus allowed redirect URLs for your site (for local testing, `http://localhost:8000`). The default **Confirm signup** email link works; custom SMTP is optional.
5. Reload the site and create your account from **Profile**. Open the confirmation email and click its link to finish signing up. Signed-in progress then syncs with that account across devices.

### Owner-only content management

Only the verified `mohamed.sonic369@gmail.com` account is designated as platform owner. The schema grants that account sole permission to add, edit, or delete shared videos, exams, and files; other learners can sign up and use the portal but cannot manage content. Existing administrator flags for other accounts are cleared when the schema is applied. Keep the owner email unchanged in the schema unless you intentionally want to transfer ownership. Use [`sample-quiz.json`](./sample-quiz.json) as a starting point for exam question formatting. Uploaded files are stored in the private `study-resources` bucket created by the schema.

## Using the portal

- **Dashboard:** progress, upcoming exams, recently added videos, and recent community messages.
- **Community:** one shared chat for signed-in learners.
- **Videos:** browse lessons by subject, view YouTube thumbnails, and watch a lesson.
- **Exams:** answer one question at a time and review previous results.
- **Files:** preview supported PDFs, text, Markdown, and images, or download them.
- **Profile:** manage account details and choose English or Arabic in Settings.

## Deployment notes

Host the static app files on a web host that serves `index.html`, `script.js`, `style.css`, `portal-backend.js`, and `supabase-config.js`. Add the deployed origin to Supabase Auth's allowed site and redirect URLs. Keep the Supabase anon/public key in the browser config; the schema's row-level security policies must remain enabled.
