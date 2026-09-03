# Native iOS App (Capacitor) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **This plan stops before any Xcode-signing/on-device step — see Global Constraints.**

**Goal:** Wrap the app in a native iOS shell via Capacitor, reusing Chess Sensei's own already-shipped, working pipeline (`docs/ios-app-store-plan.md`, `lib/native/haptics.ts`, the `BUILD_TARGET=capacitor` build split) verbatim where the two apps' needs are identical, adapted only where checkers genuinely differs (bundle ID, app name — already correct here — and a `hapticKinged` promotion haptic replacing chess's `hapticCheck`, since checkers has no "check" concept).

**Architecture:** Design spec §11 locks this decision already ("Reuse the entire Capacitor pipeline and `docs/ios-app-store-plan.md` structure verbatim") — this plan executes it, it doesn't re-derive it. This repo is already partway there: `next.config.ts`'s `BUILD_TARGET=capacitor` → `output: 'export'` branch was written speculatively back in an earlier phase (confirmed present, unused until now), and `ServiceWorkerRegistration.tsx`'s own doc comment already flags "Phase 10 must add [the native-platform guard] back" — this plan is that phase. What's still missing: the `@capacitor/*` dependencies themselves, `capacitor.config.ts`, the two `cap:*` npm scripts, the actual `ios/` native project (scaffolded via `npx cap add ios`, not written by hand), `lib/native/haptics.ts`, and the guard's actual code (the comment predicting it is not the guard itself).

Unlike Chess Sensei's own native-iOS plan, this one has **no rebrand task** — "Checkers Sensei" is already the name everywhere (`app/layout.tsx`, `public/manifest.json`, `package.json`), and no icon-production task — `public/icons/icon-master.png` already exists as real, accepted Draw Things art from the `app-icon` phase. Both were real, multi-step tasks in chess's plan; here they're already done, which is why this plan is meaningfully shorter.

**Scope boundary — approved by the user before this plan was written:** this plan takes the native project through everything automatable — dependencies, config, the haptics module, the service-worker guard, `npx cap add ios` scaffolding, and a non-interactive `xcodebuild` simulator-SDK compile check (no signing required, no device, no Xcode GUI). It deliberately **stops before** anything requiring the user's own Apple ID or a physical device: opening Xcode's GUI, configuring signing, running on a real iPhone, and the "Trust This Developer" on-device step are the user's own follow-up, walked through by this plan's Task 5 doc (`docs/ios-app-store-plan.md`).

**Tech Stack:** `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/haptics` (npm). Xcode + `xcodebuild` command-line tools (confirmed installed: `xcode-select -p` → `/Applications/Xcode.app/Contents/Developer`). CocoaPods (confirmed installed: `pod` on PATH via Homebrew) — required by `cap sync`'s native dependency install.

**Spec:** `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md` (§11 "Native iOS", §7's naming table for the bundle ID swap).

## Global Constraints

- **Process (CLAUDE.md, hard repo rule):** no worktrees, no feature branches. Every task's changes are committed directly to `main` and pushed (`git push origin main`) immediately once verified. `CLAUDE.md` is updated at the end of this phase (Task 6).
- **Stops before Xcode-GUI/signing/on-device steps — user-approved boundary.** Do not run `npm run cap:open:ios` (opens the Xcode GUI), do not attempt any code-signing configuration, do not attempt to run on a simulator or device beyond the one non-interactive `xcodebuild ... build` compile check in Task 1. Getting the app onto the user's own iPhone is their own follow-up, using the doc this plan writes (Task 5).
- **Bundle ID is `pt.rpaquito.checkerssensei`** (design spec §7's naming table) — distinct from Chess Sensei's `pt.rpaquito.chesssensei`. Once this ships to the App Store it becomes effectively permanent (same reasoning Chess Sensei's own CLAUDE.md documents for its bundle ID) — get it right now, don't treat it as a placeholder.
- **`hapticKinged` replaces chess's `hapticCheck`** — design spec §11's own explicit call-out: checkers has no "check" concept, but promotion (a man becoming a king) is the natural checkers-specific equivalent "big moment" worth a distinct haptic. This is a per-move property (`CheckersMove.promotes`), not a state-transition like chess's `status === 'check'` — Task 3 details exactly how it's detected at the call site.
- **Haptics fire only on the human player's own move** — never on the AI's automatic reply, never on a Learning Mode suggestion. Matches Chess Sensei's own deliberate scope decision (feedback tied to the player's own actions, not every board change) and this repo's own established "hint/AI move vs. human move" distinctions elsewhere (e.g. CLAUDE.md's "Learning Mode's suggestion strength" entry).
- **The `Vercel` web build must stay completely unaffected.** `BUILD_TARGET=capacitor` is only ever set by the new `build:capacitor` npm script this plan adds — the GitHub-integration-triggered `npm run build` Vercel actually runs never sets it, so `output: 'export'` never activates there. Nothing in this plan touches the plain `build`/`dev`/`start` scripts.
- **`ios/` is committed to git** (matching Chess Sensei's own precedent — the native Xcode project, `Podfile`/`Podfile.lock`, storyboards, and default asset catalogs are real, small, text-or-small-binary files worth version-controlling), **except** `Pods/`, `build/`, `DerivedData/`, `xcuserdata/`, and the `App/App/public` directory (a `cap sync`-regenerated copy of `out/`, not meant to be tracked twice) — Task 1 extends `.gitignore` accordingly.
- **Cost if any ruling above is wrong:** low-to-moderate. The `ios/` project can be deleted and re-scaffolded via `npx cap add ios` at any time (it's a build artifact of `capacitor.config.ts` + `out/`, not hand-authored); the haptics module and SW guard are small, contained, and match an already-proven pattern from the sibling repo.

---

### Task 1: Capacitor project + iOS platform

**Files:**
- Modify: `package.json` (4 new dependencies, 3 new scripts)
- Create: `capacitor.config.ts`
- Modify: `.gitignore`
- Create (via CLI, not by hand): `ios/` — the full Xcode project

**Interfaces:**
- Consumes: `next.config.ts`'s existing `BUILD_TARGET=capacitor` → `output: 'export'` branch (already present, unused until this task's new `build:capacitor` script actually sets that env var).
- Produces: a committed `ios/` Xcode project; `npm run cap:sync:ios`/`npm run cap:open:ios` scripts. Task 4 (service worker guard) and Task 3 (haptics) both depend on `@capacitor/core` being installed by this task.

- [ ] **Step 1: Install the Capacitor dependencies**

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/haptics
```

- [ ] **Step 2: Create `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pt.rpaquito.checkerssensei',
  appName: 'Checkers Sensei',
  webDir: 'out',
};

export default config;
```

- [ ] **Step 3: Add the three new npm scripts**

In `package.json`'s `"scripts"` object, add (alongside the existing `build`):

```json
"build:capacitor": "BUILD_TARGET=capacitor next build",
"cap:sync:ios": "npx cap sync ios",
"cap:open:ios": "npx cap open ios",
```

- [ ] **Step 4: Build the static export**

```bash
npm run build:capacitor
```

Expected: exits 0, `out/` exists and contains `index.html`. If this fails, stop and diagnose before proceeding — every later step in this task depends on a working static export (Capacitor copies `webDir` into the native project at creation time).

- [ ] **Step 5: Add the iOS platform**

```bash
npx cap add ios
```

Expected: creates `ios/App/App.xcworkspace`, `ios/App/App/public` (a copy of `out/`), and `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.

- [ ] **Step 6: Extend `.gitignore` for iOS build artifacts**

Add a new section at the end of `.gitignore`:

```gitignore

# Capacitor iOS — generated/build artifacts, never hand-edited
ios/App/App/public
ios/App/Pods
ios/App/build
ios/App/DerivedData
ios/**/xcuserdata/
ios/**/*.xcuserstate
```

- [ ] **Step 7: Sync and install native dependencies**

```bash
npx cap sync ios
```

Expected: exits 0; installs CocoaPods dependencies (`ios/App/Podfile.lock` is created).

- [ ] **Step 8: Verify the native project actually compiles (non-interactive, no signing needed)**

```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -configuration Debug build
```

Expected: `** BUILD SUCCEEDED **`. This does not require any Apple ID or code signing — a plain simulator-SDK build doesn't need one. This is the boundary named in this plan's Global Constraints: no further Xcode/device interaction happens in this plan.

- [ ] **Step 9: Commit**

```bash
git add capacitor.config.ts package.json package-lock.json .gitignore ios/
git commit -m "feat: add Capacitor iOS project

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 2: Haptics wrapper module

**Files:**
- Create: `lib/native/haptics.ts`
- Create: `lib/native/haptics.test.ts`

**Interfaces:** exports `hapticMove(): Promise<void>`, `hapticCapture(): Promise<void>`, `hapticKinged(): Promise<void>`. Task 3 consumes all three.

- [ ] **Step 1: Write the module**

```ts
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function hapticMove(): Promise<void> {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticCapture(): Promise<void> {
  if (!isNative()) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

// Checkers has no "check" concept (unlike Chess Sensei's own hapticCheck) --
// promotion (a man becoming a king) is this game's natural equivalent
// "distinct big moment" worth its own haptic. See design spec §11.
export async function hapticKinged(): Promise<void> {
  if (!isNative()) return;
  await Haptics.notification({ type: NotificationType.Warning });
}
```

- [ ] **Step 2: Write the tests**

```ts
import { describe, expect, it, vi } from 'vitest';
import { Haptics } from '@capacitor/haptics';
import { hapticCapture, hapticKinged, hapticMove } from './haptics';

vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: vi.fn(), notification: vi.fn() },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM' },
  NotificationType: { Warning: 'WARNING' },
}));

// jsdom has no native Capacitor bridge, so Capacitor.isNativePlatform() is
// false here -- this covers the real behavior of every test/SSR/Vercel
// context; the actual native call is only verifiable on-device.
describe('haptics (no-op branch — every environment except the native shell)', () => {
  it('hapticMove resolves without touching the native bridge', async () => {
    await expect(hapticMove()).resolves.toBeUndefined();
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('hapticCapture resolves without touching the native bridge', async () => {
    await expect(hapticCapture()).resolves.toBeUndefined();
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('hapticKinged resolves without touching the native bridge', async () => {
    await expect(hapticKinged()).resolves.toBeUndefined();
    expect(Haptics.notification).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run lib/native/haptics.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/native/haptics.ts lib/native/haptics.test.ts
git commit -m "feat: add native haptics wrapper module

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 3: Wire haptics into `/jogar`

**Files:**
- Modify: `app/jogar/page.tsx`

**Interfaces:** consumes `hapticMove`/`hapticCapture`/`hapticKinged` from `@/lib/native/haptics` (Task 2).

**Scope decision (document in Task 6):** haptics fire only on the human player's own move (`handleSquareClick`) — never on the AI's automatic move (the separate effect that calls `makeMove` for the AI's turn), never on `handleRequestSuggestion`. This is checked by inspecting the full `CheckersMove` (not just the `from`/`to` squares) matched from `legalMovesFrom(state.board, state.turn, selected)` — using the real move-generation engine directly (already imported project-wide, e.g. by `moveExplanation.ts` call sites in this same file) rather than adding a new API surface to `useCheckersGame`.

- [ ] **Step 1: Import the haptics functions and the engine's `legalMovesFrom`**

Add to `app/jogar/page.tsx`'s import block:

```ts
import { legalMovesFrom as legalMovesFromEngine } from '@/lib/checkers/moveGeneration';
import { hapticCapture, hapticKinged, hapticMove } from '@/lib/native/haptics';
```

(`applyMove` is already imported from `@/lib/checkers/moveGeneration` in this file — add `legalMovesFrom` as a second named import from the same module, aliased to avoid colliding with the hook's own `legalMovesFrom` already destructured from `useCheckersGame`.)

- [ ] **Step 2: Fire the right haptic after a played move**

In `handleSquareClick`, the existing branch is:

```ts
    if (selected !== null && legalTargets.includes(square)) {
      if (learningModeEnabled) {
        pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
      }
      makeMove(selected, square);
      setSelected(null);
      return;
    }
```

Change it to look up the full move *before* calling `makeMove` (matching this file's existing `moverColor`/`boardBeforeMove` capture, which also runs before the move is applied), then fire the corresponding haptic:

```ts
    if (selected !== null && legalTargets.includes(square)) {
      if (learningModeEnabled) {
        pendingGradeRef.current = { boardBeforeMove: state.board, moverColor: state.turn };
      }
      const playedMove = legalMovesFromEngine(state.board, state.turn, selected).find((m) => m.to === square);
      makeMove(selected, square);
      setSelected(null);
      if (playedMove) {
        if (playedMove.promotes) {
          hapticKinged();
        } else if (playedMove.captures.length > 0) {
          hapticCapture();
        } else {
          hapticMove();
        }
      }
      return;
    }
```

(Same first-match-wins ambiguity already documented in CLAUDE.md's "`makeMove`'s return value" convention entry for the rare multi-route-same-destination case — acceptable here for the same reason: picking the wrong of two otherwise-equivalent capture chains still fires a correct-in-spirit `hapticCapture`, never a wrong haptic category.)

- [ ] **Step 3: Verify nothing broke**

Run: `npm run test` — expect all tests green (haptics no-op safely in jsdom).
Run: `npx tsc --noEmit` — expect clean.
Run: `npm run lint` — expect clean.

- [ ] **Step 4: Manual live check (web)**

```bash
npm run dev
```

Open `/jogar`, play a few moves including at least one capture and (if reachable) one promotion. Confirm: no console errors, gameplay is otherwise identical (haptics no-op on the web, so nothing should visibly change).

- [ ] **Step 5: Commit**

```bash
git add app/jogar/page.tsx
git commit -m "feat: fire haptic feedback on move/capture/promotion in /jogar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 4: Skip the service worker inside the native shell

**Files:**
- Modify: `components/ServiceWorkerRegistration.tsx`
- Modify: `components/ServiceWorkerRegistration.test.tsx`

**Interfaces:** consumes `Capacitor.isNativePlatform()` from `@capacitor/core` (installed in Task 1). This is the guard the component's own doc comment has predicted since the PWA phase — see this plan's Architecture section.

- [ ] **Step 1: Write the failing tests**

Add to the top of `components/ServiceWorkerRegistration.test.tsx` (before the existing `describe` block), and add a new `describe` block:

```tsx
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';

const { isNativePlatformMock } = vi.hoisted(() => ({
  isNativePlatformMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: isNativePlatformMock },
}));

describe('ServiceWorkerRegistration — native guard', () => {
  beforeEach(() => {
    isNativePlatformMock.mockReset();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue({}),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  });

  it('does not register the service worker inside the native Capacitor shell', () => {
    isNativePlatformMock.mockReturnValue(true);
    render(<ServiceWorkerRegistration />);
    expect(navigator.serviceWorker.register).not.toHaveBeenCalled();
  });

  it('still registers the service worker on the web', () => {
    isNativePlatformMock.mockReturnValue(false);
    render(<ServiceWorkerRegistration />);
    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
  });
});
```

Keep the existing `describe('ServiceWorkerRegistration', ...)` block below it unchanged — its own `beforeEach` doesn't mock `@capacitor/core`, so `Capacitor.isNativePlatform()` will hit the real (non-mocked) package there; confirm this still resolves to `false` in jsdom (no native bridge) so those tests keep passing unmodified.

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `npx vitest run components/ServiceWorkerRegistration.test.tsx`
Expected: the new `does not register...` case FAILS — the component doesn't check `isNativePlatform()` yet.

- [ ] **Step 3: Add the native guard**

In `components/ServiceWorkerRegistration.tsx`, add the import:

```ts
import { Capacitor } from '@capacitor/core';
```

Change the top of the `useEffect` from:

```ts
  useEffect(() => {
    if (!navigator.serviceWorker) return;
```

to:

```ts
  useEffect(() => {
    // Inside the native Capacitor shell, the bundle already ships on disk
    // (webDir: 'out', see capacitor.config.ts) -- there's nothing for the
    // service worker to cache, and no reason to risk one behaving oddly
    // inside a WKWebView.
    if (Capacitor.isNativePlatform()) return;
    if (!navigator.serviceWorker) return;
```

Also update the component's own doc comment (which currently says "Deliberately has NO native-platform guard... Phase 10 must add that guard back") to describe the guard now in place instead of predicting it.

- [ ] **Step 4: Run the full suite**

Run: `npm run test`
Expected: all tests green.

- [ ] **Step 5: Commit**

```bash
git add components/ServiceWorkerRegistration.tsx components/ServiceWorkerRegistration.test.tsx
git commit -m "feat: skip service worker registration inside the native shell

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 5: Write the iOS App Store path doc

**Files:**
- Create: `docs/ios-app-store-plan.md`

**Interfaces:** none — reference documentation for the user's own follow-up (matches this plan's Scope boundary).

- [ ] **Step 1: Write the doc**

Adapt Chess Sensei's own `docs/ios-app-store-plan.md` (same three parts: sideload to your own iPhone free for 7 days, TestFlight via the paid Developer Program, full App Store release), substituting:
- App name: "Checkers Sensei" (not "Chess Sensei")
- Bundle ID: `pt.rpaquito.checkerssensei` (not `pt.rpaquito.chesssensei`)
- Build commands: `npm run build:capacitor` / `npm run cap:sync:ios` / `npm run cap:open:ios` (same script names, this repo)
- Category suggestion: Games → Board, or Education (same as chess — still accurate for a checkers app)
- Note the actual Xcode version/Capacitor version/`IPHONEOS_DEPLOYMENT_TARGET` this plan's Task 1 actually produced (check `ios/App/Podfile` and `npx cap --version` rather than copying chess's numbers verbatim — they may have moved on since chess's doc was written).

Keep chess's doc's core content model: a "get it on your iPhone right now, free" part first (no paid account, just Xcode + a free Apple ID + the 7-day resign caveat + the "Untrusted Developer → Trust" on-device step), then TestFlight, then full submission (screenshots, description, privacy policy URL — this app also collects nothing, no backend/auth, only `localStorage`).

- [ ] **Step 2: Commit**

```bash
git add docs/ios-app-store-plan.md
git commit -m "docs: add iOS App Store path plan

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

### Task 6: Full verification + CLAUDE.md close-out

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** consumes everything from Tasks 1–5.

- [ ] **Step 1: Run the full automated verification**

```bash
npm run test -- --run
npm run lint
npx tsc --noEmit
npm run build
npm run build:capacitor
npm run cap:sync:ios
```

Expected: every command exits 0. `npm run test` should report more tests than before this plan (the new `lib/native/haptics.test.ts` and the two new `ServiceWorkerRegistration.test.tsx` cases).

- [ ] **Step 2: Add a new Convention entry**

```markdown
### Native iOS shell (Capacitor) — reused verbatim from Chess Sensei, per design spec §11

`@capacitor/core`/`cli`/`ios`/`haptics` wrap the app in a native iOS shell, reusing Chess
Sensei's own already-shipped pipeline verbatim: `next.config.ts`'s `BUILD_TARGET=capacitor` →
`output: 'export'` branch (written speculatively in an earlier phase, now actually exercised by
the new `build:capacitor` npm script), `capacitor.config.ts` (`appId:
'pt.rpaquito.checkerssensei'` -- distinct from chess's `chesssensei`, effectively permanent once
submitted to the App Store), and `ios/` (the native Xcode project, scaffolded via `npx cap add
ios`, committed to git except `Pods/`/`build/`/`DerivedData/`/`xcuserdata/`/`App/App/public`,
see `.gitignore`).

**The Vercel web build is completely unaffected** -- `BUILD_TARGET=capacitor` is only ever set by
the new `build:capacitor` script; the GitHub-integration-triggered `npm run build` Vercel actually
runs never sets it, so `output: 'export'` never activates there.

`lib/native/haptics.ts` exports `hapticMove()`/`hapticCapture()`/`hapticKinged()`, each a no-op
unless `Capacitor.isNativePlatform()`. **`hapticKinged` is this app's own departure from Chess
Sensei's `hapticCheck`** -- checkers has no "check" concept; promotion (a man becoming a king) is
the natural checkers-specific "distinct big moment" instead (design spec §11). All three fire only
from `app/jogar/page.tsx`'s `handleSquareClick` (the human player's own move), never from the AI's
automatic reply or a Learning Mode suggestion -- `hapticKinged`/`hapticCapture`/`hapticMove` are
chosen by looking up the full `CheckersMove` (via `legalMovesFrom` from `moveGeneration.ts`, not
the hook's own square-only `legalMovesFrom`) matched by `to`, *before* calling `makeMove` --
subject to the same rare first-match-wins ambiguity CLAUDE.md's "`makeMove`'s return value" entry
already documents for multi-route-same-destination captures, accepted for the same reason (still
fires a correct-in-spirit haptic category).

`components/ServiceWorkerRegistration.tsx` now has the native-platform guard its own doc comment
had predicted since the PWA phase (`if (Capacitor.isNativePlatform()) return;`, checked before the
existing `serviceWorker` feature-detect) -- inside the native shell the bundle already ships on
disk (`webDir: 'out'`), so there's nothing for a service worker to cache.

**No rebrand or icon-production task was needed** (unlike Chess Sensei's own native-iOS plan) --
"Checkers Sensei" was already the name everywhere, and `public/icons/icon-master.png` already
existed as real, accepted Draw Things art from the `app-icon` phase (Phase 10a).

**This plan deliberately stops before Xcode signing / on-device steps** -- verified only via a
non-interactive `xcodebuild -sdk iphonesimulator` compile check (no signing needed). Getting the
app onto a real iPhone, TestFlight, and eventual App Store submission are the user's own
follow-up, documented in `docs/ios-app-store-plan.md` (Task 5 of
`docs/superpowers/plans/2026-09-03-native-ios-app-capacitor.md`).
```

- [ ] **Step 3: Update the `ServiceWorkerRegistration.tsx` Structure entry**

Find the line describing it (currently notes "No native-platform guard yet -- Phase 10 must add one"). Update it to reflect the guard now being in place.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: close out native-ios-app-capacitor phase in CLAUDE.md

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013gkzNEb1jUTnbr5VBNERUS"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** this closes design spec §11 ("Native iOS"), the last unaddressed row of §13's phase list alongside the four already-completed `Phase 10*` asset plans.
- **Placeholder scan:** no "TBD"/"handle it later" — every step is a real, complete command or exact, named code change.
- **Pre-flight fact-check done while planning, not assumed:** confirmed `next.config.ts` already has the `BUILD_TARGET=capacitor` branch (reducing this plan's Task 1 relative to chess's own equivalent task); confirmed no rebrand or icon work is needed (name/icon already correct here); confirmed Xcode CLI tools and CocoaPods are both already installed on this machine; confirmed the exact `CheckersMove` shape (`captures: Square[]`, `promotes: boolean`) needed for Task 3's haptic-selection logic; confirmed `components/ServiceWorkerRegistration.tsx`'s current guard-less state and its own doc comment predicting this exact task; read Chess Sensei's own native-iOS plan and its `haptics.ts`/`ServiceWorkerRegistration.tsx` end states directly (not from memory) to port them accurately.
- **Type/interface consistency:** `lib/native/haptics.ts` is a new module with no existing consumers to break. `app/jogar/page.tsx`'s only interface change is a new import; no exported type changes. `ServiceWorkerRegistration`'s props (none) are unchanged.
- **Scope boundary respected:** every step in Tasks 1–6 is either a file edit, an npm/git command, or a single non-interactive `xcodebuild` compile check — nothing opens Xcode's GUI, configures signing, or touches a simulator/device beyond that one compile check, matching the user-approved boundary from this plan's brainstorming conversation.
