# Menu Tile Illustrations (Phase 10c: Visual Assets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. **Task 1 is controller-executed, not delegated to an implementer subagent — see its own note.**

**Goal:** Generate real Draw Things art for the four home-menu tiles (`vs-cpu`/`two-players`/`tutorial`/`options`) and wire it into `app/page.tsx`'s `MenuTile`, replacing the flat-gradient placeholder that's been there since the visual-identity phase.

**Architecture:** The third narrow slice of design spec §8/§13 phase 10, following `2026-09-03-app-icon.md` and `2026-09-03-background-themes.md`. Unlike background-themes (pure asset drop, zero code change), this phase needs both new art AND a small `app/page.tsx` change, because `MenuTile` currently has no `image` prop at all — the four tiles render as solid CSS gradients (see `app/page.tsx`'s own comment: "No per-tile illustration yet ... Each tile is its own gradient instead").

Direct inspection of Chess Sensei's own shipped `public/menu/{vs-cpu,two-players,tutorial,options}.webp` (not just trusting the design spec's speculation) confirms all four are chess-specific — `options.webp` in particular centers the mascot holding a chess pawn on a chessboard floor, contradicting spec §8's guess that it "may not need chess-vs-checkers differentiation at all." All four need fresh generation, none can be copied.

Chess Sensei's own `app/page.tsx` already solved the code side of this exact problem (`image` field on `TileData`, `backgroundImage` CSS, a translucent rgba tint overlay on top of the photo instead of a solid gradient, so each tile keeps its accent-color identity and the label stays legible regardless of the photo underneath) — this plan ports that pattern verbatim rather than re-designing it.

**Tech Stack:** Draw Things.app (local, HTTP API Server — already confirmed running across the last two phases), `curl`, `python3` (base64 decode only), `sips`, `cwebp`. Code change is a single file (`app/page.tsx`) plus its existing test file.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` (§8's asset table, the four `menu/*.webp` rows and their "Checkers Sensei concept" column).

## Global Constraints

- **Process (CLAUDE.md, hard repo rule):** no worktrees, no feature branches. Every task's changes are committed directly to `main` and pushed (`git push origin main`) immediately once verified. `CLAUDE.md` is updated at the end of this phase (Task 3).
- **Mascot concept is locked already** — same "sensei" character as the app icon (`docs/superpowers/plans/2026-09-03-app-icon.md`'s Global Constraints): a crowned checkers-disc figure, golden headband tied in a knot with flowing ribbon tails, wispy pale beard, calm closed eyes, soft glowing cyan aura. Each tile places this same character in a different scene — do not re-invent the character per tile.
- **No chess imagery, ever** — every prompt's negative prompt explicitly excludes chess pieces/pawns/kings/boards, mirroring the exact failure mode confirmed present in all four Chess Sensei source images during this plan's research.
- **`options.webp` DOES need checkers-specific art.** Design spec §8 speculated it might not; direct inspection this same plan performed proved that wrong (Chess Sensei's `options.webp` centers a chess pawn on a chessboard floor). Generate it like the other three, no shortcut.
- **Checkerboard floor detail, not chessboard:** where a prompt includes a board-pattern floor (as Chess Sensei's own images do), describe it as a plain 8×8 dark/light checkered floor, never "chessboard" — the word alone can bias the model back toward chess iconography.
- **Same pipeline and file-size discipline as the last two phases:** Draw Things `txt2img` → `sips -Z` → `cwebp -q 85`, budgeting toward Chess Sensei's own precedent for these specific tiles (~30-40KB each — a centered-subject composition compresses tighter than the busy scenery of `background-themes`), not the multi-MB originals.
- **Task 1 is controller-executed, not delegated to an implementer subagent** — slow, interactive, judged-by-eye Draw Things calls, matching this project's own established precedent (`app-icon`, `background-themes`).
- **`MenuTile`'s existing tests must keep passing** — the four hrefs/labels/onClick behavior are unchanged; only the tile's own rendering (a new `image` field, plus the gradient's meaning changing from opaque background to translucent overlay) changes.
- **Cost if any ruling above is wrong:** low. Any single tile's art can be regenerated later in isolation (the other three, and all wiring, are unaffected); the `page.tsx` change is a small, easily-revertable diff.

---

### Task 1: Generate the four menu tile images

**Files:**
- Create: `public/menu/vs-cpu.webp`, `public/menu/two-players.webp`, `public/menu/tutorial.webp`, `public/menu/options.webp`

**Interfaces:** none — static assets. Task 2 wires these exact paths into `app/page.tsx`.

> **Controller-executed — see this plan's Global Constraints.** Do not dispatch this task to an implementer subagent.

- [x] **Step 1: Confirm Draw Things is reachable**

```bash
curl -s -m 5 http://127.0.0.1:7860/ -o /dev/null -w "%{http_code}\n"
```

Expected: `200`.

- [x] **Step 2: Generate "vs-cpu" — mascot facing a robot opponent**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital illustration, a wise ivory checkers king piece character (a round disc with a crown symbol on top), golden headband tied in a knot with flowing ribbon tails, wispy pale beard, calm closed eyes, soft glowing cyan aura, standing fists raised facing a sleek silver robot opponent with glowing cyan joints, crackling cyan energy sparks between them, a golden crowned checkers piece in the foreground, blurred dark checkered floor of alternating light and dark squares, dark moody background with soft bokeh lights, dramatic rim lighting, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, chess, chess piece, chess pawn, chess king, chess bishop, chess knight, chess rook, chess queen, chessboard, chess board, people, human face, realistic human, cluttered, blurry, low quality, extra limbs, deformed hands",
    "width": 1024,
    "height": 576,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/tile_vscpu_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/tile_vscpu_raw.json'))
open('/tmp/tile_vscpu_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
echo done
```

Budget 2-4 minutes. Read `/tmp/tile_vscpu_original.png` — must show the checkers-disc mascot (crown, headband, beard) vs. a robot, no chess pieces/board anywhere, no readable text/watermark. Regenerate with an adjusted prompt if a chess piece sneaks in or the composition reads as photorealistic rather than anime (the design spec's own explicit warning for this exact tile, carried over from Chess Sensei's build).

- [x] **Step 3: Generate "two-players" — two crowned discs facing each other**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital illustration, two checkers king piece characters facing each other in profile close-up, each a round disc with a crown symbol on top, golden headbands tied in knots with flowing ribbon tails, one ivory-white with a wispy pale beard and soft cyan aura, one deep black with a wispy dark beard and soft pink aura, calm closed eyes, a bright spark of light glowing between their faces, blurred dark checkered floor of alternating light and dark squares, dark background with soft bokeh, dramatic rim lighting, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, chess, chess piece, chess pawn, chess king, chess bishop, chess knight, chess rook, chess queen, chessboard, chess board, people, human face, realistic human, cluttered, blurry, low quality",
    "width": 1024,
    "height": 576,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/tile_twoplayers_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/tile_twoplayers_raw.json'))
open('/tmp/tile_twoplayers_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
echo done
```

Same inspection as Step 2: two checkers discs (not chess kings/bishops), one light one dark, no chess imagery.

- [x] **Step 4: Generate "tutorial" — mascot reading a book**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital illustration, a wise ivory checkers king piece character (a round disc with a crown symbol on top), golden headband tied in a knot with flowing ribbon tails, wispy pale beard, calm closed eyes, wearing a graduation cap with a gold tassel, reading a glowing open book, a small golden crowned checkers piece glowing above the pages, blurred dark checkered floor of alternating light and dark squares, deep violet background with soft bokeh lights, dramatic rim lighting, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, chess, chess piece, chess pawn, chess king, chess bishop, chess knight, chess rook, chess queen, chessboard, chess board, people, human face, realistic human, cluttered, blurry, low quality",
    "width": 1024,
    "height": 576,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/tile_tutorial_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/tile_tutorial_raw.json'))
open('/tmp/tile_tutorial_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
echo done
```

Same inspection: graduation cap + book + a single glowing checkers piece (not a chess pawn), no chessboard.

- [x] **Step 5: Generate "options" — mascot with a wrench and gears**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital illustration, a wise ivory checkers king piece character (a round disc with a crown symbol on top), golden headband tied in a knot with flowing ribbon tails, wispy pale beard, calm closed eyes, soft glowing cyan aura, holding a large golden wrench in one hand and a small golden crowned checkers piece in the other, glowing golden gear icons floating nearby, blurred dark checkered floor of alternating light and dark squares, dark background with soft bokeh lights, dramatic rim lighting, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, chess, chess piece, chess pawn, chess king, chess bishop, chess knight, chess rook, chess queen, chessboard, chess board, people, human face, realistic human, cluttered, blurry, low quality",
    "width": 1024,
    "height": 576,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/tile_options_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/tile_options_raw.json'))
open('/tmp/tile_options_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
echo done
```

Same inspection: wrench + gears + a single glowing crowned checkers piece (not a chess pawn), no chessboard floor pattern read as a chess board.

- [x] **Step 6: Downscale and compress all four**

```bash
mkdir -p public/menu
cd public/menu

sips -Z 800 /tmp/tile_vscpu_original.png --out vs-cpu-800.png
sips -Z 800 /tmp/tile_twoplayers_original.png --out two-players-800.png
sips -Z 800 /tmp/tile_tutorial_original.png --out tutorial-800.png
sips -Z 800 /tmp/tile_options_original.png --out options-800.png

cwebp -q 85 vs-cpu-800.png -o vs-cpu.webp
cwebp -q 85 two-players-800.png -o two-players.webp
cwebp -q 85 tutorial-800.png -o tutorial.webp
cwebp -q 85 options-800.png -o options.webp

rm -f vs-cpu-800.png two-players-800.png tutorial-800.png options-800.png
cd ../..
```

- [x] **Step 7: Sanity-check file sizes and do a final visual pass**

```bash
ls -la public/menu/vs-cpu.webp public/menu/two-players.webp public/menu/tutorial.webp public/menu/options.webp
```

Expected: each in the few-KB to ~50KB range (Chess Sensei's own precedent for these exact tiles: 32-41KB). If any file lands much higher, re-run Step 6 with a lower `cwebp -q` value (see `background-themes` plan's precedent for this exact adjustment) before proceeding. Read each final `.webp` to confirm it still looks right after compression and that all four are clearly distinguishable from one another.

- [x] **Step 8: Commit**

```bash
git add public/menu/vs-cpu.webp public/menu/two-players.webp public/menu/tutorial.webp public/menu/options.webp
git commit -m "feat: generate real menu-tile illustrations (Draw Things)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 2: Wire the images into `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:** `TileData` gains an `image: string` field. `MenuTile`'s rendering changes from an opaque `style={{ background: gradient }}` to a `backgroundImage` on the `Link` plus a new translucent overlay `<span>` carrying the tint — porting Chess Sensei's own `app/page.tsx` structure verbatim (see this plan's Architecture section), adapted to this repo's existing gradient color values (converted to `rgba(...)` tints, same two-stop `135deg` shape already in use) instead of re-deriving new ones.

- [x] **Step 1: Update `TileData`/`MenuTile`/the tile list**

In `app/page.tsx`:
- Add `image: string` to the `TileData` interface.
- Change `TILE_CLASS` to include `bg-cover bg-center` (matching Chess Sensei's class list) so the new `backgroundImage` actually fills the tile.
- Change `MenuTile` to set `style={{ backgroundImage: `url(${image})` }}` on the `Link`, and add a new `<span aria-hidden="true" className="absolute inset-0" style={{ background: gradient }} />` immediately after the opening `Link` tag (before the emoji/label spans) carrying the *tint* — the existing `zIndex` stacking already puts the emoji/label spans above it via their own `z-10`, so no other change is needed there.
- Convert each tile's `gradient` value from an opaque two-stop gradient to a translucent one using the same hex pair, e.g. `'linear-gradient(135deg, #00E5FF, #4EA8DE)'` → `'linear-gradient(135deg, rgba(0,229,255,0.55), rgba(78,168,222,0.4))'`, applying the same `0.55`/`0.4` alpha pair Chess Sensei uses to all four tiles' existing color pairs (cyan, pink, purple, gold) — do not invent new colors, only add alpha to the ones already there.
- Add `image: '/menu/vs-cpu.webp'`, `'/menu/two-players.webp'`, `'/menu/tutorial.webp'`, `'/menu/options.webp'` to the four respective tile objects, matching Task 1's file names.
- Update the stale comment above the tile list ("No per-tile illustration yet...") to describe what's actually there now — real Draw Things art with a translucent tint overlay, ported from Chess Sensei's own `page.tsx` pattern.

- [x] **Step 2: Extend `app/page.test.tsx`**

Add an assertion (in the existing "renders the four menu tiles" test, or a new one) that each tile link's inline style includes its expected `/menu/<name>.webp` background image — e.g. via `getComputedStyle` or by checking the rendered `style` attribute contains the path. Follow this file's existing `screen.getByRole('link', ...)` pattern rather than introducing a new query style.

- [x] **Step 3: Run tests and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [x] **Step 4: Manual visual check** (optional but recommended — no automated visual regression exists in this repo)

Run `npm run dev`, open `/`, confirm all four tiles show their new art with legible text and the correct accent-color tint, in both `pt` and `en` (toggle via `/opcoes`).

- [x] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat: wire real menu-tile art into the home page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 3: CLAUDE.md close-out

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none (documentation only).

- [x] **Step 1: Update the `public/menu/` Structure entry**

Find the `menu/` block added by the `background-themes` phase. Add the four new files to it:

```markdown
  menu/
    background-templo.webp        # misty mountain temple, warm violet
    background-dojo.webp          # cherry-blossom courtyard at night, teal
    background-cosmico.webp       # cosmic nebula, magenta/purple
                                  # all three: real Draw Things art, layered
                                  # behind each BACKGROUND_THEMES entry's own
                                  # fallbackGradient (themes.ts) via CSS --
                                  # see CLAUDE.md Conventions below
    vs-cpu.webp, two-players.webp,
    tutorial.webp, options.webp   # home-menu tile illustrations -- same
                                  # crowned-checkers-disc "sensei" mascot as
                                  # the app icon, one scene per tile. Wired
                                  # into MenuTile (app/page.tsx) as a
                                  # backgroundImage with a translucent
                                  # color-tint overlay on top -- ported from
                                  # Chess Sensei's own app/page.tsx pattern,
                                  # see CLAUDE.md Conventions below
```

- [x] **Step 2: Add a new Convention entry**

Add, after the "Background theme images" convention entry:

```markdown
### Menu tile illustrations: same mascot, ported tint-overlay pattern from Chess Sensei

`public/menu/vs-cpu.webp`/`two-players.webp`/`tutorial.webp`/`options.webp` are real Draw
Things art (model `z_image_turbo`) replacing `MenuTile`'s flat-gradient placeholder in
`app/page.tsx`. Direct inspection of Chess Sensei's own shipped tile images (not just design
spec §8's speculation) found all four chess-specific -- including `options.webp`, which the
spec guessed might not need differentiation; it centers a chess pawn on a chessboard floor, so
it does. All four were regenerated with the same crowned-checkers-disc "sensei" mascot as the
app icon, placed in a different scene per tile, negative-prompted against any chess piece/board.

The code side ports Chess Sensei's own `app/page.tsx` `MenuTile` structure verbatim: each tile's
`image` renders as `backgroundImage` CSS, with the tile's previously-opaque `gradient` value
converted to a translucent `rgba(...)` tint layered on top via an `absolute inset-0` span, so the
tile keeps its accent-color identity and the label stays legible regardless of the photo
underneath -- this is the same technique `app/page.tsx`'s home background already uses
(`fallbackGradient` layered with the real image via CSS), applied at tile scale instead of
page scale.
```

- [x] **Step 3: Run the full suite and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [x] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out menu-tile-illustrations phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** these four images are design spec §8's four `menu/*.webp` rows. This plan closes them out; the 3 `gameend/*.webp` mascot images and native iOS Capacitor setup remain separate, later work (already flagged in CLAUDE.md).
- **Placeholder scan:** no "TBD"/"handle it later" — every step has real, complete commands; the code-wiring task gives exact field names, class changes, and the alpha values to use, not a vague description of intent.
- **Pre-flight fact-check done while planning, not assumed:** confirmed via direct `Read` inspection of all four Chess Sensei source images that they're chess-specific (including `options.webp`, correcting the design spec's own speculation) rather than trusting the spec's guess; confirmed Chess Sensei's own `app/page.tsx` already solves the exact rendering problem this phase needs, and this plan ports its structure rather than re-designing one; confirmed `app/page.tsx`'s current `TileData`/`MenuTile` shape and its own comment describing the current placeholder state, to write an accurate diff description.
- **Type/interface consistency:** `TileData` gains one field (`image: string`); no other file imports or constructs a `TileData`/`MenuTile` outside `app/page.tsx` (confirmed via the same search used to write this plan), so the interface change is fully contained.
