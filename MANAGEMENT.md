# Shared Content Management

Shared content is managed only by the signed-in owner account. There is no separate upload password or local CSV results workflow.

## Initial setup

1. Follow [Backend Setup](./BACKEND-SETUP.md) to create and configure the Supabase project.
2. Create and confirm `mohamed.sonic369@gmail.com` from the portal's **Profile** tab. The schema grants this account owner access automatically.
3. Sign in again if the portal was already open.

## Publishing

- **Videos:** In **Videos**, add a title, subject, and YouTube link. Learners see its thumbnail and title and can watch it in the portal.
- **Exams:** In **Exams**, upload a JSON quiz containing a title and multiple-choice questions. The sample format is in [`sample-quiz.json`](./sample-quiz.json).
- **Files:** In **Files**, add a title, subject, and supported PDF, text, Markdown, or image file. Learners can preview or download it.

The Supabase schema enforces owner-only publishing and keeps the `study-resources` storage bucket private. Keep row-level security enabled and never put a service-role key in the website.
