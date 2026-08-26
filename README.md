# St. John's English School ERP

A responsive school ERP for **St. John's English School, Dankuni, Hooghly 712311**. The application is built directly on the school's authoritative 26-table Supabase schema. Library and Transport are intentionally excluded.

## Included schema-backed modules

- Masters: departments, classes, subjects and vendors
- People: students, employees and users
- Attendance: student and employee attendance
- Finance: fee collection, expenses, income and salary slips
- HR: leave applications, leave balances, warning letters, offer letters and employee documents
- Assets: assets and inventory
- Identity: teacher ID cards, student ID cards and escort cards
- Academics: assignments and notice automation
- System: user activity logs

Every form and data grid uses the exact table fields and primary keys defined in Supabase. Student ID cards include photo selection, QR code, PDF download, print and a database record in `student_idcard`.

## Run locally

1. Install Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` to `https://dbliogptcikqyzkbqnus.supabase.co` and set the public anon key.
4. Run `npm install`, then `npm run dev`.
5. Put the official logo at `public/logo-final.jpg`.

The production UI requires Supabase configuration. Secrets are not committed to this repository.

## Supabase setup

Install the Supabase CLI, sign in, and link this repository to project ref `dbliogptcikqyzkbqnus`. Review the migrations, then apply them with `supabase db push`. Migration `202608190010_authoritative_master_schema.sql` aligns the 26 supplied tables and applies the secure Auth bridge, roles, indexes and row-level security policies.

The anon key is safe to expose only when RLS is correctly enabled. It identifies the project; it is not an administrator secret. Never put the service-role key, Google client secret, or OAuth refresh tokens in browser variables or GitHub source. Keep service credentials in Supabase Edge Function secrets. Rotate the previously shared anon key in the Supabase dashboard if you prefer clean credential hygiene.

Supabase Auth is the only password authority. The `user_master.password` field is retained only for compatibility and stores the marker `SUPABASE_AUTH`, never a real password. Verify RLS with separate test accounts, enable MFA for administrators, configure allowed Auth redirect URLs, add rate limits and retain audit logs before importing sensitive records.

## Google Drive documents

1. Create a Google Cloud project and OAuth consent screen.
2. Enable the Google Drive API.
3. Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` and the plain folder ID (not the folder URL) as Supabase Edge Function secrets.
4. Deploy the server-side `google-drive-upload` function after reviewing its allowed file types and size limits.

Drive is reserved for generated ID-card and result PDFs. Structured ERP data remains in Supabase. OAuth secrets and refresh tokens must never be added to Vite variables or browser code.

## Publish on GitHub

Create an empty GitHub repository, then from this folder run:

```bash
git init
git add .
git commit -m "Initial St. John's School ERP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Do not commit `.env.local`; it is ignored. Add production environment values in your hosting provider (Vercel, Netlify or Cloudflare Pages), set build command to `npm run build`, and publish directory to `dist`.

This repository includes an automatic GitHub Pages workflow configured for `stjes`. After the first push, open repository **Settings → Pages**, select **GitHub Actions** as the source, and the site will publish at `https://stjjohnsenglishschool-a11y.github.io/stjes/`.

## Production note

This repository supplies a broad, secure foundation and complete dashboard experience, not a finished statutory/compliance product. Confirm your board affiliation, fee rules, report-card format, retention policy and Indian privacy obligations with the school before importing real student data.
