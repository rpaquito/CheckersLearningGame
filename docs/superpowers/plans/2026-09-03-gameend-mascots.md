# Game-End Mascots (Phase 10d: Visual Assets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. **Task 1 is controller-executed, not delegated to an implementer subagent — see its own note.**

**Goal:** Give `GameEndModal` a real mascot illustration per result (win/lose/draw) plus win-confetti, replacing its current text-and-button-only, plain-Tailwind styling — closing design spec §8's last unaddressed asset row and the `GameEndModal.tsx` doc comment's own "no mascot/confetti yet (Phase 10)" note.

**Architecture:** The fourth and final asset-generation slice of design spec §8/§13 phase 10, following `app-icon`, `background-themes`, and `menu-tile-illustrations`. Unlike the other three, this phase's asset need turns out mostly *not* to require new generation: direct inspection of Chess Sensei's own `public/gameend/{win,lose,draw}.webp` (not just the design spec's speculation) shows `win.webp` (fists raised, fireworks) and `draw.webp` (shrug) contain **no chess imagery at all** — generic celebration/reactions, safe to copy verbatim, exactly matching design spec §8's own conditional ("checkers-flavored if the mascot itself references chess pieces, otherwise reusable"). Only `lose.webp` is chess-specific (an actual chess pawn piece on a chessboard floor) and needs fresh Draw Things generation.

The code side ports Chess Sensei's own `GameEndModal.tsx` structure verbatim: `PageTitle`/`MODAL_BACKDROP_CLASS` (already in this repo's `PageChrome.tsx` since the visual-identity phase, unused by this modal until now), `ChipButton` (already in this repo), a mascot circle keyed by result `kind`, and a deterministic (non-`Math.random`) 12-particle confetti burst on `win` only, driven by a `confetti-pop` CSS keyframe this repo's `globals.css` doesn't have yet.

**Tech Stack:** Draw Things.app (local, HTTP API — already confirmed running across the last three phases) for the one new image; `sips`/`cwebp` not needed for the copied two (already correctly sized/compressed by Chess Sensei's own pipeline). Code change is `GameEndModal.tsx`, its test file, and one CSS addition to `globals.css`.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` (§8's asset table, the `gameend/{win,lose,draw}.webp` row).

## Global Constraints

- **Process (CLAUDE.md, hard repo rule):** no worktrees, no feature branches. Every task's changes are committed directly to `main` and pushed (`git push origin main`) immediately once verified. `CLAUDE.md` is updated at the end of this phase (Task 3).
- **Only `lose.webp` needs regeneration — verified, not assumed.** This plan's own research read all three Chess Sensei source images directly: `win.webp`/`draw.webp` have no chess piece, board, or chess-specific symbol anywhere in frame; `lose.webp` has a literal chess pawn + chessboard floor. Do not regenerate the two that don't need it — that would be wasted, unreviewable-by-diff work.
- **Mascot concept for the new `lose.webp` stays consistent** with the other two (which are being reused as-is): same wise elderly "sensei" character (golden headband, wispy beard), crying pose, replacing only the chess pawn with a checkers piece and the chessboard floor with a generic checkered floor — same "no chess imagery" discipline as the last two phases.
- **Confetti keyframe is ported verbatim from Chess Sensei's `app/globals.css`** (`@keyframes confetti-pop` + the `--animate-confetti-pop` custom property) — not re-designed. The 12-particle layout (fixed angle/distance/color/delay, not `Math.random()`) is also ported verbatim, for the same reason Chess Sensei built it that way: deterministic output across renders and tests.
- **Confetti fires only on `kind === 'win'`.** `lose`/`draw` show their mascot with no confetti — matches Chess Sensei's own behavior and this repo's existing `GameEndKind` type (`'win' | 'lose' | 'draw'`, already defined in `lib/checkers/gameEndMessage.ts`, unchanged by this plan).
- **`GameEndModal`'s existing tests must keep passing** — every current assertion (open/closed, title text, close button, Escape, play-again, main-menu link, English locale) is behavior-preserving; only the modal's own visual chrome and the new mascot/confetti assertions change.
- **Cost if any ruling above is wrong:** low. The one new image can be regenerated in isolation; the copied two can be swapped later if they turn out to read as too chess-neutral-but-still-off-brand; the component restyle is a contained, easily-revertable diff.

---

### Task 1: Bring in the three mascot images

**Files:**
- Create: `public/gameend/win.webp`, `public/gameend/draw.webp` (copied unchanged from Chess Sensei)
- Create: `public/gameend/lose.webp` (new Draw Things generation)

**Interfaces:** none — static assets. Task 2 wires these exact paths into `GameEndModal.tsx`.

> **Controller-executed — see this plan's Global Constraints.** Do not dispatch this task to an implementer subagent.

- [x] **Step 1: Copy the two reusable mascots**

```bash
mkdir -p public/gameend
cp ~/Documents/Projects/ChessLearningGame/public/gameend/win.webp public/gameend/win.webp
cp ~/Documents/Projects/ChessLearningGame/public/gameend/draw.webp public/gameend/draw.webp
```

- [x] **Step 2: Confirm Draw Things is reachable**

```bash
curl -s -m 5 http://127.0.0.1:7860/ -o /dev/null -w "%{http_code}\n"
```

Expected: `200`.

- [x] **Step 3: Generate "lose" — crying mascot, checkers piece instead of chess pawn**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital illustration, a wise elderly character with a golden headband tied in a knot with flowing ribbon tails, wispy pale beard, crying with tears streaming down, sitting slumped with arms crossed, a single golden checkers game piece disc token resting on the floor beside him, sitting on a plain floor with a subtle checkered pattern of alternating dark squares, deep purple background with soft rain streaks, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, chess, chess piece, chess pawn, chess king, chess queen, chess bishop, chess knight, chess rook, staunton chess set, tall chess piece, cross finial, chessboard, chess board, people, human face, realistic human, cluttered, blurry, low quality",
    "width": 512,
    "height": 512,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/gameend_lose_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/gameend_lose_raw.json'))
open('/tmp/gameend_lose_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
echo done
```

Budget 2-4 minutes. Read `/tmp/gameend_lose_original.png` — must show the same crying "sensei" mascot concept, a flat checkers disc (not a tall chess pawn), no chessboard, no readable text/watermark. Regenerate with an adjusted prompt if a chess piece/board sneaks in (this plan's own research found this to be Draw Things' single strongest failure mode for this app so far — see `menu-tile-illustrations`' `vs-cpu.webp` precedent, which needed 3 attempts for the same reason).

- [x] **Step 4: Downscale and compress**

```bash
cd public/gameend
sips -Z 480 /tmp/gameend_lose_original.png --out lose-480.png
cwebp -q 85 lose-480.png -o lose.webp
rm -f lose-480.png
cd ../..
```

- [x] **Step 5: Sanity-check file sizes and do a final visual pass**

```bash
ls -la public/gameend/win.webp public/gameend/draw.webp public/gameend/lose.webp
```

Expected: `win.webp`/`draw.webp` unchanged from their copied originals (~26-45KB); `lose.webp` in a similar few-KB-to-~50KB range. Read `lose.webp` to confirm it still looks right after compression, and that all three read as a coherent set (same character, three distinct emotional reactions).

- [x] **Step 6: Commit**

```bash
git add public/gameend/win.webp public/gameend/draw.webp public/gameend/lose.webp
git commit -m "feat: add game-end mascot illustrations (2 reused, 1 generated)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 2: Restyle `GameEndModal` with the mascot, confetti, and app chrome

**Files:**
- Modify: `app/globals.css` (add the `confetti-pop` keyframe + `--animate-confetti-pop`)
- Modify: `components/GameEndModal/GameEndModal.tsx`
- Modify: `components/GameEndModal/GameEndModal.test.tsx`

**Interfaces:** none new — `GameEndModalProps` is unchanged. Internally, the component now renders a mascot `<img>`-equivalent `<div>` (`data-testid="game-end-mascot"`, `backgroundImage` keyed by `GameEndKind`) and, for `kind === 'win'`, a `WinConfetti` sub-component with 12 `.animate-confetti-pop` particles.

- [x] **Step 1: Port the confetti keyframe into `app/globals.css`**

This repo's `globals.css` already has one `@theme inline { ... }` block (color/font tokens, no
`--animate-*` yet) — add `--animate-confetti-pop: confetti-pop 700ms ease-out forwards;` as a new
line inside that *existing* block (do not create a second `@theme` block), then add the
`@keyframes` rule after it, verbatim:

```css
@keyframes confetti-pop {
  from {
    transform: translate(-50%, -50%) rotate(0deg) scale(1);
    opacity: 1;
  }
  to {
    transform: translate(calc(-50% + var(--confetti-x, 0px)), calc(-50% + var(--confetti-y, 0px)))
      rotate(var(--confetti-r, 0deg)) scale(0.3);
    opacity: 0;
  }
}
```

- [x] **Step 2: Rewrite `GameEndModal.tsx`**

Port Chess Sensei's own `components/GameEndModal/GameEndModal.tsx` structure (see this plan's Architecture section), adapted to this repo's existing checkers types/imports:
- Add a `MASCOT_IMAGE: Record<GameEndKind, string>` map (`win`/`lose`/`draw` → `/gameend/{win,lose,draw}.webp`), importing `GameEndKind` from `@/lib/checkers/gameEndMessage` (already exported there).
- Add the `CONFETTI_COLORS` array and the fixed (non-random) `CONFETTI_PARTICLES` generation (12 particles, angle-based position, deterministic color/delay cycling) and the `WinConfetti` component, ported verbatim.
- Replace the `bg-white p-6 text-stone-900` panel styling with `MODAL_BACKDROP_CLASS` (import from `@/components/PageChrome/PageChrome`) on the backdrop div, and `bg-ink-soft border-purple text-lilac` on the panel (matching this repo's existing token names from `app/globals.css` -- confirm exact token/utility names before using them, they may differ slightly from Chess Sensei's).
- Replace the plain `<h2>` with `PageTitle` (`as="h2"` `size="text-xl"` `strokeWidth={1}`), imported from the same `PageChrome` module.
- Replace the two plain `<button>`/`<Link>` actions with `ChipButton` (`color="pink"` for play-again, `color="purple"` for main menu — matching this repo's existing `ChipColor` values), imported from `@/components/ChipButton/ChipButton`.
- Add the mascot circle (`data-testid="game-end-mascot"`, `h-32 w-32 rounded-full border-2 ... bg-cover bg-center`, `backgroundImage: url(${MASCOT_IMAGE[kind]})`) above the title, with `<WinConfetti />` rendered alongside it only when `kind === 'win'`.
- Update the component's own doc comment (currently: "Text/button only in this plan -- no mascot illustration or confetti (Phase 10, see this plan's Global Constraints)") to describe what's actually there now.

- [x] **Step 3: Extend `GameEndModal.test.tsx`**

Port Chess Sensei's four mascot/confetti tests (see this plan's Architecture section — the exact `toHaveStyle`/`animate-confetti-pop` count assertions), adapted to this repo's existing test fixture shape (`status`/`mode`/`humanColor`/`turn` props, not chess's FEN-based ones):
- win shows the win mascot + 12 confetti particles
- lose shows the lose mascot + 0 confetti particles
- draw shows the draw mascot + 0 confetti particles
- (optional, matching chess's own coverage) a local-mode win for the non-human color still shows the correct mascot for whichever side actually won, not hardcoded to "human perspective"

- [x] **Step 4: Run tests and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [x] **Step 5: Manual visual check** (optional but recommended)

Run `npm run dev`, trigger each of the three game-end states in `/jogar` (or render the modal directly via a quick temporary route/test harness if faster), confirm the mascot displays correctly and confetti only appears on a win.

- [x] **Step 6: Commit**

```bash
git add app/globals.css components/GameEndModal/GameEndModal.tsx components/GameEndModal/GameEndModal.test.tsx
git commit -m "feat: add mascot illustration and win-confetti to GameEndModal

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 3: CLAUDE.md close-out

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none (documentation only).

- [x] **Step 1: Add a `public/gameend/` Structure entry**

Add a new block (alongside the existing `public/menu/` entry):

```markdown
  gameend/
    win.webp, draw.webp           # reused unchanged from Chess Sensei -- both
                                  # verified to contain no chess-specific
                                  # imagery (generic celebration/shrug
                                  # reactions), per design spec §8's own
                                  # "otherwise reusable" clause
    lose.webp                     # regenerated -- Chess Sensei's original had
                                  # an actual chess pawn + chessboard floor
```

- [x] **Step 2: Update the existing `GameEndModal.tsx` Structure entry**

Find the line describing `GameEndModal.tsx` (currently: "win/lose/draw modal -- text/button only, no mascot/confetti yet (Phase 10)"). Update it to describe the real mascot/confetti behavior now in place.

- [x] **Step 3: Add a new Convention entry**

Add, after the "Menu tile illustrations" convention entry:

```markdown
### Game-end mascots: two reused unchanged, one regenerated -- verified per-file, not assumed

`public/gameend/win.webp`/`draw.webp` are Chess Sensei's own files, copied unchanged -- direct
inspection found neither contains any chess piece, board, or chess-specific symbol (a generic
fists-raised celebration and a generic shrug, respectively), matching design spec §8's own
conditional for this asset row ("checkers-flavored if the mascot itself references chess pieces,
otherwise reusable"). Only `lose.webp` needed regeneration: Chess Sensei's original shows the
mascot crying next to an actual chess pawn on a chessboard floor. The replacement keeps the same
crying-mascot concept with a checkers disc instead.

`GameEndModal.tsx` now ports Chess Sensei's own structure verbatim: a mascot circle keyed by
`GameEndKind`, a deterministic (non-`Math.random()`) 12-particle confetti burst via a
`confetti-pop` CSS keyframe (`app/globals.css`) firing only on `kind === 'win'`, `PageTitle`/
`MODAL_BACKDROP_CLASS` from `PageChrome.tsx` and `ChipButton` for its two actions -- all three
already existed in this repo (ported during the visual-identity/toast-modal-chrome phases) but
were unused by this specific modal until now. See
`docs/superpowers/plans/2026-09-03-gameend-mascots.md` for the exact generation pipeline.
```

- [x] **Step 4: Run the full suite and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [x] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out gameend-mascots phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** this closes design spec §8's last unaddressed asset row (`gameend/{win,lose,draw}.webp`). All four asset rows in §8's table are now done across the four `Phase 10*` plans (app icon, background themes, menu tiles, game-end mascots). Only the native iOS Capacitor setup (§11/§13) remains as separate, later work.
- **Placeholder scan:** no "TBD"/"handle it later" — every step has a real, complete command or an exact, named code change; Task 2 names the precise files/props/imports to use rather than describing intent vaguely.
- **Pre-flight fact-check done while planning, not assumed:** confirmed via direct `Read` inspection of all three Chess Sensei source images that only `lose.webp` is chess-specific (correcting the assumption that all three would need regeneration, the same way the design spec's `options.webp` guess was corrected in the prior phase); confirmed `PageTitle`/`MODAL_BACKDROP_CLASS`/`ChipButton` already exist in this repo and are unused by `GameEndModal`; confirmed `GameEndKind` is already exported from `lib/checkers/gameEndMessage.ts` with the exact `'win' | 'lose' | 'draw'` shape needed; confirmed the dictionary already has `t.gameEndModal.playAgain`/`t.common.close`/`t.common.mainMenu` so no new i18n keys are needed; confirmed Chess Sensei's own `globals.css` confetti keyframe to port verbatim.
- **Type/interface consistency:** `GameEndModalProps` is unchanged (no new prop). The only new exported-from-elsewhere type used is `GameEndKind`, which already exists with the right shape — no interface drift.
