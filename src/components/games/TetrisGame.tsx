"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { TouchControls } from "./TouchControls";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TetrisCallbacks {
  onScoreChange: (score: number) => void;
  onLinesChange: (lines: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number, lines: number, level: number) => void;
}

interface Props extends TetrisCallbacks {
  paused: boolean;
  restartKey?: number;
  forceTouch?: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 30;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // bonus piece
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [2, 2],
    [2, 2],
  ],
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ],
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ],
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ],
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ],
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ],
];

const LINE_SCORES = [0, 100, 300, 500, 800];

// ── Component ──────────────────────────────────────────────────────────────────

export default function TetrisGame({
  paused,
  restartKey = 0,
  forceTouch = false,
  onScoreChange,
  onLinesChange,
  onLevelChange,
  onGameOver,
}: Props) {
  const boardRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const touchActionsRef = useRef<{
    moveLeft: () => void;
    moveRight: () => void;
    softDrop: () => void;
    rotate: () => void;
  } | null>(null);
  const isTouch = useTouchDevice();
  const showControls = isTouch || forceTouch;
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("game-touch-area") ?? document.body);
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const boardCanvas = boardRef.current;
    const nextCanvas = nextRef.current;
    if (!boardCanvas || !nextCanvas) return;

    const ctx = boardCanvas.getContext("2d")!;
    const nextCtx = nextCanvas.getContext("2d")!;

    type Piece = { type: number; shape: number[][]; x: number; y: number };

    let board: number[][];
    let current: Piece;
    let next: Piece;
    let score = 0;
    let lines = 0;
    let level = 1;
    let gameOver = false;
    let gameOverFired = false;
    let lastTime = 0;
    let dropAccum = 0;
    let dropInterval = 1000;
    let animId = 0;

    function createBoard() {
      return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
    }

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = (PIECES[type] as number[][]).map((row) => [...row]);
      return {
        type,
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
      };
    }

    function collide(shape: number[][], ox: number, oy: number): boolean {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]): number[][] {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c]) board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] ?? 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
        onScoreChange(score);
        onLinesChange(lines);
        onLevelChange(level);
      }
    }

    function ghostY(): number {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
      onScoreChange(score);
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
        onScoreChange(score);
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        endGame();
      }
      drawNext();
    }

    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha = 1
    ) {
      if (!colorIndex) return;
      const color = COLORS[colorIndex] as string;
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * BLOCK, 0);
        ctx.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * BLOCK);
        ctx.lineTo(COLS * BLOCK, r * BLOCK);
        ctx.stroke();
      }
    }

    function draw() {
      // Distinct background so the board stands out from the CRT container
      ctx.fillStyle = "#06060e";
      ctx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);
      drawGrid();

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
    }

    function drawNext() {
      nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
    }

    function endGame() {
      gameOver = true;
      cancelAnimationFrame(animId);
      if (!gameOverFired) {
        gameOverFired = true;
        onGameOver(score, lines, level);
      }
    }

    function loop(ts: number) {
      if (gameOver) return;

      const dt = ts - lastTime;
      lastTime = ts;

      if (!pausedRef.current) {
        dropAccum += dt;
        if (dropAccum >= dropInterval) {
          dropAccum = 0;
          if (!collide(current.shape, current.x, current.y + 1)) {
            current.y++;
          } else {
            lockPiece();
          }
        }
      }

      if (gameOver) return;
      draw();
      animId = requestAnimationFrame(loop);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent arrow keys and space from scrolling the page
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (pausedRef.current || gameOver) return;
      switch (e.code) {
        case "ArrowLeft":
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case "ArrowRight":
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case "ArrowDown":
          softDrop();
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate();
          break;
        case "Space":
          hardDrop();
          break;
      }
    };

    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    gameOver = false;
    gameOverFired = false;
    dropInterval = 1000;
    dropAccum = 0;
    next = randomPiece();
    spawn();
    onScoreChange(0);
    onLinesChange(0);
    onLevelChange(1);
    lastTime = performance.now();
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);

    touchActionsRef.current = {
      moveLeft: () => {
        if (!pausedRef.current && !gameOver && !collide(current.shape, current.x - 1, current.y))
          current.x--;
      },
      moveRight: () => {
        if (!pausedRef.current && !gameOver && !collide(current.shape, current.x + 1, current.y))
          current.x++;
      },
      softDrop: () => {
        if (!pausedRef.current && !gameOver) softDrop();
      },
      rotate: () => {
        if (!pausedRef.current && !gameOver) tryRotate();
      },
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKeyDown);
      touchActionsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  return (
    <>
      {/* Board fills the CRT screen via .crt-screen canvas CSS rule */}
      <canvas ref={boardRef} width={COLS * BLOCK} height={ROWS * BLOCK} />
      {/* Next-piece overlay in the top-right corner; inline position overrides the CSS rule */}
      <div
        className="crt-content"
        style={{
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: 12,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {/* Next piece panel */}
          <div
            style={{
              background: "rgba(0,0,0,0.78)",
              padding: 8,
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 9,
                letterSpacing: "0.15em",
                marginBottom: 4,
                fontFamily: "var(--pixel)",
              }}
            >
              SIGUIENTE
            </div>
            <canvas
              ref={nextRef}
              width={120}
              height={120}
              style={{
                display: "block",
                position: "relative",
                top: "auto",
                right: "auto",
                bottom: "auto",
                left: "auto",
                width: 120,
                height: 120,
              }}
            />
          </div>

          {/* Controls guide */}
          <div
            style={{
              background: "rgba(0,0,0,0.78)",
              padding: "8px 10px",
              borderRadius: 4,
              border: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "var(--pixel)",
              fontSize: 8,
              color: "rgba(255,255,255,0.4)",
              lineHeight: 1.9,
              letterSpacing: "0.08em",
              minWidth: 120,
            }}
          >
            {[
              ["← →", "MOVER"],
              ["↑ / X", "ROTAR"],
              ["↓", "BAJAR"],
              ["SPC", "CAIDA"],
              ["P", "PAUSA"],
            ].map(([key, action]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ color: "rgba(0,245,255,0.7)" }}>{key}</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {portalTarget &&
        createPortal(
          <div className="flex items-center justify-center w-full h-full">
            <TouchControls
              visible={showControls}
              layout="dpad"
              onDirection={(dir) => {
                if (dir === "left") touchActionsRef.current?.moveLeft();
                else if (dir === "right") touchActionsRef.current?.moveRight();
                else if (dir === "up") touchActionsRef.current?.rotate();
                else if (dir === "down") touchActionsRef.current?.softDrop();
              }}
            />
          </div>,
          portalTarget
        )}
    </>
  );
}
