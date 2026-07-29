# Roadmap — AI Content Factory

Legend: ✅ done · 🚧 scaffolded (folder + README, no logic yet) · ⬜ not started

| Phase | Description | Status |
|---|---|---|
| 1 | Folder restructure | ✅ |
| 2 | Notion service (create/read/update page, query database) | ✅ tested |
| 3 | AI Pipeline orchestration (Idea → Research → Hook → Script → Rewrite → Storyboard → Image Prompt → Voice → Subtitle → Publish) | 🚧 |
| 4 | Script Generator — scene-based output (duration, narration, image prompt per scene) | 🚧 |
| 5 | Storyboard Engine — camera movement, transitions, animation type, subtitle timing per shot | 🚧 |
| 6 | Voice Pipeline — per-sentence TTS, merge, normalize, silence trim | 🚧 |
| 7 | Subtitle Generator — SRT + animated ASS | 🚧 |
| 8 | Video Builder — Ken Burns/zoom/pan, cross-fade, blur transition, logo, watermark, music, SFX, animated subtitles | 🚧 |
| 9 | Publishing — port Facebook Page publisher into `Publisher` interface + add YouTube provider | 🚧 |
| 10 | Notion Dashboard — sync video status (Draft/Generating/Voice/Video/Publishing/Published/Failed) | 🚧 |

## Next step
Say **"continue with Phase 3"** (or any phase number) and it'll be built
the same way Phase 1–2 were: real, compiled, tested TypeScript — not
just stubs — landed as a downloadable update plus upload instructions.

## Constraints carried through every phase
- No paid services. Where a paid API is the obvious choice, it sits
  behind an interface (e.g. `ImageProvider`, `VoiceProvider`,
  `Publisher`) so a free implementation is the default and a paid one
  can be swapped in later without touching calling code.
- Facebook Page publishing must keep working at every step.
- Every module independently testable (see `notion/notionService.test.ts`
  for the pattern used elsewhere).
