# Making the lamp ceremony console persistent across devices

## What changed

Previously all data (ID card links, guest names/photos, voice clips, background
music) lived in the browser's `localStorage`/`IndexedDB` — so it was stuck on
whichever one device/browser you set it up on.

Now it's stored server-side using **Vercel Blob**:
- `lamp-ceremony.html` — same app, but every read/write of that data now goes
  through two small API routes instead of the browser's local storage.
- `api/state.js` — stores ID links, guest names/photos, and the background
  music URL as one JSON file in Blob storage (`lamp-ceremony/state.json`).
- `api/upload.js` — uploads/deletes the actual audio files (guest voice clips
  + background music) in Blob storage, returning a permanent URL for each.
- `package.json` — declares the one new dependency, `@vercel/blob`.

Guest photos stay as small base64 JPEGs inside the JSON state (they're already
resized to 260×260 before saving, so they're tiny — a few KB each). Only the
audio files go through Blob storage as real files, since those can be a few
MB.

## One-time setup

1. **Add these files to your project repo**, preserving the folder structure:
   ```
   lamp-ceremony.html
   package.json
   api/state.js
   api/upload.js
   ```
   (Drop them in alongside whatever else is already in your Vercel project.)

2. **Create a Blob store** in the Vercel dashboard:
   - Go to your project → **Storage** tab → **Create Database** → **Blob**.
   - Connect it to this project. Vercel will automatically add the
     credentials your functions need as environment variables — you don't
     need to copy/paste any tokens yourself.

3. **Check your Node.js version**: `@vercel/blob` needs Node 20+. In
   **Project Settings → General → Node.js Version**, make sure it's set to
   20.x or newer.

4. **Deploy** (push to your connected Git repo, or `vercel deploy` if you
   deploy via CLI). Vercel will pick up `api/*.js` as serverless functions
   automatically — no extra config needed.

That's it — open the page from any device after that and it'll load/save the
same shared data.

## Good to know

- **4.5 MB upload limit**: guest voice clips and background music are
  uploaded through a server route, which Vercel caps at 4.5 MB per request.
  Short welcome clips are no problem; if you upload a large, uncompressed
  background-music file and it gets rejected, compress it to MP3 first (a
  few minutes at 128kbps is usually well under 1 MB/minute). If you'd rather
  not worry about that limit at all, this can be upgraded to direct
  browser-to-Blob uploads (supports files up to 5 TB) — just ask.
- **Freshness**: state is cached for up to 60 seconds at the CDN edge (the
  minimum Vercel allows), so a change made on one device may take up to a
  minute to show up on another that's already loaded the page. A fresh page
  load always fetches with `cache: "no-store"`, so reloading gets you the
  latest data immediately.
- **Concurrent edits**: the last save wins if two people edit guest details
  at the exact same moment. Fine for a single organizer setting things up
  before an event; not built for many simultaneous editors.
