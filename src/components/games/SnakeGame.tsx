"use client";

import { useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  paused?: boolean;
  restartKey?: number;
  onGameOver: (score: number, metadata: { fruitsEaten: number; maxLength: number }) => void;
  onScoreChange?: (score: number) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COLS = 20;
const ROWS = 20;
const CELL = 24;
const W = COLS * CELL; // 480
const H = ROWS * CELL; // 480

const INITIAL_SPEED = 150; // ms per tick
const MIN_SPEED = 60;
const SPEED_STEP = 5; // ms faster per 5 pts

// Fruit atlas — extracted from public/games/snake-assets/sprites.js
// { x, y, w, h } in fruits.png (3790×442, row at y=136–295)
const FRUITS: { key: string; x: number; y: number; w: number; h: number; points: number }[] = [
  { key: "banana", x: 34, y: 136, w: 110, h: 160, points: 1 },
  { key: "orange", x: 186, y: 136, w: 150, h: 160, points: 1 },
  { key: "watermelon", x: 1734, y: 136, w: 150, h: 160, points: 1 },
  { key: "melon", x: 3637, y: 136, w: 130, h: 160, points: 1 },
  { key: "apple", x: 2786, y: 136, w: 110, h: 160, points: 1 },
  { key: "grape", x: 378, y: 136, w: 110, h: 160, points: 2 },
  { key: "strawberry", x: 894, y: 136, w: 110, h: 160, points: 2 },
  { key: "cherry", x: 1066, y: 136, w: 110, h: 160, points: 2 },
  { key: "peach", x: 2432, y: 136, w: 130, h: 160, points: 2 },
  { key: "berries", x: 3110, y: 136, w: 150, h: 160, points: 2 },
  { key: "grapes2", x: 3302, y: 136, w: 110, h: 160, points: 2 },
  { key: "garlic", x: 540, y: 136, w: 130, h: 160, points: 3 },
  { key: "carrot", x: 1228, y: 136, w: 130, h: 160, points: 3 },
  { key: "broccoli", x: 1582, y: 136, w: 110, h: 160, points: 3 },
  { key: "tomato", x: 2948, y: 136, w: 130, h: 160, points: 3 },
  { key: "pepper", x: 1906, y: 136, w: 150, h: 160, points: 3 },
  { key: "eggplant", x: 712, y: 136, w: 130, h: 160, points: 4 },
  { key: "mushroom", x: 1400, y: 136, w: 130, h: 160, points: 4 },
  { key: "kiwi", x: 2068, y: 136, w: 170, h: 160, points: 4 },
  { key: "lemon", x: 2250, y: 136, w: 140, h: 160, points: 4 },
  { key: "pineapple", x: 3454, y: 136, w: 150, h: 160, points: 4 },
  { key: "peanut", x: 2604, y: 136, w: 130, h: 160, points: 5 },
];

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
interface Seg {
  col: number;
  row: number;
}
interface Fruit {
  col: number;
  row: number;
  idx: number;
}

const SNAKE_HEAD = "#22c55e";
const SNAKE_BODY = "#16a34a";
const SNAKE_OUTLINE = "#14532d";
const BG = "#06060e";
const GRID_LINE = "rgba(255,255,255,0.06)";

// ── Component ──────────────────────────────────────────────────────────────────

export default function SnakeGame({
  paused = false,
  restartKey = 0,
  onGameOver,
  onScoreChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onGameOverRef = useRef(onGameOver);
  const onScoreChangeRef = useRef(onScoreChange);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // ── Lifecycle guard (React Strict Mode runs effects twice) ────────────────
    const guard = { active: true };

    // ── Image load ────────────────────────────────────────────────────────────
    const img = new Image();
    img.src = "/games/snake-assets/fruits.png";

    // ── Mutable game state ────────────────────────────────────────────────────
    let snake: Seg[];
    let dir: Direction;
    let nextDir: Direction;
    let fruit: Fruit;
    let score: number;
    let fruitsEaten: number;
    let maxLength: number;
    let speed: number;
    let gameOver: boolean;
    let gameOverFired: boolean;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function randomFruitIdx(): number {
      return Math.floor(Math.random() * FRUITS.length);
    }

    function spawnFruit(): Fruit {
      const occupied = new Set(snake.map((s) => `${s.col},${s.row}`));
      let col: number, row: number;
      do {
        col = Math.floor(Math.random() * COLS);
        row = Math.floor(Math.random() * ROWS);
      } while (occupied.has(`${col},${row}`));
      return { col, row, idx: randomFruitIdx() };
    }

    function initState() {
      const midCol = Math.floor(COLS / 2);
      const midRow = Math.floor(ROWS / 2);
      snake = [
        { col: midCol, row: midRow },
        { col: midCol - 1, row: midRow },
        { col: midCol - 2, row: midRow },
      ];
      dir = "RIGHT";
      nextDir = "RIGHT";
      score = 0;
      fruitsEaten = 0;
      maxLength = snake.length;
      speed = INITIAL_SPEED;
      gameOver = false;
      gameOverFired = false;
      fruit = spawnFruit();
      onScoreChangeRef.current?.(0);
    }

    function computeSpeed(pts: number): number {
      const steps = Math.floor(pts / 5);
      return Math.max(MIN_SPEED, INITIAL_SPEED - steps * SPEED_STEP);
    }

    // ── Drawing ───────────────────────────────────────────────────────────────

    function drawGrid() {
      ctx.strokeStyle = GRID_LINE;
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * CELL, 0);
        ctx.lineTo(c * CELL, H);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * CELL);
        ctx.lineTo(W, r * CELL);
        ctx.stroke();
      }
    }

    function drawRoundedRect(
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill: string,
      stroke: string
    ) {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function drawSnake() {
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const pad = i === 0 ? 2 : 3;
        const color = i === 0 ? SNAKE_HEAD : SNAKE_BODY;
        drawRoundedRect(
          seg.col * CELL + pad,
          seg.row * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2,
          4,
          color,
          SNAKE_OUTLINE
        );
        // Eyes on head
        if (i === 0) {
          const cx = seg.col * CELL + CELL / 2;
          const cy = seg.row * CELL + CELL / 2;
          const eyeOffset = 4;
          const eyeSize = 2.5;
          ctx.fillStyle = "#fff";
          let ex1 = cx,
            ey1 = cy,
            ex2 = cx,
            ey2 = cy;
          if (dir === "RIGHT") {
            ex1 = cx + 2;
            ey1 = cy - eyeOffset;
            ex2 = cx + 2;
            ey2 = cy + eyeOffset;
          }
          if (dir === "LEFT") {
            ex1 = cx - 2;
            ey1 = cy - eyeOffset;
            ex2 = cx - 2;
            ey2 = cy + eyeOffset;
          }
          if (dir === "UP") {
            ex1 = cx - eyeOffset;
            ey1 = cy - 2;
            ex2 = cx + eyeOffset;
            ey2 = cy - 2;
          }
          if (dir === "DOWN") {
            ex1 = cx - eyeOffset;
            ey1 = cy + 2;
            ex2 = cx + eyeOffset;
            ey2 = cy + 2;
          }
          ctx.beginPath();
          ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawFruit() {
      const f = FRUITS[fruit.idx];
      const px = fruit.col * CELL + 1;
      const py = fruit.row * CELL + 1;
      const size = CELL - 2;
      if (img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, f.x, f.y, f.w, f.h, px, py, size, size);
      } else {
        // Fallback circle while image loads
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(
          fruit.col * CELL + CELL / 2,
          fruit.row * CELL + CELL / 2,
          CELL / 2 - 3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    function drawPointsBadge() {
      const f = FRUITS[fruit.idx];
      const label = `+${f.points}`;
      const bx = fruit.col * CELL + CELL;
      const by = fruit.row * CELL;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "#fbbf24";
      ctx.fillText(label, Math.min(bx, W - 18), Math.max(by, 10));
    }

    function render() {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      drawGrid();
      drawFruit();
      drawPointsBadge();
      drawSnake();
    }

    // ── Tick ──────────────────────────────────────────────────────────────────

    function tick() {
      if (pausedRef.current || gameOver) return;

      dir = nextDir;
      const head = snake[0];
      let nc = head.col;
      let nr = head.row;

      if (dir === "UP") nr--;
      if (dir === "DOWN") nr++;
      if (dir === "LEFT") nc--;
      if (dir === "RIGHT") nc++;

      // Wall collision
      if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) {
        endGame();
        return;
      }
      // Self collision (skip tail since it will move)
      for (let i = 0; i < snake.length - 1; i++) {
        if (snake[i].col === nc && snake[i].row === nr) {
          endGame();
          return;
        }
      }

      const newHead: Seg = { col: nc, row: nr };
      const ate = nc === fruit.col && nr === fruit.row;

      if (ate) {
        snake = [newHead, ...snake];
        score += FRUITS[fruit.idx].points;
        fruitsEaten++;
        if (snake.length > maxLength) maxLength = snake.length;
        onScoreChangeRef.current?.(score);

        const newSpeed = computeSpeed(score);
        if (newSpeed !== speed) {
          speed = newSpeed;
          restartInterval();
        }

        fruit = spawnFruit();
      } else {
        snake = [newHead, ...snake.slice(0, -1)];
      }

      render();
    }

    function restartInterval() {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = setInterval(tick, speed);
    }

    function endGame() {
      gameOver = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      render();
      if (!gameOverFired && guard.active) {
        gameOverFired = true;
        ctx.fillStyle = "rgba(239,68,68,0.25)";
        ctx.fillRect(0, 0, W, H);
        onGameOverRef.current?.(score, { fruitsEaten, maxLength });
      }
    }

    // ── Key handling ──────────────────────────────────────────────────────────

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      if (gameOver) return;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (dir !== "DOWN") nextDir = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (dir !== "UP") nextDir = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (dir !== "RIGHT") nextDir = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (dir !== "LEFT") nextDir = "RIGHT";
          break;
      }
    };

    // ── Boot ──────────────────────────────────────────────────────────────────

    function start() {
      if (!guard.active) return;
      initState();
      render();
      restartInterval();
      window.addEventListener("keydown", handleKeyDown);
    }

    if (img.complete && img.naturalWidth > 0) {
      start();
    } else {
      img.onload = start;
      img.onerror = start; // start anyway with fallback
    }

    return () => {
      guard.active = false;
      if (intervalId !== null) clearInterval(intervalId);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [restartKey]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {/* Controls guide */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: "rgba(0,0,0,0.78)",
          padding: "8px 10px",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.1)",
          fontFamily: "var(--pixel)",
          fontSize: 8,
          color: "rgba(255,255,255,0.4)",
          lineHeight: 1.9,
          letterSpacing: "0.08em",
          pointerEvents: "none",
        }}
      >
        {(
          [
            ["↑ / W", "ARRIBA"],
            ["↓ / S", "ABAJO"],
            ["← / A", "IZQUIERDA"],
            ["→ / D", "DERECHA"],
          ] as const
        ).map(([key, action]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span style={{ color: "rgba(34,197,94,0.8)" }}>{key}</span>
            <span>{action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
