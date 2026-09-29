---
name: game-integration
description: >
  Creates the spec for a new canvas game in Arcade Vault (via the /spec skill).
  Use this skill whenever the user wants to add, integrate, or port a game —
  "agregar juego X", "integrar Tetris/Arkanoid/Snake", "port game.js a la plataforma",
  "nuevo juego al vault", or similar. Trigger even if the user only names a game that
  exists in references/started-games/. This skill ONLY creates the spec and stops —
  implementation is done separately with /spec-impl.
argument-hint: "game name or slug (e.g. 'tetris', 'arkanoid', 'serpiente')"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion
---

# game-integration — Crear el spec de un juego canvas para Arcade Vault

Este skill **solo crea el spec**. La implementación (componente React, play page, Supabase) se hace con `/spec-impl [slug]` una vez que el spec esté aprobado.

---

## Phase 0 — Orient yourself

Before anything else, run these two checks:

1. **Is there already a spec for this game?**
   List `specs/` and look for a file matching the game's name or slug. If one exists, read it and check its state field.
   - State is `Approved` → tell the user: "El spec ya existe y está Approved. Ejecuta `/spec-impl [slug]` para implementarlo." **Stop here.**
   - State is `Draft` → tell the user: "El spec ya existe como Draft. Revisalo, cambia el estado a `Approved` y luego ejecuta `/spec-impl [slug]`." **Stop here.**
   - No spec exists → continue to Phase 1.

2. **Is there a reference game in `references/started-games/`?**
   Run `ls references/started-games/` to check. If a matching directory exists (e.g. `03-tetris/`, `04-arkanoid/`), note its path — you will read it in Phase 1.

---

## Phase 1 — Create the spec (delegates to `/spec`)

The game needs a spec before any code is written. You will **invoke the `spec` skill** with a rich seed description so that its questions start from a solid base.

**Before invoking `/spec`**, if a reference game directory exists:

- Read its `CLAUDE.md` first (if it exists — it usually has port notes and mechanic descriptions).
- Then read its `README.md`.
- Extract: main mechanics, control keys, scoring rules, win/lose conditions, any special items or power-ups.

**Compose a one-sentence seed** that covers the essentials. For example:

> "Integrar el juego canvas Tetris a la plataforma Arcade Vault: bloques caen desde arriba, el jugador los rota y mueve horizontalmente, completar una fila la elimina y suma puntos, el juego termina cuando los bloques alcanzan el tope."

**Then invoke the spec skill:**

```
Skill("spec", "< your seed sentence >")
```

The `/spec` skill handles all clarification questions and writes the spec file. Among the things it will ask about — which you should be ready to inform based on what you already know from the reference game:

- Slug/id for the URL (e.g. `tetris`, `arkanoid`, `serpiente`)
- Game category: `ARCADE`, `PUZZLE`, `SHOOTER`, or `VERSUS`
- Accent color: `cyan`, `magenta`, `green`, or `yellow`
- Controls (keyboard keys)
- Initial lives / level structure
- Score per action

**Stop after the spec is saved.** Tell the user:

> "El spec está guardado como Draft en `specs/`. Revisalo, cambia el estado a `Approved` y luego ejecuta `/spec-impl [slug]` para que comience la implementación."

**This skill ends here. Do not proceed to any implementation.**

---

## Referencia de implementación

Las fases de implementación (componente React, play page, Supabase, verificación) están documentadas en `.claude/skills/game-integration/implementation-guide.md`. Léelo cuando ejecutes `/spec-impl` sobre un spec de juego aprobado.
