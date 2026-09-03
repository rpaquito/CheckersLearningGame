# Checkers Sensei — iOS: from "on my phone" to the App Store

Reference doc for getting the Capacitor-wrapped app (see `CLAUDE.md`'s
native-iOS section) onto an iPhone, and the full path to a public App
Store release. Written 2026-09-03. Xcode 26.6, Capacitor 8.5.1,
`IPHONEOS_DEPLOYMENT_TARGET = 15.0` at time of writing — re-check if a
lot of time has passed.

## Part 1 — Get it on your iPhone right now (free, no App Store)

No paid account needed — just a Mac, Xcode, your iPhone, and any free
Apple ID.

1. **Build + sync** (from the repo root):
   ```bash
   npm run build:capacitor   # MUST run first — regenerates out/, or Xcode gets stale code
   npm run cap:sync:ios      # copies out/ into ios/App/App/public, runs pod install
   npm run cap:open:ios      # opens ios/App/App.xcworkspace in Xcode
   ```
2. In Xcode, select the **App** target → **Signing & Capabilities** tab
   → check **Automatically manage signing** → set **Team** to your
   personal Apple ID (Xcode → Settings → Accounts, add it if it's not
   there).
3. Plug in your iPhone (or set up wireless run: **Window → Devices and
   Simulators**, tick "Connect via network" once connected by cable the
   first time).
4. Pick your iPhone from the device dropdown in the toolbar, hit **▶
   Run**.
5. First launch will be blocked as "Untrusted Developer" — on the
   iPhone go to **Settings → General → VPN & Device Management**, tap
   your Apple ID, tap **Trust**.
6. A free Apple ID's signature expires after **7 days** — the app just
   needs a re-run from Xcode to refresh; a paid account (Part 2) signs
   for a year.

## Part 2 — TestFlight (share with others, no cable)

Needs the **Apple Developer Program** ($99/year) — enrollment is
identity/payment-gated, so only you can do it:
[developer.apple.com/programs](https://developer.apple.com/programs)
(individual approval is usually same-day to 48h; an organization needs
D-U-N-S verification, which can take longer).

Once enrolled:

1. In Xcode, switch the App target's **Team** to the paid Developer
   team.
2. **App Store Connect**
   ([appstoreconnect.apple.com](https://appstoreconnect.apple.com)) →
   My Apps → **+ → New App**. Bundle ID `pt.rpaquito.checkerssensei`
   (Xcode can auto-register it on first archive with automatic
   signing), name **"Checkers Sensei"** (check it's not taken — App
   Store names are global), pick a SKU.
3. In Xcode: **Product → Archive** (device target must be "Any iOS
   Device", not a simulator).
4. In the Organizer that opens: **Distribute App → App Store Connect →
   Upload**.
5. Wait for Apple's processing email (15 min–a few hours), then in App
   Store Connect → your app → **TestFlight** tab, the build appears.
6. Fill in required Test Information (what to test, feedback email).
   - **Internal testing** (up to 100 people with a role on your team):
     live immediately, no review.
   - **External testing** (up to 10,000, via email or a public link):
     first build needs a quick Beta App Review (usually <24h).
7. Install **TestFlight** from the App Store on your iPhone, accept the
   invite/link, install Checkers Sensei through it. Builds expire after
   90 days.

## Part 3 — Public App Store release

Same prerequisites as Part 2, plus the actual store listing (App Store
Connect → your app → **App Store** tab, separate from TestFlight):

- **Screenshots** — at minimum the 6.9" and 6.5" iPhone sizes;
  simulator screenshots are accepted.
- **Description, keywords, support URL, category** (Games → Board, or
  Education).
- **Age rating questionnaire.**
- **Privacy Policy URL** — required even though the app collects
  nothing (no backend, no auth, only on-device `localStorage`). A
  single static page stating exactly that is enough — it can be
  hosted as a plain page on the same Vercel project, or any free static
  host.
- **App Review** — typically 24-48h after submitting for review;
  common rejection reasons for a small hobby game are missing privacy
  policy URL, crashes on launch, or placeholder/Lorem-ipsum text
  anywhere in the listing or app itself — double-check both languages
  (`pt`/`en`) render real content before submitting.

## Notes specific to this app

- **Bundle ID `pt.rpaquito.checkerssensei`** is deliberately distinct
  from Chess Sensei's `pt.rpaquito.chesssensei` (design spec §7) and
  becomes effectively permanent once submitted — see `CLAUDE.md`'s
  native-iOS convention entry.
- **`out/` staleness trap:** `npm run cap:sync:ios` only copies whatever
  is already in `out/` at the moment it runs — it does not rebuild.
  Always run `npm run build:capacitor` immediately before it, every
  time (after any code change, and again after a `git pull`), or Xcode
  opens against stale content.
- **CocoaPods, not Swift Package Manager:** this project's `ios/`
  platform was added with `npx cap add ios --packagemanager CocoaPods`
  explicitly — a bare `npx cap add ios` on this Capacitor version
  defaults to SPM instead, which doesn't produce the `App.xcworkspace`/
  `Podfile` this doc's commands assume. If `ios/` is ever deleted and
  regenerated, use the same explicit flag.
- **Haptics only work on a physical device** — the iOS Simulator has no
  Taptic Engine, so `lib/native/haptics.ts`'s `hapticMove`/
  `hapticCapture`/`hapticKinged` are silently inert there even inside
  the native shell; verify them on a real iPhone.
