# Portal Backend Setup

The portal uses Supabase for accounts, cross-device progress sync, shared videos/exams/files, and the community chat. The old server-upload and CSV-results instructions no longer apply.

1. Create a Supabase project.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) in its SQL Editor. Rerun it after updates; it now creates the per-account `exam_results` table and policies used to save exam scores.
3. Add the project's URL and anon/public key to [`supabase-config.js`](./supabase-config.js). Never use a service-role key in the browser.
4. In Supabase **Authentication > Sign In / Providers**, enable email/password authentication and turn **Confirm email** off. Signup then signs users in immediately and does not require confirmation-email SMTP. Since addresses are not verified, users can enter an address they do not own; do not rely on email as proof of identity.
5. Configure the Supabase Auth **Site URL** and allowed redirect URLs for your deployed portal. For local testing, add `http://localhost:8000`; replace the Site URL with your deployed URL before launch.
6. Create an account from **Profile**. If the signup form reports that confirmation is still enabled, recheck the Supabase setting.

Email confirmation is not needed for signup. Supabase may still use email for account recovery or email changes; configure custom SMTP only if you want those messages. For Resend, verify a domain you control and add its DNS records, then use host `smtp.resend.com`, port `465` or `587`, username `resend`, and your Resend API key as the SMTP password. Keep the key in Supabase only; never put it in `supabase-config.js`.

The schema does not automatically grant owner privileges based on an email address, because signup email addresses are unverified when confirmation is disabled. To make your account the platform owner, find your account's UUID in Supabase **Authentication > Users**, then run this once in the SQL Editor, replacing the placeholder with that UUID:

```sql
update public.profiles set is_admin = true where id = '<your-auth-user-uuid>';
```

Only the project owner should run this. The platform owner can publish announcements and manage shared videos, exams, and files. Other accounts cannot manage shared content.

The schema also creates the `user_profiles` table and private `profile-avatars` bucket for profile bios and pictures. Rerun the schema after updates. Profile bio visibility is controlled by each user's privacy setting; profile pictures are visible to signed-in chat participants.

Learning progress is stored separately for each signed-in account; the browser also keeps a separate local cache per account. Guest progress remains on the device and is not merged into an account.

Exam attempts use the signed-in account's profile name and are stored in `exam_results`; guests can still take exams, but their results stay on the device.

For detailed setup and deployment steps, see [README.md](./README.md).
