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
4. In Supabase **Authentication > Sign In / Providers**, enable email/password authentication and keep **Confirm email** enabled.
5. Configure custom SMTP under **Authentication > SMTP Settings**. With Resend, verify a domain you own and add its DNS records, then use host `smtp.resend.com`, port `465` or `587`, username `resend`, your Resend API key as the SMTP password, and a sender address on that verified domain. Keep the key in Supabase only; never put it in website code.
6. In **Authentication > Email Templates > Confirm signup**, include `{{ .Token }}` so users receive a code to enter in the portal. Configure the Supabase Auth site URL and allowed redirect URLs (for local testing, `http://localhost:8000`).
7. From **Profile**, create an account, enter the emailed code to verify the address and sign in immediately.

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
