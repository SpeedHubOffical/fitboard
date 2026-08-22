# FitBoard

A Pinterest-style outfit marketplace. Post a look, tag buy links per item, everyone can browse and shop.

## What's shared vs personal

- **Shared (everyone sees it)**: the outfit feed — stored in Supabase, so every visitor sees the same posts.
- **Personal (just your browser)**: dark/light mode, liked outfits, saved outfits, your profile. Stored in `localStorage`, so it won't follow you to a different device or browser yet. Adding real accounts is a future step.

## 1. Set up Supabase (free)

1. Go to https://supabase.com, sign up, create a new project (pick any name/password — free tier is fine).
2. Once it's ready, go to the **SQL Editor** in the left sidebar, click **New query**, paste in everything from `supabase-setup.sql` in this folder, and click **Run**.
3. Go to **Storage** in the left sidebar, click **New bucket**, name it exactly `outfit-images`, and toggle **Public bucket** ON before creating it.
4. Go to **Project Settings > API**. You'll need two values from this page:
   - **Project URL**
   - **anon public** key

## 2. Connect your project to Supabase

1. Copy `.env.example` to a new file named `.env`
2. Paste in your Project URL and anon key:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 3. Run it locally (optional, to test first)

```
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## 4. Deploy to Vercel (free)

**Option A — via GitHub (recommended)**
1. Push this folder to a new GitHub repo (create one at github.com/new, then follow its instructions to push this code).
2. Go to https://vercel.com, sign up/log in with GitHub.
3. Click **Add New > Project**, select your repo.
4. Before deploying, expand **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` → your Supabase anon key
5. Click **Deploy**. You'll get a live URL like `fitboard.vercel.app`.

**Option B — via Vercel CLI (no GitHub needed)**
```
npm install -g vercel
vercel
```
Follow the prompts. When asked, add the same two environment variables (`vercel env add VITE_SUPABASE_URL` and `vercel env add VITE_SUPABASE_ANON_KEY`), then run `vercel --prod`.

## Notes for later

- Right now anyone can post — there's no login. Fine for testing with friends, but before a public launch you'll want real accounts (Supabase Auth handles this) so people can't post under someone else's username.
- Product links are stored exactly as pasted — no affiliate wrapping yet. That's the next layer once you're ready to actually earn commission.
