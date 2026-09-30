# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

**Arcade Vault** — an online platform to play games and compete for high scores. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.

## Commands

```bash
npm run dev       # Start dev server (next dev)
npm run build     # Production build
npm run lint      # Run ESLint
```

No test runner is configured yet.

## Spec-Driven Development

This project uses spec-driven design. All features start as a spec before any code is written.

- `/spec <feature>` — create a spec interactively (saves to `specs/NN-slug.md`)
- `/spec-impl <NN-slug>` — implement an **Approved** spec step by step
- `/game-integration <game>` — create a spec for a new canvas game (detects if a reference implementation exists in `references/started-games/`)

## Design

- usar siempre la skill `/frontend-design` para disenar el frontend

Workflow: `/spec` → review → change state to `Approved` → `/spec-impl`

Specs live in `specs/`. Branch naming: `spec-NN-slug`. Never implement a spec whose state is not `Approved`.

## Next.js Version Note

This project uses Next.js **16** — a version with breaking changes from what most training data covers. Before writing any Next.js-specific code, read `node_modules/next/dist/docs/` for the current API. The `layout.tsx` already uses `LayoutProps<"/">` (a new generic type), which is not standard in older versions.

## Stack

- **Next.js 16** App Router (`app/` directory)
- **React 19**
- **Tailwind CSS v4** (configured via `@tailwindcss/postcss`, no `tailwind.config.js`)
- **TypeScript 5**
- Fonts: Geist Sans + Geist Mono via `next/font/google`
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — database + auth
- **Resend** — transactional email (contact form)

## Implemented Features (Specs)

| #   | Spec                                  | Status       |
| --- | ------------------------------------- | ------------ |
| 01  | MVP visual screens                    | Implementado |
| 02  | Home & About pages                    | Implementado |
| 03  | Resend contact form                   | Implementado |
| 04  | Supabase client setup (browser + SSR) | Implementado |
| 05  | Asteroids (Rocas) game                | Implementado |
| 06  | Leaderboard & games table in Supabase | Implementado |
| 07  | Tetris game                           | Implementado |
| 08  | Arkanoid game                         | Implementado |
| 09  | Snake (Serpentina) game               | Implementado |

## Project Structure

```
app/                        # Next.js App Router pages
  games/
    [id]/page.tsx           # Game detail page (title, top scores, "JUGAR" button)
    rocas/play/             # Asteroids
    tetris/play/
    arkanoid/play/
    serpentina/play/        # Snake
  leaderboard/
  hall-of-fame/
  auth/
  about/

src/
  components/
    games/                  # Canvas game React wrappers
      AsteroidsGame.tsx
      TetrisGame.tsx
      ArkanoidGame.tsx
      SnakeGame.tsx
    Nav.tsx, NavWrapper.tsx, HomeContent.tsx, GamesLibrary.tsx, …
  hooks/
    useSession.ts           # localStorage-based session (player name)
  lib/
    supabase/
      client.ts             # browser Supabase client
      server.ts             # SSR Supabase client
      queries.ts            # server-side queries (games, scores)
      queries-client.ts     # client-side score submission
      types.ts              # Game, Score, ScoreWithGame interfaces
    games/
      arkanoid/             # arkanoid game.js, levels.js, spritesheet.js
    constants.ts            # CATS filter values

references/                 # Reference implementations for porting games
specs/                      # Feature specs (NN-slug.md)
```

## Data Model (Supabase)

- **`games`** — id, title, short, long, cat, cover, color, best, plays
- **`scores`** — id, game_id, player_name, score, created_at

## Implemented Games

To know which games are already implemented, read `references/implemented-games.md` — it lists the id, title, category and description of every game registered in Supabase.

## Adding a New Game

0. Optional: ask `@game-planner` which game to add (suggestion history in `references/game-suggestions.md`)
1. Run `/game-integration <game name>` — creates the spec
2. Review spec → change state to `Approved`
3. Run `/spec-impl NN-slug` — implements canvas component, play page, and Supabase score submission
4. Register game in the `games` table in Supabase

Game canvas components live in `src/components/games/`. Each game's play page is at `app/games/<slug>/play/page.tsx`. Scores are submitted to Supabase via `src/lib/supabase/queries-client.ts`.
