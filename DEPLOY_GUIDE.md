# PlanIQ — Deployment Guide
**Stack:** Next.js 14 + Supabase + Vercel + Anthropic Claude**Version:** Early Access

---

## Prerequisites
- GitHub account
- [Supabase account](https://supabase.com) (free)
- [Vercel account](https://vercel.com) (free)
- [Anthropic API key](https://console.anthropic.com) (pay-as-you-go)
- Node.js 18+ installed locally
- Supabase CLI installed: `npm install -g supabase`

---

## Step 1 — Create Your Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Set a project name (e.g. `planiq-prod`) and a strong database password
3. Choose the region closest to your users
4. Wait ~2 minutes for the project to provision

---

## Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open `supabase/schema.sql` from this project
3. Paste the entire contents and click **Run**
4. You should see: "Success. No rows returned"

---

## Step 3 — Get Your API Keys

In your Supabase dashboard → **Settings → API**:

Copy these two values:
- **Project URL** → looks like `https://abcxyz.supabase.co`
- **anon public key** → long JWT string starting with `eyJ...`

---

## Step 4 — Set Up Local Environment

In the project root, create `.env.local`:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
NEXT_PUBLIC_APP_VERSION=v1.0.0-early-access
```

---

## Step 5 — Test Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the landing page.

Try signing up with your email. Check Supabase → **Authentication → Users** to confirm the user was created.

---

## Step 6 — Deploy the Edge Function (AI Analysis)

### 6a — Link your Supabase project
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
Your project ref is in the URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

### 6b — Set your Anthropic API key as a secret
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```
This stores the key server-side. It is **never** sent to the browser.

### 6c — Deploy the function
```bash
supabase functions deploy analyze-schedule
```

Test it's live: In your Supabase dashboard → **Edge Functions** → `analyze-schedule` should show as Active.

---

## Step 7 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — PlanIQ Early Access"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/planiq.git
git push -u origin main
```

---

## Step 8 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Add Environment Variables (same as your `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_VERSION`
5. Click **Deploy**

Your app will be live at `https://planiq.vercel.app` (or your custom domain).

---

## Step 9 — Configure Supabase Auth Redirect URL

In Supabase dashboard → **Authentication → URL Configuration**:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** add `https://your-app.vercel.app/**`

This is required for email confirmation links to work correctly.

---

## Step 10 — Install as PWA

On iOS Safari: tap **Share → Add to Home Screen**
On Android Chrome: tap **⋮ → Add to Home Screen**

The app installs like a native app with offline support.

---

## Future Steps (Post-Launch)

| Feature | How |
|---------|-----|
| Google Sign-In | Enable Google provider in Supabase Auth |
| Custom domain | Add domain in Vercel → update Supabase Site URL |
| Email confirm required | Toggle in Supabase Auth settings |
| Rate limiting AI | Add usage count to `ai_analyses` table, check before calling |
| Payments | Stripe + Supabase webhook |
| React Native | Expo + same Supabase backend, shared types |

---

## Troubleshooting

**"Invalid API key"** → Double-check `.env.local` values match exactly from Supabase dashboard.

**"Edge Function not found"** → Run `supabase functions deploy analyze-schedule` again and check the function is Active in the dashboard.

**Auth redirect loops** → Make sure Supabase Site URL and Redirect URLs match your Vercel deployment URL exactly.

**PWA not installing** → Make sure you're on HTTPS (Vercel provides this automatically). Localhost does not trigger PWA install prompts.

**ANTHROPIC_API_KEY not set error** → Run `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` and redeploy the function.
