# Background Theme Images (Phase 10b: Visual Assets) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. **Task 1 is controller-executed, not delegated to an implementer subagent — see its own note.**

**Goal:** Generate real Draw Things art for the three `BACKGROUND_THEMES` (`templo`/`dojo`/`cosmico`) that `/` and `/opcoes` already render behind a CSS `fallbackGradient` placeholder, closing the gap CLAUDE.md's own "Spec §8's background-art claim was verified false during implementation" entry flags as real, deferred Phase 10 work.

**Architecture:** The second narrow slice of design spec §13 phase 10 (following `2026-09-03-app-icon.md`, the first). `lib/settings/themes.ts`'s `BACKGROUND_THEMES` registry already points `templo`/`dojo`/`cosmico` at `/menu/background-{templo,dojo,cosmico}.webp` — paths that currently 404 harmlessly behind each theme's own `fallbackGradient`, layered in via `backgroundImage: url(${image}), ${fallbackGradient}` CSS on both `app/page.tsx` and `app/opcoes/page.tsx`. This plan drops real `.webp` files at those exact paths; **no code change is needed**, matching what that CLAUDE.md entry already promises.

Chess Sensei's own three background images (verified during an earlier phase's research, see CLAUDE.md) are unusable here — direct inspection showed all three center chess-specific imagery (a giant chess king piece, a floating chessboard). This plan generates genuinely new, checkers-agnostic scenery instead: three distinct zen/atmosphere moods (misty mountain temple, a cherry-blossom dojo courtyard at night, a cosmic nebula), deliberately **without** attempting to render any game piece or mascot character within the scene — unlike the app-icon plan's single centered subject, a busy scenic background is exactly the kind of composition where getting an incidental game-piece render wrong (as happened twice during the app-icon plan) would be far more likely and far more costly to fix. Each prompt's color palette is anchored to the theme's own existing `fallbackGradient` (already-chosen, already-shipped colors) so the real image reads as a continuation of that gradient, not a jarring swap, and so the `PageGlow` darkening overlay every consuming page already applies keeps foreground text legible regardless of the photo's own contrast.

**Tech Stack:** Draw Things.app (local, HTTP API Server — already confirmed running), `curl`, `python3` (base64 decode only — no Pillow compositing needed this time, unlike the maskable icon), `sips`, `cwebp` (both confirmed installed). No npm dependency, no code changes beyond a CLAUDE.md entry.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` (§7's `themes.ts`/`BACKGROUND_THEMES` reuse, §8's Generation pipeline paragraph). The three background images aren't in §8's own asset table (only the app icon and menu-tile/game-end rows are) — their need was discovered during implementation and is tracked in CLAUDE.md instead; this plan closes that gap.

## Global Constraints

- **Process (CLAUDE.md, hard repo rule):** no worktrees, no feature branches. Every task's changes are committed directly to `main` and pushed (`git push origin main`) immediately once verified. `CLAUDE.md` is updated at the end of this phase (Task 2).
- **No game pieces in these images, deliberately.** These are ambient page backgrounds, not branded illustrations — every prompt below explicitly excludes chess/checkers pieces and boards in its negative prompt. This is a scope choice made to avoid the app-icon plan's exact failure mode (the model defaulting to a chess-piece silhouette) in a much harder-to-verify, much busier composition.
- **Each image's palette is anchored to its existing `fallbackGradient`** (already shipped, already chosen): `templo` warm violet/purple, `dojo` cool teal/blue-green, `cosmico` magenta/purple radial burst — see Task 1's prompts.
- **Legibility is not this plan's job to re-verify from scratch.** `PageGlow`'s darkening overlay (`darken={[0.55, 0.85]}` on the home menu; a lighter unnamed default on `/opcoes`) already exists specifically to keep foreground text/tiles readable over *any* background image — this plan generates atmospheric art, not specifically low-contrast art, and relies on that existing overlay the same way the `fallbackGradient` itself already does today.
- **Task 1 is controller-executed, not delegated to an implementer subagent** — a sequence of slow, interactive, judged-by-eye Draw Things calls, no code diff to review. Matches this project's own established precedent (the app-icon plan, and Chess Sensei's own `board-background-themes` plan).
- **File-size discipline, per design spec §8's own explicit note:** final assets in the few-KB to ~70KB range (`sips` downscale + `cwebp -q 85`), not multi-MB originals — matching Chess Sensei's own board-texture/background pipeline exactly.
- **Cost if any ruling above is wrong:** low. Any single theme's art can be regenerated later in isolation (the other two, and all wiring, are unaffected) if it doesn't read well in practice.

---

### Task 1: Generate the three background images

**Files:**
- Create: `public/menu/background-templo.webp`, `public/menu/background-dojo.webp`, `public/menu/background-cosmico.webp`
- Modify: `CLAUDE.md`'s Structure section (the `public/` tree needs a `menu/` entry — folded into Task 2's close-out instead, to keep this task purely asset generation)

**Interfaces:** none — static assets. `lib/settings/themes.ts`'s `BACKGROUND_THEMES` registry already references these exact paths; `app/page.tsx` and `app/opcoes/page.tsx` already render `theme.image` in a `backgroundImage` CSS property. No other file needs to change for these to take effect.

> **Controller-executed — see this plan's Global Constraints.** Do not dispatch this task to an implementer subagent.

- [x] **Step 1: Confirm Draw Things is reachable**

```bash
curl -s -m 5 http://127.0.0.1:7860/ -o /dev/null -w "%{http_code}\n"
```

Expected: `200`.

- [x] **Step 2: Generate "templo" — misty mountain temple, warm violet palette**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital painting, serene misty mountain peaks at dusk, an ancient stone temple platform floating amid the clouds, warm glowing paper lanterns drifting in the sky, soft deep violet and warm gold color palette, layered atmospheric fog, tranquil zen mood, wide scenic composition, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, camera, chess, chess piece, chess board, checkers, checkers board, game piece, people, human figure, character, bright daylight, harsh lighting, cluttered, busy, blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/bg_templo_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/bg_templo_raw.json'))
open('/tmp/bg_templo_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
```

Budget 2-3 minutes. Read `/tmp/bg_templo_original.png` — must read as a warm violet/purple misty-mountain scene, no game pieces, no boards, no people. If a game piece/board sneaks in despite the negative prompt, or the mood reads as the wrong color family, adjust the prompt and regenerate.

- [x] **Step 3: Generate "dojo" — cherry-blossom courtyard at night, cool teal palette**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital painting, a traditional wooden dojo courtyard at night, cherry blossom trees in full bloom with petals drifting on the breeze, curved temple rooftops silhouetted against a starry sky, soft deep teal and cool blue-green color palette with warm lantern accents, tranquil peaceful mood, wide scenic composition, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, camera, chess, chess piece, chess board, checkers, checkers board, game piece, people, human figure, character, bright daylight, harsh lighting, cluttered, busy, blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/bg_dojo_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/bg_dojo_raw.json'))
open('/tmp/bg_dojo_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
```

Same inspection as Step 2, plus: confirm it reads as clearly distinct in mood/palette from `templo` (cooler teal/blue-green vs. warm violet) — the whole point of three themes is that they look different from each other, not just from the fallback gradients.

- [x] **Step 4: Generate "cosmico" — cosmic nebula, magenta/purple palette**

```bash
curl -s -m 480 -X POST http://127.0.0.1:7860/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "anime style digital painting, a vast cosmic nebula scene, swirling deep magenta and purple galaxy clouds, countless twinkling stars, a faint glowing constellation pattern, ethereal mystical deep space atmosphere, wide scenic composition, no text, no watermark, no signature",
    "negative_prompt": "text, watermark, signature, photorealistic, photo, camera, chess, chess piece, chess board, checkers, checkers board, game piece, people, human figure, character, planet close-up, spaceship, cluttered, busy, blurry, low quality",
    "width": 1024,
    "height": 1024,
    "steps": 8,
    "sampler_name": "UniPC Trailing",
    "batch_size": 1
  }' -o /tmp/bg_cosmico_raw.json
python3 -c "
import json, base64
d = json.load(open('/tmp/bg_cosmico_raw.json'))
open('/tmp/bg_cosmico_original.png', 'wb').write(base64.b64decode(d['images'][0]))
"
```

Same inspection, plus: confirm it reads as distinct from both `templo` and `dojo` (a starfield/nebula, not another mountain or courtyard scene).

- [x] **Step 5: Downscale and compress all three, matching the design spec's file-size discipline**

```bash
mkdir -p public/menu
cd public/menu

sips -Z 1200 /tmp/bg_templo_original.png --out background-templo-1200.png
sips -Z 1200 /tmp/bg_dojo_original.png --out background-dojo-1200.png
sips -Z 1200 /tmp/bg_cosmico_original.png --out background-cosmico-1200.png

cwebp -q 85 background-templo-1200.png -o background-templo.webp
cwebp -q 85 background-dojo-1200.png -o background-dojo.webp
cwebp -q 85 background-cosmico-1200.png -o background-cosmico.webp

rm -f background-templo-1200.png background-dojo-1200.png background-cosmico-1200.png
cd ../..
```

- [x] **Step 6: Sanity-check file sizes and do a final visual pass**

```bash
ls -la public/menu/background-templo.webp public/menu/background-dojo.webp public/menu/background-cosmico.webp
```

Expected: each well under 100KB (design spec §8's own "few-KB to ~70KB" precedent). Read each final `.webp` file directly to confirm it still looks right after compression (no visible banding/artifacts), and that all three remain clearly distinguishable from one another at a glance.

- [x] **Step 7: Commit**

```bash
git add public/menu/background-templo.webp public/menu/background-dojo.webp public/menu/background-cosmico.webp
git commit -m "feat: generate real background-theme art (Draw Things)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

### Task 2: CLAUDE.md close-out

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none (documentation only).

- [x] **Step 1: Add the new `public/menu/` entry to the Structure section**

Find the `public/` block (immediately after the `icons/` block added in the app-icon phase). Add, right after it:

```markdown
  menu/
    background-templo.webp        # misty mountain temple, warm violet
    background-dojo.webp          # cherry-blossom courtyard at night, teal
    background-cosmico.webp       # cosmic nebula, magenta/purple
                                  # all three: real Draw Things art, layered
                                  # behind each BACKGROUND_THEMES entry's own
                                  # fallbackGradient (themes.ts) via CSS --
                                  # see CLAUDE.md Conventions below
```

- [x] **Step 2: Replace the superseded Convention entry**

Find the entry titled `### Spec §8's background-art claim was verified false during implementation`. Replace it with:

```markdown
### Background theme images: real Draw Things art, generated in this phase

`public/menu/background-templo.webp`/`background-dojo.webp`/`background-cosmico.webp` are real
Draw Things art (model `z_image_turbo`, local HTTP API) -- closing the gap this same entry used
to document: Chess Sensei's own three background images were verified (during an earlier
phase's research) to center chess-specific imagery (a giant chess king piece, a floating
chessboard) and were never copied. Deliberately generated WITHOUT any game piece or mascot
character in the scene -- three distinct atmosphere/mood pieces (misty mountain temple / warm
violet, cherry-blossom dojo courtyard at night / cool teal, cosmic nebula / magenta-purple),
each palette anchored to that theme's own pre-existing `fallbackGradient` in `lib/settings/
themes.ts` so the real photo reads as a continuation of the gradient rather than a jarring
swap. No code changed to land these -- `themes.ts already pointed `BACKGROUND_THEMES` at these
exact paths, with the `fallbackGradient` kept in place underneath as a defense-in-depth CSS
fallback (image load failure, slow network) rather than removed now that real files exist.
See `docs/superpowers/plans/2026-09-03-background-themes.md` for the exact generation pipeline.
```

- [x] **Step 3: Run the full suite and build**

Run: `npm test -- --run && npm run build`
Expected: PASS / clean build.

- [x] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out background-themes phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01HLi7H81FkZZSBCDR3ndnTj"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** these three images aren't in design spec §8's own asset table (that table only covers the app icon, 4 menu tiles, and 3 game-end mascots) — their need was discovered during an earlier phase's implementation and tracked as a CLAUDE.md gap instead. This plan closes that specific, already-documented gap; it does not touch §8's table rows (menu tiles, game-end mascots), which remain their own separate future plans.
- **Placeholder scan:** no "TBD"/"handle it later" — every step has real, complete commands, and every prompt is a genuine, concrete Draw Things request, not a description of one.
- **Pre-flight fact-check done while planning, not assumed:** confirmed via `curl` that Draw Things is reachable; confirmed via direct `Read` inspection of Chess Sensei's own three background images that they are indeed chess-specific (matching CLAUDE.md's existing claim, not just trusting the prior write-up); confirmed `public/menu/` doesn't exist yet in this repo and `themes.ts`'s registry/fallback-gradient values directly, to anchor each prompt's palette to something already shipped rather than inventing new colors.
- **Type/interface consistency:** N/A — no code interfaces are touched; `themes.ts`'s existing `BackgroundThemeInfo`/`BACKGROUND_THEMES` shape is unchanged, matching what this plan's Architecture section promises ("no code change is needed").
