# Roadmap — AI Content Factory

All 10 phases are built, compiled, and tested (`npm test` — 10/10 passing,
including a full end-to-end run through every phase with real ffmpeg).

| Phase | Description | Status |
|---|---|---|
| 1 | Folder restructure | ✅ |
| 2 | Notion service (create/read/update page, query database) | ✅ tested |
| 3 | AI Pipeline: Idea → Research → Hook, Notion-synced | ✅ tested |
| 4 | Script Generator — scene-based, model decides scene count/duration per topic richness | ✅ tested |
| 5 | Storyboard Engine — deterministic camera movement, transitions, animation, subtitle timing per shot | ✅ tested |
| 6 | Voice Pipeline — per-sentence TTS (free Google Translate endpoint), merge, EBU R128 normalize, silence trim | ✅ tested (real ffmpeg) |
| 7 | Subtitle Generator — SRT + animated ASS (fade-in/out), timed from the Storyboard | ✅ tested |
| 8 | Video Builder — Ken Burns/zoom/pan (zoompan), cross-fade + blur transitions (xfade), watermark, background music, SFX, burned-in animated subtitles | ✅ tested (real ffmpeg, real rendered mp4) |
| 9 | Publishing — Facebook Page publisher (faithful port of the existing Python function, unchanged behavior) + free YouTube Data API v3 publisher (OAuth refresh token, no paid tier), behind a common `Publisher` interface | ✅ tested |
| 10 | Notion Dashboard — Status synced live at every stage (Generating → Voice → Video → Publishing → Published/Failed) | ✅ tested |

## How to run it
```bash
npm install
cp .env.example .env   # fill in your keys
npm run build
npm test               # runs all 10 phases' test suites, including one full mocked-network / real-ffmpeg run
npm run dev             # runs the REAL full pipeline: Idea -> ... -> Publish
npm run dev:draft       # content-only dry run (Idea/Research/Hook/Script), no TTS/image/video/publish cost
```

## Design decisions made along the way
- **Idea sourcing** (Phase 3): checks Notion first for a queued
  `Status=Draft` page with no `Video URL`; otherwise Groq generates a
  topic and a new Notion page is created automatically either way.
- **Scene count / video length** (Phase 4): not fixed — the model
  decides based on how much the topic warrants.
- **Storyboard** (Phase 5) is fully deterministic/rule-based, not an AI
  call — camera movement and transitions rotate through a fixed
  sequence, subtitle timing comes straight from cumulative scene
  durations, so it's free and instant.
- **Voice** (Phase 6) uses the same free endpoint the Python `gTTS`
  library wraps, called directly — no extra dependency, no paid key.
- **Video** (Phase 8): `blur` transition maps to ffmpeg's built-in
  `hblur` xfade transition (a real blur, not a re-badged fade).
- **Publishing** (Phase 9): Facebook behavior/endpoint is **unchanged**
  from the existing Python script. YouTube is a new, free (OAuth
  refresh-token) provider behind the same `Publisher` interface — you
  can configure one, both, or neither via env vars.
- **Every network call** (Groq, Notion, Facebook, YouTube) is tested via
  mocked `fetch`, matching the pattern in `notion/notionService.test.ts`.
  Every ffmpeg-based step (Voice, Video) is tested against **real**
  ffmpeg with synthetically generated inputs (no network needed), so
  those tests catch real filter-graph bugs, not just typos.

## Known gaps / good next steps (not part of the original 10 phases)
- `image/imageProvider.ts` (Pollinations.ai) exists because Video needs
  real images to render against, but "Image Generation" wasn't one of
  the 10 requested phases — worth reviewing on its own if you want more
  control over image style/consistency.
- YouTube publishing needs a one-time OAuth setup (Google Cloud Console
  → OAuth client → run the consent flow once to get a refresh token).
  Not automated here since it requires a one-time browser login.
- No retry/backoff wired into the full pipeline yet if a single stage
  fails outright (it does mark the Notion page `Failed` with the error,
  so nothing fails silently).
