# Checkers Sensei

Next.js (App Router) checkers app — the twin/sibling project to Chess Sensei
(`rpaquito/ChessLearningGame`): play against a custom AI (3 difficulty
levels) or two players on the same device, a learning mode (legal moves,
mandatory-capture highlights, move suggestion, move-quality feedback), and a
tutorial at `/aprender` including an openings/traps trainer. Installable PWA,
works offline. No backend/API routes, no authentication — everything runs
client-side, same architecture as the twin project.

Design spec: `docs/superpowers/specs/2026-08-31-checkers-sensei-design.md`
— read it for the full rationale behind every decision below. This file is
the living summary of non-obvious conventions actually implemented; the spec
is the historical design record and isn't updated after the fact.

## Process rules

- **Branching**: no worktrees, no feature branches. Every task's changes are
  committed directly to `main` and pushed immediately (`git push origin
  main`) once its tests pass — never batch multiple tasks into one unpushed
  commit.
- **Vercel**: project `checkers-learning-game` (to be created), team
  `algorithm-cloud` (same team as Chess Sensei). Deploy is Vercel-only,
  auto-deploy on push to `main` via the GitHub integration once the project
  exists — no local `vercel deploy` needed for normal work.
- **GitHub**: `rpaquito/CheckersLearningGame`, `origin` remote already
  configured.
- **This file**: updated at the end of every implementation-plan phase with
  whatever new non-obvious convention that phase introduced — not a
  one-shot document. If implementing a phase teaches something a future
  implementer (human or agent) would need but couldn't derive from reading
  the code alone, it belongs here.

## Structure

```
app/
  layout.tsx       # root layout (placeholder until the menu/branding phase)
  page.tsx          # home page (placeholder until the menu/branding phase)
  globals.css        # Tailwind v4 entrypoint (placeholder tokens until the
                      # visual-identity phase — see spec §8 for the real palette)
```

## Deploy

Vercel only (same as Chess Sensei — Docker/self-host is not supported). No
environment variables needed — no backend, no auth, no API routes.
