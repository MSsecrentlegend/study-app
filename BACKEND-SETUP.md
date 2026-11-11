# Portal Backend Setup

The portal uses Supabase for accounts, cross-device progress sync, shared videos/exams/files, and the community chat. The old server-upload and CSV-results instructions no longer apply.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor. Rerun it after updates; it now creates the per-account `exam_results` table and policies used to save exam scores.
3. Add the project's URL and anon/public key to [`supabase-config.js`](./supabase-config.js). Never use a service-role key in the browser.
4. Enable email confirmations and configure the Supabase Auth site URL and allowed redirect URLs for the portal (for local testing, `http://localhost:8000`). The default confirmation email link works; custom SMTP is optional.
5. Reload the portal and create an account from **Profile**, then click the confirmation link sent by email.

Supabase may limit confirmation emails during testing. If you see a rate-limit message, wait before requesting another email, sign in if the account already exists, or configure SMTP in Supabase Auth for reliable testing.

The schema grants content-management access only to the verified account `mohamed.sonic369@gmail.com`. That owner account can add, edit, and delete videos, exams, and files. Other accounts cannot manage shared content.

Learning progress is stored separately for each signed-in account; the browser also keeps a separate local cache per account. Guest progress remains on the device and is not merged into an account.

Exam attempts use the signed-in account's profile name and are stored in `exam_results`; guests can still take exams, but their results stay on the device.

For detailed setup and deployment steps, see [README.md](./README.md).
