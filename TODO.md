# Roadmap — AI Content Factory

Legend: ✅ done · 🚧 scaffolded (folder + README, no logic yet) · ⬜ not started

| Phase | Description | Status |
|---|---|---|
| 1 | Folder restructure | ✅ |
| 2 | Notion service (create/read/update page, query database) | ✅ tested |
| 3 | AI Pipeline: Idea → Research → Hook implemented + Notion-synced. Script→Publish wired as typed pass-through, ready for Phases 4-9 to fill in. | ✅ tested |
| 4 | Script Generator — scene-based, model decides scene count/duration per topic richness | ✅ tested |
| 5 | Storyboard Engine — camera movement, transitions, animation type, subtitle timing per shot | 🚧 |
| 6 | Voice Pipeline — per-sentence TTS, merge, normalize, silence trim | 🚧 |
| 7 | Subtitle Generator — SRT + animated ASS | 🚧 |
| 8 | Video Builder — Ken Burns/zoom/pan, cross-fade, blur transition, logo, watermark, music, SFX, animated subtitles | 🚧 |
| 9 | Publishing — port Facebook Page publisher into `Publisher` interface + add YouTube provider | 🚧 |
| 10 | Notion Dashboard — sync video status (Draft/Generating/Voice/Video/Publishing/Published/Failed) | 🚧 |

## Phase 3 decisions
- **Idea sourcing**: checks the Notion database first for a page with
  `Status = Draft` and empty `Video URL` (a topic you queued manually).
  If none exists, Groq generates a random topic and a new page is
  created in Notion automatically, so it always shows up on the
  dashboard either way.
- Once Hook is generated, the Notion page's `Caption` is updated live
  so you can watch progress from the Notion board while it runs.

## Phase 4 decisions
- **Scene count / video length**: not fixed. The model decides how many
  scenes and how long the total video is, based on how much the topic
  actually warrants (a simple topic might be ~6 scenes / ~1 min, a
  richer one 20+ scenes / 3-4 min).

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
