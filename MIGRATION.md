# Migration Guide — Python script → AI Content Factory (TypeScript)

## What is NOT changing (yet)
`bot.py` and `generate_facebook_short.py` stay exactly where they are, at
the repo root, untouched. Your GitHub Actions workflow that runs them 4x
daily keeps working exactly as before. **Nothing about Facebook
publishing is being touched or turned off.**

## What's new
A parallel TypeScript project lives alongside the existing Python files:

```
facebook-shorts-bot/
├── bot.py                      # unchanged
├── generate_facebook_short.py  # unchanged
├── requirements.txt            # unchanged
├── package.json                # NEW - TypeScript project
├── tsconfig.json                # NEW
├── .env.example                  # NEW - documents all env vars (old + new)
├── app/ content/ script/ storyboard/ voice/ image/ video/
│   subtitle/ publish/ utils/ config/ assets/ output/ prompts/
│   notion/ workflows/                # NEW - see each folder's README.md
```

## How to add this to your repo (step by step)
Since file uploads via the GitHub web UI have worked best for you before:

1. Go to your repo → **Add file → Upload files**.
2. Drag in the whole `build/` folder contents from the zip you downloaded
   (keep the folder structure — GitHub preserves subfolders on drag-drop).
3. Commit directly to `main` with message: `Phase 1+2: TS project scaffold + Notion service`.
4. In **Settings → Secrets and variables → Actions**, add:
   - `NOTION_API_KEY`
   - `NOTION_DATABASE_ID`
   (your existing `GROQ_API_KEY`, `FB_PAGE_ACCESS_TOKEN`, `FB_PAGE_ID`
   secrets stay as they are).

## Running it locally / in Termux
```bash
npm install
cp .env.example .env   # fill in your real keys, never commit this file
npm run build
npm run test:notion    # sanity-checks the Notion service with a mocked API
```

## Rollout plan (so nothing breaks)
- Phase 1–2 (this delivery): scaffold + Notion service only. Does not
  touch publishing at all.
- Phase 3 onward: the new pipeline is built **next to** the Python
  script, not instead of it. Only once a phase is tested and you've
  confirmed it in Notion/locally do we wire it into the GitHub Actions
  workflow — the Python path keeps running as the fallback the whole
  time.
- The Facebook Page publisher already in `generate_facebook_short.py`
  is the one that will be ported into `publish/` in Phase 9 — same
  Graph API calls, same Business-Verification limitation, just wrapped
  in the shared `Publisher` interface so YouTube can plug in next to it.
