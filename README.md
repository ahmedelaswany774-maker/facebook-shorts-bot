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

### 2. New TypeScript "AI Content Factory" (in progress, see `TODO.md`)
A modular, clean-architecture rewrite that adds:
- Scene-based scripts (not one paragraph) with per-scene duration/narration/image prompt
- A real storyboard step (camera movement, transitions, animation)
- A proper voice pipeline (per-sentence TTS, normalized, silence-trimmed)
- Animated subtitles (SRT + ASS)
- A richer FFmpeg video builder (Ken Burns, cross-fade, watermark, music)
- A **Notion-backed dashboard** tracking every video's status end to end
- A `Publisher` interface so Facebook Page + YouTube can both plug in

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
npm run test:notion
```

## Known platform limitation (carried over from the Python pipeline)
Automated posting via the Facebook Graph API requires Meta Business
Verification for `pages_manage_posts` Advanced Access. Until that's
approved, generated videos + captions are produced as ready-to-post
files (and, in CI, as workflow Artifacts) for manual posting.

## Docs
- `MIGRATION.md` — how the new TS project relates to the existing Python one, and how to add it to the repo via the GitHub web UI
- `TODO.md` — phase-by-phase roadmap and current status
- Per-folder `README.md` — what each module is responsible for
