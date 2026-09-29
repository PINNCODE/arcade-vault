---
name: game-integration
description: >
  Guides the full workflow to add a new canvas game to the Arcade Vault platform:
  spec creation (via the /spec skill), porting a vanilla JS game to a React canvas
  component, creating the dedicated play page, and registering the game in Supabase.
  Use this skill whenever the user mentions adding, integrating, or porting a game —
  "agregar juego X", "integrar Tetris/Arkanoid/Snake", "port game.js a la plataforma",
  "nuevo juego al vault", "implementar juego", or similar. Trigger even if the user
  only names a game that exists in references/started-games/. The skill covers both
  the spec phase (running /spec with game-specific context) and the full technical
  implementation.
argument-hint: "game name or slug (e.g. 'tetris', 'arkanoid', 'serpiente')"
allowed-tools: Read, Glob, Grep, Write, Edit, Bash, AskUserQuestion, mcp__supabase__execute_sql, mcp__supabase__list_tables
---

# game-integration — Add a canvas game to Arcade Vault

This skill takes you from zero to a fully integrated canvas game: spec, React component, play page, and Supabase entry. Follow the phases in order. **Never skip Phase 1** — even if you feel you know enough to start coding, the spec is what drives a clean implementation here.

---

## Phase 0 — Orient yourself

Before anything else, run these two checks:

1. **Is there already an approved spec for this game?**
   List `specs/` and look for a file matching the game's name or slug. If one exists, read it and check its state field.
   - State is `Approved` → skip Phase 1, go straight to Phase 2.
   - State is `Draft` → tell the user the spec is still a Draft and ask them to approve it first.
   - No spec exists → continue to Phase 1.

2. **Is there a reference game in `references/started-games/`?**
   Run `ls references/started-games/` to check. If a matching directory exists (e.g. `03-tetris/`, `04-arkanoid/`), note its path — you will read it in Phase 1 and again in Phase 2.

---

## Phase 1 — Create the spec (delegates to `/spec`)

The game needs a spec before any code is written. You will **invoke the `spec` skill** with a rich seed description so that its Phase 2 questions start from a solid base.

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

**Stop after the spec is saved.** Tell the user: "El spec está guardado como Draft. Revisalo, cambia el estado a `Approved` y luego vuelve a invocar `/game-integration [slug]` para implementar."

---

## Phase 2 — Read and map the reference game

> Only relevant when the game comes from `references/started-games/`. If the game is written from scratch, skip to Phase 3 and implement the logic directly.

Read `references/started-games/XX-slug/game.js` in full. Build a mental map of:

- **Classes**: names, constructor params, key properties (`x, y, vx, vy, dead`, etc.)
- **Game state variables**: what tracks score, lives, level, game state string
- **Game loop**: how `requestAnimationFrame` / `setInterval` is set up, what `dt` looks like
- **Input handling**: which keys are read and how
- **Score events**: what actions give points, and how many
- **Level progression**: what clears a level and spawns the next one
- **Game over condition**: what sets state to gameover, how lives decrement
- **Special mechanics**: power-ups, combos, speed increases, etc.

You will use this map to port the logic faithfully into the TypeScript component in Phase 3.

---

## Phase 3 — Create `src/components/games/[Name]Game.tsx`

Create a Client Component that encapsulates the entire game inside a fixed 800×600 canvas. The file lives at:

```
src/components/games/[Name]Game.tsx
```

where `[Name]` is PascalCase (e.g. `TetrisGame`, `ArkanoidGame`).

Read `references/component-pattern.md` (in the same directory as this skill) for the exact TypeScript skeleton. Key invariants to preserve:

### Callbacks interface

```ts
export interface [Name]Callbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange:  (level: number) => void;
  onGameOver:     (finalScore: number) => void;
}

interface Props extends [Name]Callbacks {
  paused: boolean;
  restartKey?: number; // increment to restart
}
```

### State lives in refs, not useState

Every game variable (`shipRef`, `scoreRef`, `livesRef`, etc.) is a `useRef`. `useState` inside a 60fps loop causes massive re-renders. The only thing that triggers a parent re-render is calling a callback, and you call it only when the value **changes** (tracked via `prevScoreRef` / `prevLivesRef` / `prevLevelRef`).

### pausedRef prevents stale closures

```ts
useEffect(() => {
  pausedRef.current = paused;
}, [paused]);
```

The loop reads `pausedRef.current`, not the prop directly.

### gameOverFiredRef fires onGameOver exactly once

When `stateRef.current === 'gameover'`, fire `onGameOver(score)` once, then stop the `requestAnimationFrame` loop. Guard with `if (!gameOverFiredRef.current) { gameOverFiredRef.current = true; onGameOver(score); return; }`.

### Main useEffect depends on restartKey

```ts
useEffect(() => {
  // init + loop
  return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener(...); };
}, [restartKey]); // re-runs on restart
```

Reset `gameOverFiredRef.current = false` and all prevRef values at the top of this effect.

### Keyboard input

```ts
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
```

Call `e.preventDefault()` for the keys the game uses (arrows, space, etc.) so they don't scroll the page or trigger UI buttons.

### Canvas return

```tsx
return (
  <canvas
    ref={canvasRef}
    width={800}
    height={600}
    style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
  />
);
```

---

## Phase 4 — Create `app/games/[slug]/play/page.tsx`

Next.js App Router gives a static segment priority over the `[id]` catch-all, so the real game page lives at:

```
app/games/[slug]/play/page.tsx
```

Model it on `app/games/rocas/play/page.tsx`. The structure is:

```tsx
"use client";
// imports: useState, useCallback, useRef, useRouter, useSession, saveScore, [Name]Game

export default function [Slug]PlayPage() {
  const router = useRouter();
  const { user } = useSession();

  const [score, setScore]       = useState(0);
  const [lives, setLives]       = useState(3);   // adjust initial lives to match the game
  const [level, setLevel]       = useState(1);
  const [paused, setPaused]     = useState(false);
  const [over, setOver]         = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName]         = useState(user?.name ?? "INVITADO");
  const [saved, setSaved]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const scoreRef = useRef(0);  // ref so handleFin reads the latest value without stale closure

  // callbacks wired to the game component
  const handleScoreChange = useCallback((s: number) => { scoreRef.current = s; setScore(s); }, []);
  const handleLivesChange = useCallback((l: number) => setLives(l), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleGameOver    = useCallback((s: number) => { setFinalScore(s); setOver(true); }, []);

  // FIN button: ends the game manually with the current score
  const handleFin = () => { setFinalScore(scoreRef.current); setOver(true); };

  // restart resets all state and increments restartKey to force-remount the game
  const restart = () => {
    setScore(0); setLives(3); setLevel(1);
    setPaused(false); setOver(false); setSaved(false); setFinalScore(0);
    scoreRef.current = 0;
    setRestartKey((k) => k + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await saveScore("[slug]", name, finalScore); setSaved(true); }
    finally { setSaving(false); }
  };

  return (
    <div className="av-player fade-in">
      {/* HUD */}
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat"><div className="l">Jugador</div><div className="v" style={{ color: "var(--ink)" }}>{name}</div></div>
          <div className="hud-stat"><div className="l">Puntuación</div><div className="v">{score.toLocaleString("es-ES")}</div></div>
          <div className="hud-stat lives"><div className="l">Vidas</div><div className="v">{"♥ ".repeat(Math.max(lives, 0)).trim() || "—"}</div></div>
          <div className="hud-stat level"><div className="l">Nivel</div><div className="v">{String(level).padStart(2, "0")}</div></div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)} disabled={over}>{paused ? "REANUDAR" : "PAUSA"}</button>
          <button className="btn magenta" onClick={handleFin} disabled={over}>FIN</button>
          <button className="btn ghost" onClick={() => router.push("/games/[slug]")}>SALIR</button>
        </div>
      </div>

      {/* CRT screen */}
      <div className="crt">
        <div className="crt-screen">
          {!over && <[Name]Game paused={paused} restartKey={restartKey} onScoreChange={handleScoreChange} onLivesChange={handleLivesChange} onLevelChange={handleLevelChange} onGameOver={handleGameOver} />}
          {paused && !over && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}>PULSA REANUDAR PARA CONTINUAR</div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>[TITLE] · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {/* Game over modal */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{finalScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input value={name} onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))} placeholder="TUS INICIALES" />
                <button className="btn yellow" onClick={handleSave} disabled={saving}>{saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}</button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>JUGAR DE NUEVO</button>
              <button className="btn magenta" onClick={() => router.push("/")}>VOLVER AL VAULT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Replace all `[slug]`, `[Name]`, and `[TITLE]` placeholders with the actual values from the spec.

---

## Phase 5 — Register the game in Supabase

The `games` table already exists with RLS enabled. Insert the new game row using `mcp__supabase__execute_sql`. The actual column schema is:

```
id      text  primary key   -- URL slug (e.g. "tetris")
title   text                -- Display name (e.g. "Tetris")
short   text                -- One-line description for the games list
long    text                -- Paragraph description for the detail page
cat     text                -- "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS"
cover   text                -- Image path (e.g. "/img/tetris.png") or empty string
color   text                -- "cyan" | "magenta" | "green" | "yellow"
best    integer             -- All-time best score (start at 0)
plays   text                -- Play count display string (start at "0")
```

```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'slug',
  'Title',
  'Short one-line description.',
  'Longer description paragraph for the game detail page.',
  'ARCADE',
  '',
  'cyan',
  0,
  '0'
)
ON CONFLICT (id) DO NOTHING;
```

Use the values from the approved spec. The `scores` table already exists — no changes needed.

---

## Phase 6 — Verify

1. Run `npm run build` — it must pass with zero TypeScript errors.
2. Navigate to `/games/[slug]/play` — the canvas loads and the game responds to input.
3. Confirm that the DOM HUD (Puntuación / Vidas / Nivel) updates in real time during play.
4. Let the game end naturally or press FIN — the modal should appear with the correct final score.
5. Enter a name and click GUARDAR PUNTUACIÓN — confirm the row appears in the `scores` table in Supabase.
6. Navigate to `/leaderboard` — the new game's scores should appear.
7. Navigate to `/games/[slug]` — the Top 5 section should show.

---

## Key invariants to keep across all games

- **Never `useState` for game loop variables** — only `useRef`. State updates re-render React; refs don't.
- **The play page is a Client Component; the game component is also a Client Component.** Both have `"use client"` at the top.
- **saveScore is imported from `@/lib/supabase/queries-client`** (browser client). Never import it from the server queries file.
- **The canvas CSS (`width: 100%, height: 100%, objectFit: contain`)** scales the fixed 800×600 canvas to fit any container without breaking internal collision math.
- **Route priority**: `app/games/rocas/play` wins over `app/games/[id]/play` because static segments take priority. The generic `[id]/play` placeholder must remain untouched.
