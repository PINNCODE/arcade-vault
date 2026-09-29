---
name: game-integration
description: >
  Creates the spec for a new canvas game in Arcade Vault.
  Use this skill whenever the user wants to add, integrate, or port a game —
  "agregar juego X", "integrar Tetris/Arkanoid/Snake", "port game.js a la plataforma",
  "nuevo juego al vault", or similar. Trigger even if the user only names a game that
  exists in references/started-games/. This skill ONLY creates the spec and stops —
  implementation is done separately with /spec-impl.
argument-hint: "game name, slug, or @references/started-games/NN-slug/ path"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# game-integration — Crear el spec de un juego canvas para Arcade Vault

Este skill **solo crea el spec**. La implementación (componente React, play page, Supabase) se hace con `/spec-impl [slug]` una vez que el spec esté aprobado.

---

## Session context

Today's date (use it for the spec header — never guess it):
!`date +%F`

Existing specs (to determine the next sequential number):
!`ls specs/ 2>/dev/null || echo "specs/ folder does not exist yet"`

---

## Phase 0 — Orient yourself

Before anything else, run these two checks:

1. **Is there already a spec for this game?**
   List `specs/` and look for a file matching the game's name or slug. If one exists, read it and check its `Status:` field.
   - `Approved` → tell the user: "El spec ya existe y está Approved. Ejecuta `/spec-impl [slug]` para implementarlo." **Stop here.**
   - `Draft` → tell the user: "El spec ya existe como Draft. Revisalo, cambia el estado a `Approved` y luego ejecuta `/spec-impl [slug]`." **Stop here.**
   - No spec exists → continue to Phase 1.

2. **Is there a reference game in `references/started-games/`?**
   Run `ls references/started-games/` and look for a directory matching the game name. If one exists, note its path — you will read it in Phase 1.

---

## Phase 1 — Extract mechanics from the reference game

If a reference game directory exists:

1. Read its `CLAUDE.md` (usually has architecture details, port notes, data structures).
2. Read its `README.md` (player-facing description: controls, mechanics, scoring, win/loss conditions).
3. Extract and note: main mechanics, control keys, scoring rules, win/lose conditions, special items or power-ups, canvas dimensions, data structures.

If no reference game exists, work from the game name and any description in `$ARGUMENTS`.

---

## Phase 2 — Clarify (only if needed)

After reading the reference game, evaluate whether you can answer all four questions below **without assuming anything**:

1. **Slug** — derivable from the directory name (e.g. `03-tetris/` → `tetris`).
2. **Categoría** — `ARCADE`, `PUZZLE`, `SHOOTER`, or `VERSUS`. Derivable from the mechanics.
3. **Accent color** — `cyan`, `magenta`, `green`, or `yellow`. Derivable from the game's visual style.
4. **Exclusions** — anything in the reference game that clearly does not belong in the Arcade Vault version.

**If you can answer all four from the reference game context:** skip asking and record your choices in the spec's Decisions section with a brief reason for each. Proceed directly to Phase 3.

**If one or more answers are genuinely ambiguous** (the reference game does not provide enough signal): ask only the unresolved questions in a single `AskUserQuestion` block. Do not ask about things you can already determine. Wait for the answers before proceeding to Phase 3.

---

## Phase 3 — Write the spec

Once you have the answers, write the complete spec in one pass. Do not go section by section. Use the structure below (in the same language as the user's prompt):

```markdown
# SPEC NN — Integrar juego [Name] a Arcade Vault

> **Status:** Draft
> **Depends on:** SPEC 04, SPEC 06
> **Date:** YYYY-MM-DD (from session context above)
> **Objective:** [One sentence describing what is being built.]

## Scope

**In:**

- [Canvas game component as a React wrapper around the original JS logic]
- [Play page at `/games/[slug]`]
- [Score submission to Supabase `scores` table on game over]
- [Specific mechanics confirmed for this game]

**Out of scope (for future specs):**

- [Anything the user said to defer]
- [Touch/mobile controls]
- [Multiplayer]

## Data model

[Describe the game state structure. If the reference game already has one, reproduce the relevant parts.
Describe what gets submitted to Supabase on game over: `{ game_id, user_id, score, metadata }`.]

## Implementation plan

1. Create `components/games/[Slug]Game.tsx` — React wrapper that mounts a `<canvas>` and initialises the game engine.
2. Port `game.js` logic into the component (or import it as a JS module). Keep game state internal.
3. Wire the `onGameOver(score)` callback to the Arcade Vault score-submission flow.
4. Create `app/games/[slug]/page.tsx` using the shared `PlayPage` layout.
5. Register the game in `lib/games.ts` (id, name, slug, category, accent color, description).
6. Verify: run dev server, play to game over, confirm score appears in Supabase.

## Acceptance criteria

- [ ] Navigating to `/games/[slug]` loads the game without console errors.
- [ ] All original controls work as documented in the reference game.
- [ ] Completing a game (game over) submits the score to Supabase.
- [ ] The game appears in the home page game grid.
- [ ] [Any game-specific criteria, e.g.: "Completing a line adds the correct points per level."]

## Decisions

- **Yes:** Port the vanilla JS logic as-is, wrapped in a React component. Avoids rewriting ~300 lines of tested game code.
- **No:** Rewrite in React state. The game loop uses requestAnimationFrame and mutable state — React re-render cycles would fight it.
- [Other decisions made during Phase 2]

## Risks

| Risk                                    | Mitigation                                                         |
| --------------------------------------- | ------------------------------------------------------------------ |
| Game loop leaks after component unmount | Cancel RAF handle and remove event listeners in useEffect cleanup. |
| [Any game-specific risk]                | [Mitigation]                                                       |

## What is **not** in this spec

- [Repeat out-of-scope items as a closing reminder]
```

Fill in all placeholders using the information from the reference game and the user's answers. The `Depends on:` line should reference SPEC 04 (Supabase client setup) and SPEC 06 (leaderboard/games table) at minimum — verify they exist in `specs/` first.

---

## Phase 4 — Save the spec and create the branch

1. Determine the next sequential number from the `specs/` listing in the session context (highest existing number + 1, zero-padded to two digits).
2. Write the file at `specs/NN-[slug].md`.
3. Check for `specs/.spec-config.yml`. If missing, create it:

   ```yaml
   # spec workflow configuration
   AutoCreateBranch: true
   ```

4. **Create the git branch** using the same logic as `/spec-impl`:

   - Branch name: `spec-NN-[slug]` (derived from the spec filename without extension).
   - Read `AutoCreateBranch` from `specs/.spec-config.yml` (default: `true` if missing or unrecognized).

   **If `AutoCreateBranch` is `true`:**
   - Check `git status --short`. If the working tree is not clean, show the pending changes and ask the user how to proceed before touching git.
   - If the branch does not exist: `git checkout -b spec-NN-[slug]`.
   - If it already exists: `git checkout spec-NN-[slug]`.
   - Confirm the active branch after switching.

   **If `AutoCreateBranch` is `false`:** ask `Create and switch to branch spec-NN-[slug]? [y/N]` and proceed only on an explicit yes.

5. Confirm to the user:
   - Path of the saved file.
   - Active branch: `spec-NN-[slug]`.
   - The spec is in `Draft` state — review it, then change the status to `Approved`.
   - Next step: run `/spec-impl NN-[slug]` to begin implementation.

**Stop here. Do not propose implementing the spec or writing any code.**

---

## Referencia de implementación

Las fases de implementación (componente React, play page, Supabase, verificación) están documentadas en `.claude/skills/game-integration/implementation-guide.md`. Léelo cuando ejecutes `/spec-impl` sobre un spec de juego aprobado.
