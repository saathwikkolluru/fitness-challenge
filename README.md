# BCG Fitness Challenge (Shared Web App)

This is a lightweight, responsive web app that works on laptop and mobile via a link. It uses Supabase for shared data and image storage.

## What you need (free)
- Supabase (database + image storage)
- Vercel (hosting)

## Step 1: Create Supabase project
1. Go to Supabase and create a new project.
2. Open the SQL editor and run the SQL from `supabase.sql`.
3. Go to Storage and create two buckets:
   - `avatars` (public)
   - `entry-images` (public)

## Step 2: Add your Supabase keys
1. In Supabase, go to Project Settings > API.
2. Copy:
   - Project URL
   - Anon public key
3. Set those values in environment variables (the script picks them up):
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_ANON_KEY="sb_publishable_..."
   npm install       # only the first time
   npm run generate-config
   ```
   That writes `config.js` from `config.template.js`. Keep `config.js` out of Git.

## Step 3: Test locally
1. Run a quick server:
   ```bash
   python3 -m http.server 5173
   ```
2. Open `http://localhost:5173` in the browser.
3. When you update Supabase keys later, repeat `npm run generate-config` so `config.js` matches.

## Step 4: Deploy to Vercel
1. Create a free GitHub repo and push this folder (skip `config.js` because it’s ignored).
2. In Vercel, import the repo and set:
   - Build command: `npm run generate-config`
   - Output directory: `.` 
   - Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
3. After deployment finishes, share the generated `https://*.vercel.app` link with the team.

## Notes
- Users only enter their name once per device. The app remembers them on that device.
- Entries are trust-based and can be backdated.
- If you want a real login system later, we can add Supabase Auth.
