# facebook-shorts-bot — AI Content Factory

Arabic short-form video pipeline: generates and (where the platform
allows) publishes vertical Facebook Reels / YouTube Shorts, narrated in
Arabic, entirely from free tooling.

## Two pipelines live in this repo right now

### 1. Existing Python pipeline (untouched, still the one running in production)
- `bot.py`, `generate_facebook_short.py`
- Groq (script) → gTTS (voice) → Pollinations.ai (images) → FFmpeg (video) → Facebook Page Graph API (publish)
- Runs via GitHub Actions, 4x/day
- **This keeps working exactly as-is.** See `MIGRATION.md` for why.

### 2. New TypeScript "AI Content Factory" (all 10 phases built, see `TODO.md`)
A modular, clean-architecture rewrite, fully wired end-to-end:
- Scene-based scripts (not one paragraph) with per-scene duration/narration/image prompt
- A deterministic storyboard step (camera movement, transitions, animation)
- A proper voice pipeline (per-sentence TTS, normalized, silence-trimmed)
- Animated subtitles (SRT + ASS)
- A richer FFmpeg video builder (Ken Burns, cross-fade/blur, watermark, music, SFX, burned-in subtitles)
- A **Notion-backed dashboard** tracking every video's status end to end
- A `Publisher` interface — Facebook Page (unchanged) + free YouTube both plug in

```
app/        content/    script/     storyboard/  voice/
image/      video/      subtitle/   publish/     utils/
config/     assets/     output/     prompts/     notion/  workflows/
```
Each folder has its own `README.md` describing what belongs there.

## Setup (new TS project)
```bash
npm install
cp .env.example .env   # fill in your keys — see .env.example for the full list
npm run build
npm test                 # 10/10 phase test suites, incl. one full real-ffmpeg run
npm run dev               # the real full pipeline: Idea -> ... -> Publish
npm run dev:draft         # content-only dry run, no TTS/image/video/publish cost
```

The Notion "AI Content Factory — Videos" database is already created for
you (see `MIGRATION.md`). Set `NOTION_DATABASE_ID` to its ID and make
sure your Integration is connected to it under the database's "..." →
Connections menu.

## Known platform limitation (carried over from the Python pipeline)
Automated posting via the Facebook Graph API requires Meta Business
Verification for `pages_manage_posts` Advanced Access. Until that's
approved, generated videos + captions are produced as ready-to-post
files (and, in CI, as workflow Artifacts) for manual posting.

## YouTube publishing setup (one-time, optional)
1. Google Cloud Console → create a project → enable "YouTube Data API v3"
2. Create an OAuth Client ID (type: Desktop app)
3. Run the standard OAuth consent flow once (any Node OAuth playground
   or `google-auth-library`'s local server example works) with scope
   `https://www.googleapis.com/auth/youtube.upload` to get a refresh token
4. Set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
   in `.env` / GitHub Secrets

If these three aren't set, `publish/index.ts` simply skips YouTube and
only publishes to Facebook (or vice versa) — nothing crashes.

## Docs
- `MIGRATION.md` — how the new TS project relates to the existing Python one, and how to add it to the repo via the GitHub web UI
- `TODO.md` — phase-by-phase roadmap and current status
- Per-folder `README.md` — what each module is responsible for
