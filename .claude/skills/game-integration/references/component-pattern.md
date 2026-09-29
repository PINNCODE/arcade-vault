# Canvas Game Component — TypeScript Skeleton

This is the exact structural pattern used by `AsteroidsGame.tsx`. Copy it when creating a new game component and fill in the game-specific logic.

```tsx
"use client";

import { useEffect, useRef } from "react";

// ── Callbacks interface exported so the play page can type its props ──────────

export interface [Name]Callbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface Props extends [Name]Callbacks {
  paused: boolean;
  restartKey?: number; // parent increments to force a full restart
}

// ── Canvas dimensions (fixed; CSS scales visually) ────────────────────────────

const W = 800;
const H = 600;

// ── Utility functions (pure, no React deps) ───────────────────────────────────

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const rand  = (min: number, max: number) => min + Math.random() * (max - min);

// ── Game classes (internal, not exported) ─────────────────────────────────────
// Port the classes from game.js here. Each class needs:
//   - constructor that sets up initial state
//   - update(dt: number) that advances physics
//   - draw(ctx: CanvasRenderingContext2D) that renders to canvas
//   - dead: boolean flag used to filter the object out of its array
//
// Example skeleton:
class GameEntity {
  x: number; y: number;
  vx: number; vy: number;
  dead: boolean;
  constructor(x: number, y: number) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.dead = false;
  }
  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }
  draw(_ctx: CanvasRenderingContext2D) { /* render */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function [Name]Game({
  paused,
  restartKey = 0,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync paused prop into a ref so the loop never reads a stale closure value
  const pausedRef = useRef(paused);
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  // ── Game state refs (NEVER useState for loop variables) ────────────────────
  // Each piece of game state lives in a ref. Mutating a ref is synchronous and
  // does NOT trigger a React re-render — exactly what you want at 60 fps.
  const scoreRef  = useRef(0);
  const livesRef  = useRef(3);  // adjust initial value to match the game
  const levelRef  = useRef(1);
  const stateRef  = useRef<"playing" | "gameover">("playing");
  const rafRef    = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  // Prevents onGameOver from firing more than once per game session
  const gameOverFiredRef = useRef(false);

  // Track previous values — callbacks fire only when the value actually changes,
  // avoiding flooding the parent with re-renders on every frame
  const prevScoreRef = useRef(0);
  const prevLivesRef = useRef(3);
  const prevLevelRef = useRef(1);

  // Add refs for all other game objects (entities, particles, etc.)
  // const entitiesRef = useRef<GameEntity[]>([]);

  // ── Input ──────────────────────────────────────────────────────────────────
  const keysRef = useRef<Record<string, boolean>>({});
  // For one-shot actions (e.g. fire): track "just pressed" separately
  const justPressedRef = useRef<Record<string, boolean>>({});
  const pressed = (code: string) => {
    const val = justPressedRef.current[code];
    justPressedRef.current[code] = false;
    return val;
  };

  // ── Main effect: init + game loop ──────────────────────────────────────────
  // Depends on restartKey: re-runs (and therefore re-inits the game) every time
  // the parent increments restartKey.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset guard flags each time the effect runs (i.e. on each restart)
    gameOverFiredRef.current = false;
    prevScoreRef.current     = 0;
    prevLivesRef.current     = 3;
    prevLevelRef.current     = 1;

    // ── Game initialisation ─────────────────────────────────────────────────
    function initGame() {
      scoreRef.current = 0;
      livesRef.current = 3;
      levelRef.current = 1;
      stateRef.current = "playing";
      // Spawn initial entities here
    }

    // ── Update (physics, collision, state transitions) ──────────────────────
    function update(dt: number) {
      if (stateRef.current === "gameover") return;

      // 1. Read input
      // 2. Move entities
      // 3. Detect collisions → update scoreRef / livesRef
      // 4. Check level-clear condition → levelRef.current++
      // 5. Check game-over condition → stateRef.current = "gameover"
    }

    // ── Draw (clear → entities → HUD → overlay) ─────────────────────────────
    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);

      // Draw entities here

      // HUD: score top-left, level top-center, lives top-right
      ctx.fillStyle = "#fff";
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE  ${scoreRef.current}`, 14, 26);
      ctx.textAlign = "center";
      ctx.fillText(`NIVEL ${levelRef.current}`, W / 2, 26);
      // Lives icons top-right

      if (stateRef.current === "gameover") {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 46px monospace";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 18);
        ctx.font = "18px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText(`PUNTAJE: ${scoreRef.current}`, W / 2, H / 2 + 22);
      }
    }

    // ── Loop ───────────────────────────────────────────────────────────────
    function loop(ts: number) {
      // dt capped at 50ms to avoid physics explosions after tab switch
      const dt = lastTimeRef.current === null
        ? 0
        : Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      if (!pausedRef.current) update(dt);
      draw();

      // Fire callbacks only when values change — never on every frame
      if (scoreRef.current !== prevScoreRef.current) {
        prevScoreRef.current = scoreRef.current;
        onScoreChange(scoreRef.current);
      }
      if (livesRef.current !== prevLivesRef.current) {
        prevLivesRef.current = livesRef.current;
        onLivesChange(livesRef.current);
      }
      if (levelRef.current !== prevLevelRef.current) {
        prevLevelRef.current = levelRef.current;
        onLevelChange(levelRef.current);
      }

      // Game over: fire callback once, then stop the loop
      if (stateRef.current === "gameover" && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        onGameOver(scoreRef.current);
        return; // do NOT call requestAnimationFrame again
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // ── Keyboard listeners ─────────────────────────────────────────────────
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent game keys from scrolling the page or activating UI buttons
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code))
        e.preventDefault();
      if (!keysRef.current[e.code]) justPressedRef.current[e.code] = true;
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    initGame();
    rafRef.current = requestAnimationFrame(loop);

    // Cleanup: cancel the loop and remove listeners when the component unmounts
    // or when restartKey changes (which re-runs this effect)
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      lastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]); // callbacks are stable (useCallback in parent), so omitting them is safe

  // Canvas: fixed internal resolution, CSS scales it to fill the container
  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
```

## Common porting mistakes

| Mistake                                             | Fix                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `setState` inside the loop                          | Use `ref.current =` instead; only call the parent callback when the value changes     |
| Reading `paused` directly in the loop               | Always read `pausedRef.current` — the prop value is a stale closure inside the effect |
| Forgetting to reset `gameOverFiredRef` on restart   | Reset it at the top of the `useEffect` body                                           |
| `keydown` handler causes buttons to fire            | `e.preventDefault()` for arrow keys and Space                                         |
| The game keeps running after the component unmounts | Make sure `cancelAnimationFrame` is in the cleanup return                             |
| `onGameOver` fires every frame once game is over    | Guard with `gameOverFiredRef.current`; return after firing to stop the RAF            |
