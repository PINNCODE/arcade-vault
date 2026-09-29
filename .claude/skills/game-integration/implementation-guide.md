# Game Integration — Implementation Guide

> This guide is used by `/spec-impl` when implementing an approved game spec.
> Read it at the start of implementation before writing any code.

---

## Phase 2 — Read and map the reference game

> Only relevant when the game comes from `references/started-games/`. If the game is written from scratch, skip to Phase 3.

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

When `stateRef.current === 'gameover'`, fire `onGameOver(score)` once, then stop the loop:

```ts
if (!gameOverFiredRef.current) {
  gameOverFiredRef.current = true;
  onGameOver(score);
  return; // stop requestAnimationFrame
}
```

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

Next.js App Router gives static segments priority over `[id]` catch-alls, so:

```
app/games/[slug]/play/page.tsx
```

Model it on `app/games/rocas/play/page.tsx`. Key structure:

```tsx
"use client";
// imports: useState, useCallback, useRef, useRouter, useSession, saveScore, [Name]Game

export default function [Slug]PlayPage() {
  const router = useRouter();
  const { user } = useSession();

  const [score, setScore]           = useState(0);
  const [lives, setLives]           = useState(3);   // adjust to match the game
  const [level, setLevel]           = useState(1);
  const [paused, setPaused]         = useState(false);
  const [over, setOver]             = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName]             = useState(user ? user.name : "INVITADO");
  const [saved, setSaved]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const scoreRef = useRef(0);

  const handleScoreChange = useCallback((s: number) => { scoreRef.current = s; setScore(s); }, []);
  const handleLivesChange = useCallback((l: number) => setLives(l), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleGameOver    = useCallback((s: number) => { setFinalScore(s); setOver(true); }, []);

  const handleFin = () => { setFinalScore(scoreRef.current); setOver(true); };

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

Replace all `[slug]`, `[Name]`, and `[TITLE]` placeholders with values from the approved spec.

---

## Phase 5 — Register the game in Supabase

Insert via `mcp__supabase__execute_sql`:

```sql
INSERT INTO games (id, title, short, long, cat, cover, color, best, plays)
VALUES (
  'slug',
  'Title',
  'Short one-line description.',
  'Longer paragraph for the detail page.',
  'ARCADE',
  '',
  'cyan',
  0,
  '0'
)
ON CONFLICT (id) DO NOTHING;
```

Column reference:

- `id` — URL slug (e.g. `"tetris"`)
- `cat` — `"ARCADE"` | `"PUZZLE"` | `"SHOOTER"` | `"VERSUS"`
- `color` — `"cyan"` | `"magenta"` | `"green"` | `"yellow"`
- `cover` — image path or empty string
- `best` / `plays` — start at `0` / `"0"`

The `scores` table already exists — no changes needed.

---

## Phase 6 — Verify

1. Run `npm run build` — must pass with zero TypeScript errors.
2. Navigate to `/games/[slug]/play` — canvas loads and responds to input.
3. Confirm the DOM HUD (Puntuación / Vidas / Nivel) updates in real time.
4. Let the game end or press FIN — modal appears with the correct final score.
5. Enter a name and click GUARDAR PUNTUACIÓN — row appears in Supabase `scores` table.
6. Navigate to `/leaderboard` — new game's scores appear.
7. Navigate to `/games/[slug]` — Top 5 section shows.

---

## Key invariants

- **Never `useState` for game loop variables** — only `useRef`.
- **Both the play page and the game component are Client Components** — `"use client"` at the top of each.
- **`saveScore` is imported from `@/lib/supabase/queries-client`** (browser client). Never from the server queries file.
- **Canvas CSS `width: 100%, height: 100%, objectFit: contain`** scales the fixed 800×600 canvas without breaking collision math.
- **Route priority**: static segments (`app/games/rocas/play`) beat `[id]` catch-alls. Never touch `app/games/[id]/play/page.tsx`.
