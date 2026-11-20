# Nobex Cademics — website starter

A responsive React + Vite + TypeScript starter for the Nobex Cademics university study platform.

## Included in this starter

- Premium navy, blue and gold responsive design
- Email/password registration and login using Supabase Auth
- Student dashboard
- Private PDF upload, listing and signed-link opening (25 MB limit)
- Reads each student's independent AI trial balances from `feature_usage`
- AI tool directory (8 tools)
- Pricing display in Nigerian naira: Free ₦0, Student ₦1,500, Pro ₦3,000, Super Pro ₦5,000
- CBT and subscription placeholder screens

## Not yet connected

This is a working frontend starter, not a complete production AI/payment platform. AI generation, animated video lessons, CBT generation, payment collection, subscription activation and secure trial deduction require server-side endpoints and provider credentials. The UI deliberately does not pretend those functions are live. Do not put AI keys, payment secret keys or Supabase service-role keys in frontend code.

Google sign-in is not required for this first release. Email/password works without Google Cloud OAuth credentials.

## 1. Requirements

Install Node.js (LTS) on a computer, then open a terminal in this project folder.

```bash
npm install
```

## 2. Connect your existing Supabase project

In Supabase Dashboard:
1. Open Project Settings → API (or API Keys).
2. Copy the Project URL.
3. Copy the publishable key (or legacy anon/public key). Never use the `service_role` or secret key in the browser.

Create a file named `.env` in the project root (same folder as `package.json`) with:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Restart the dev server after changing `.env`.

## 3. Set up private PDF storage

In Supabase → SQL Editor → New query:
1. Open `supabase-storage.sql` from this project.
2. Copy all its contents into the SQL editor.
3. Run it.

This creates a private `study-pdfs` bucket with per-user upload/read/delete policies. The app uses signed URLs to open PDFs.

The existing database tables from the earlier setup are expected:
- `profiles`
- `feature_usage`
- `subscriptions`
- `courses`
- `documents`
- `study_notes`

The app expects the `documents` table to contain `id`, `user_id`, `file_name`, `storage_path`, and `created_at`.

## 4. Run locally

```bash
npm run dev
```

Vite prints a local URL, usually `http://localhost:5173`. Open it in your browser.

To create the production build:

```bash
npm run build
```

## 5. Configure Supabase email redirects

In Supabase → Authentication → URL Configuration:
- Set Site URL to your deployed website URL after deployment.
- Add your local URL (for example `http://localhost:5173`) to Redirect URLs during testing.
- Add your deployed domain to Redirect URLs after publishing.

Keep email confirmation enabled if you want students to verify their email addresses.

## 6. Publish with Vercel

1. Create a GitHub account if you do not have one.
2. Create a new GitHub repository and upload this project folder.
3. Sign in at https://vercel.com and import that GitHub repository.
4. Vercel should detect Vite automatically. Build command: `npm run build`; output directory: `dist`.
5. In Vercel project settings → Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.
7. Copy the Vercel website URL and add it to Supabase Authentication → URL Configuration → Site URL and Redirect URLs.

Do not commit `.env` to GitHub. It is intentionally ignored by default only if you add a `.gitignore`; create one with `.env`, `node_modules`, and `dist`.

## Important production checklist

Before inviting students:
- Add server-side AI endpoints and enforce trial deduction atomically on the server.
- Add payment gateway integration (for example a Nigerian provider) and verify payment webhooks server-side before changing subscription plans.
- Add document deletion and retention controls.
- Configure email templates and a custom domain.
- Add rate limits, error monitoring, privacy policy and terms.
- Test with separate student accounts to confirm RLS isolation.
