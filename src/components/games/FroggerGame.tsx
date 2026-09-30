"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { TouchControls } from "./TouchControls";

// ── Props ─────────────────────────────────────────────────────────────────────

interface FroggerGameProps {
  paused: boolean;
  forceTouch?: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
// ROW_SAFE_MID = 7 (implicit)
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const JUMP_DURATION = 120; // ms
const ROUND_TIME_BASE = 15000; // ms
const TURTLE_VISIBLE_DURATION = 3000;
const TURTLE_SUBMERGE_DURATION = 1500;

// Goal mouth positions: cols 1,4,7,10,13 (center of each 2-col mouth)
// Each mouth occupies 2 columns: [1-2], [4-5], [7-8], [10-11], [13-14]
const GOAL_MOUTHS = [
  { startCol: 1, endCol: 2 },
  { startCol: 4, endCol: 5 },
  { startCol: 7, endCol: 8 },
  { startCol: 10, endCol: 11 },
  { startCol: 13, endCol: 14 },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityType = "car" | "truck" | "log" | "turtle";

interface Entity {
  col: number; // fractional column position
  width: number; // in cells
  type: EntityType;
  color?: string;
  submerged?: boolean;
  turtleTimer?: number; // ms into current phase
  turtlePhase?: "visible" | "submerging"; // current turtle phase
}

interface Lane {
  row: number;
  speed: number; // cells per second
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
  fromCol: number;
  fromRow: number;
}

interface GameState {
  frog: Frog;
  lanes: Lane[];
  score: number;
  lives: number;
  level: number;
  over: boolean;
  goalsOccupied: boolean[];
  roundTimeMs: number;
  roundTimerMs: number;
  pendingDir: "up" | "down" | "left" | "right" | null;
  prevScore: number;
  prevLives: number;
  prevLevel: number;
  visitedRows: Set<number>; // rows visited this life for scoring
}

// ── Lane builder ──────────────────────────────────────────────────────────────

const ROAD_COLORS = ["#e74c3c", "#e67e22", "#3498db", "#9b59b6", "#1abc9c"];
const LOG_COLOR = "#8B4513";

function buildLanes(level: number): Lane[] {
  const speedMul = Math.pow(1.15, level - 1);
  const lanes: Lane[] = [];

  // Road lanes (rows 8–12), bottom to top
  const roadConfigs: {
    row: number;
    speed: number;
    dir: 1 | -1;
    entities: { width: number; type: EntityType; color: string }[];
  }[] = [
    {
      row: 12,
      speed: 2.0 * speedMul,
      dir: 1,
      entities: [
        { width: 1, type: "car", color: ROAD_COLORS[0] },
        { width: 1, type: "car", color: ROAD_COLORS[1] },
        { width: 2, type: "truck", color: "#7f8c8d" },
        { width: 1, type: "car", color: ROAD_COLORS[2] },
      ],
    },
    {
      row: 11,
      speed: 2.5 * speedMul,
      dir: -1,
      entities: [
        { width: 1, type: "car", color: ROAD_COLORS[2] },
        { width: 2, type: "truck", color: "#95a5a6" },
        { width: 1, type: "car", color: ROAD_COLORS[3] },
        { width: 1, type: "car", color: ROAD_COLORS[4] },
      ],
    },
    {
      row: 10,
      speed: 3.0 * speedMul,
      dir: 1,
      entities: [
        { width: 2, type: "truck", color: "#7f8c8d" },
        { width: 1, type: "car", color: ROAD_COLORS[0] },
        { width: 1, type: "car", color: ROAD_COLORS[1] },
        { width: 3, type: "truck", color: "#95a5a6" },
      ],
    },
    {
      row: 9,
      speed: 2.0 * speedMul,
      dir: -1,
      entities: [
        { width: 1, type: "car", color: ROAD_COLORS[4] },
        { width: 1, type: "car", color: ROAD_COLORS[3] },
        { width: 2, type: "truck", color: "#7f8c8d" },
        { width: 1, type: "car", color: ROAD_COLORS[2] },
      ],
    },
    {
      row: 8,
      speed: 3.5 * speedMul,
      dir: 1,
      entities: [
        { width: 1, type: "car", color: ROAD_COLORS[1] },
        { width: 3, type: "truck", color: "#95a5a6" },
        { width: 1, type: "car", color: ROAD_COLORS[0] },
        { width: 1, type: "car", color: ROAD_COLORS[4] },
      ],
    },
  ];

  for (const cfg of roadConfigs) {
    const entities: Entity[] = [];
    const gap = COLS / cfg.entities.length;
    cfg.entities.forEach((e, i) => {
      entities.push({
        col: i * gap,
        width: e.width,
        type: e.type,
        color: e.color,
      });
    });
    lanes.push({ row: cfg.row, speed: cfg.speed, dir: cfg.dir, entities });
  }

  // River lanes (rows 1–6), bottom to top
  const riverConfigs: {
    row: number;
    speed: number;
    dir: 1 | -1;
    type: "log" | "turtle";
    entityWidth: number;
    count: number;
  }[] = [
    { row: 6, speed: 1.5 * speedMul, dir: 1, type: "log", entityWidth: 3, count: 3 },
    { row: 5, speed: 2.0 * speedMul, dir: -1, type: "turtle", entityWidth: 2, count: 4 },
    { row: 4, speed: 1.0 * speedMul, dir: 1, type: "log", entityWidth: 4, count: 2 },
    { row: 3, speed: 2.5 * speedMul, dir: -1, type: "turtle", entityWidth: 2, count: 3 },
    { row: 2, speed: 1.5 * speedMul, dir: 1, type: "log", entityWidth: 2, count: 4 },
    { row: 1, speed: 2.0 * speedMul, dir: -1, type: "turtle", entityWidth: 3, count: 3 },
  ];

  for (const cfg of riverConfigs) {
    const entities: Entity[] = [];
    const gap = COLS / cfg.count;
    for (let i = 0; i < cfg.count; i++) {
      const e: Entity = {
        col: i * gap,
        width: cfg.entityWidth,
        type: cfg.type,
        color: cfg.type === "log" ? LOG_COLOR : "#27ae60",
      };
      if (cfg.type === "turtle") {
        e.submerged = false;
        e.turtleTimer = (i * (TURTLE_VISIBLE_DURATION / cfg.count)) % TURTLE_VISIBLE_DURATION;
        e.turtlePhase = "visible";
      }
      entities.push(e);
    }
    lanes.push({ row: cfg.row, speed: cfg.speed, dir: cfg.dir, entities });
  }

  return lanes;
}

// ── Game state factory ────────────────────────────────────────────────────────

function makeFrog(): Frog {
  return {
    col: Math.floor(COLS / 2),
    row: ROW_START,
    animating: false,
    animT: 0,
    targetCol: Math.floor(COLS / 2),
    targetRow: ROW_START,
    fromCol: Math.floor(COLS / 2),
    fromRow: ROW_START,
  };
}

function makeState(level = 1): GameState {
  return {
    frog: makeFrog(),
    lanes: buildLanes(level),
    score: 0,
    lives: 3,
    level,
    over: false,
    goalsOccupied: [false, false, false, false, false],
    roundTimeMs: Math.max(8000, ROUND_TIME_BASE - (level - 1) * 1000),
    roundTimerMs: Math.max(8000, ROUND_TIME_BASE - (level - 1) * 1000),
    pendingDir: null,
    prevScore: 0,
    prevLives: 3,
    prevLevel: level,
    visitedRows: new Set(),
  };
}

// ── Collision helpers ─────────────────────────────────────────────────────────

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  if (frog.row < ROW_ROAD_TOP || frog.row > ROW_ROAD_BOT) return false;
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return false;
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) return true;
  }
  return false;
}

function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  if (frog.row < ROW_RIVER_TOP || frog.row > ROW_RIVER_BOT) return null;
  const lane = lanes.find((l) => l.row === frog.row);
  if (!lane) return null;
  for (const e of lane.entities) {
    if (frog.col >= e.col && frog.col < e.col + e.width) {
      if (e.type === "turtle" && e.submerged) return null;
      return e;
    }
  }
  return null;
}

function getMouthIndex(col: number): number {
  for (let i = 0; i < GOAL_MOUTHS.length; i++) {
    const m = GOAL_MOUTHS[i];
    if (col >= m.startCol && col <= m.endCol) return i;
  }
  return -1;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, jumping: boolean) {
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;

  // Body
  ctx.fillStyle = "#2ecc71";
  ctx.beginPath();
  ctx.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  const eyeOffsetX = jumping ? 10 : 9;
  const eyeOffsetY = jumping ? -8 : -7;
  for (const sign of [-1, 1]) {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(cx + sign * eyeOffsetX, cy + eyeOffsetY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(cx + sign * eyeOffsetX, cy + eyeOffsetY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Legs (extended when jumping)
  if (jumping) {
    ctx.strokeStyle = "#27ae60";
    ctx.lineWidth = 3;
    // back legs
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx - 16, cy + 14);
    ctx.moveTo(cx + 10, cy + 6);
    ctx.lineTo(cx + 16, cy + 14);
    // front legs
    ctx.moveTo(cx - 8, cy - 4);
    ctx.lineTo(cx - 14, cy - 12);
    ctx.moveTo(cx + 8, cy - 4);
    ctx.lineTo(cx + 14, cy - 12);
    ctx.stroke();
  }
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const h = CELL - 6;
  const top = y + 3;
  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 2, top, w - 4, h, 6);
  ctx.fill();
  // Windshield
  ctx.fillStyle = "rgba(200,230,255,0.6)";
  ctx.fillRect(x + w * 0.25, top + 4, w * 0.5, h * 0.35);
  // Wheels
  ctx.fillStyle = "#1a1a1a";
  for (const wx of [x + 5, x + w - 10]) {
    ctx.beginPath();
    ctx.arc(wx, top + h - 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTruck(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color: string) {
  const h = CELL - 4;
  const top = y + 2;
  // Cargo
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + 2, top, w - 4, h, 4);
  ctx.fill();
  // Cabin (front third)
  ctx.fillStyle = "#566573";
  ctx.fillRect(x + 2, top, w * 0.3, h);
  // Windows
  ctx.fillStyle = "rgba(200,230,255,0.5)";
  ctx.fillRect(x + 4, top + 4, w * 0.2, h * 0.4);
  // Wheels
  ctx.fillStyle = "#1a1a1a";
  for (const wx of [x + 6, x + w - 10]) {
    ctx.beginPath();
    ctx.arc(wx, top + h - 1, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, w: number) {
  // Main log
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.roundRect(x + 1, y + 6, w - 2, CELL - 12, 8);
  ctx.fill();
  // Grain lines
  ctx.strokeStyle = "#6B3310";
  ctx.lineWidth = 1;
  for (let lx = x + 8; lx < x + w - 4; lx += 12) {
    ctx.beginPath();
    ctx.moveTo(lx, y + 8);
    ctx.lineTo(lx, y + CELL - 8);
    ctx.stroke();
  }
}

function drawTurtle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  submerged: boolean
) {
  const alpha = submerged ? 0.35 : 1;
  ctx.globalAlpha = alpha;

  const cx = x + w / 2;
  const cy = y + CELL / 2;

  // Shell per turtle in the group
  const count = Math.round(w / CELL);
  for (let i = 0; i < count; i++) {
    const tx = x + i * CELL + CELL / 2;
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.ellipse(tx, cy, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1e8449";
    ctx.beginPath();
    ctx.ellipse(tx, cy, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = "#27ae60";
    ctx.beginPath();
    ctx.arc(tx + (i === count - 1 ? 12 : -12), cy, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  void cx;

  ctx.globalAlpha = 1;
}

function draw(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Background zones ────────────────────────────────────────────────────────
  for (let row = 0; row < ROWS; row++) {
    let bg: string;
    if (row === ROW_GOALS) bg = "#1a5c2e";
    else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) bg = "#1a3a6b";
    else if (row === 7)
      bg = "#2d5a1b"; // safe mid
    else if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) bg = "#2c2c2c";
    else if (row === ROW_START)
      bg = "#2d5a1b"; // safe start
    else bg = "#2d5a1b";

    ctx.fillStyle = bg;
    ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
  }

  // Road lane lines
  for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, row * CELL);
    ctx.lineTo(CANVAS_W, row * CELL);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Goal mouths
  for (let i = 0; i < GOAL_MOUTHS.length; i++) {
    const m = GOAL_MOUTHS[i];
    const mx = m.startCol * CELL;
    const mw = (m.endCol - m.startCol + 1) * CELL;
    ctx.fillStyle = state.goalsOccupied[i] ? "#2ecc71" : "#0d3b1e";
    ctx.fillRect(mx, 0, mw, CELL);
    ctx.strokeStyle = "#f1c40f";
    ctx.lineWidth = 2;
    ctx.strokeRect(mx + 1, 1, mw - 2, CELL - 2);

    if (state.goalsOccupied[i]) {
      drawFrog(ctx, mx + (mw - CELL) / 2, 0, false);
    }
  }

  // ── Entities ────────────────────────────────────────────────────────────────
  for (const lane of state.lanes) {
    for (const e of lane.entities) {
      const x = e.col * CELL;
      const y = lane.row * CELL;
      const w = e.width * CELL;
      if (e.type === "car") drawCar(ctx, x, y, w, e.color ?? "#e74c3c");
      else if (e.type === "truck") drawTruck(ctx, x, y, w, e.color ?? "#7f8c8d");
      else if (e.type === "log") drawLog(ctx, x, y, w);
      else if (e.type === "turtle") drawTurtle(ctx, x, y, w, e.submerged ?? false);
    }
  }

  // ── Frog ────────────────────────────────────────────────────────────────────
  const { frog } = state;
  let drawCol: number;
  let drawRow: number;
  if (frog.animating) {
    const t = Math.min(frog.animT / JUMP_DURATION, 1);
    drawCol = frog.fromCol + (frog.targetCol - frog.fromCol) * t;
    drawRow = frog.fromRow + (frog.targetRow - frog.fromRow) * t;
  } else {
    drawCol = frog.col;
    drawRow = frog.row;
  }
  drawFrog(ctx, drawCol * CELL, drawRow * CELL, frog.animating);

  // ── HUD ─────────────────────────────────────────────────────────────────────
  ctx.font = "bold 14px monospace";
  ctx.textBaseline = "top";

  // Score (top-left)
  ctx.fillStyle = "white";
  ctx.fillText(`${state.score}`, 6, 4);

  // Level (top-center)
  ctx.textAlign = "center";
  ctx.fillText(`LVL ${state.level}`, CANVAS_W / 2, 4);
  ctx.textAlign = "left";

  // Lives (top-right as frog icons)
  for (let i = 0; i < state.lives; i++) {
    const lx = CANVAS_W - 14 - i * 20;
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(lx, 11, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // Timer bar (bottom of goals row)
  const timerFrac = state.roundTimerMs / state.roundTimeMs;
  const barColor = timerFrac > 0.5 ? "#2ecc71" : timerFrac > 0.25 ? "#f39c12" : "#e74c3c";
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, CELL - 4, CANVAS_W, 4);
  ctx.fillStyle = barColor;
  ctx.fillRect(0, CELL - 4, CANVAS_W * timerFrac, 4);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FroggerGame({
  paused,
  forceTouch = false,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeState(1));
  const rafRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const touchDirRef = useRef<((dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => void) | null>(null);
  const isTouch = useTouchDevice();
  const showControls = isTouch || forceTouch;
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  useEffect(() => {
    setPortalTarget(document.getElementById("game-touch-area") ?? document.body);
  }, []);

  // Callbacks in refs to avoid stale closures
  const onScoreRef = useRef(onScoreChange);
  const onLivesRef = useRef(onLivesChange);
  const onLevelRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);
  useEffect(() => {
    onScoreRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onLivesRef.current = onLivesChange;
  }, [onLivesChange]);
  useEffect(() => {
    onLevelRef.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const killFrog = useCallback(() => {
    const s = stateRef.current;
    if (s.over) return;
    s.lives -= 1;
    onLivesRef.current(s.lives);
    if (s.lives <= 0) {
      s.over = true;
      onLivesRef.current(0);
      onGameOverRef.current(s.score);
      return;
    }
    s.frog = makeFrog();
    s.roundTimerMs = s.roundTimeMs;
    s.visitedRows = new Set();
    s.pendingDir = null;
  }, []);

  const completeRound = useCallback(() => {
    const s = stateRef.current;
    s.score += 200;
    onScoreRef.current(s.score);
    s.level += 1;
    onLevelRef.current(s.level);
    s.goalsOccupied = [false, false, false, false, false];
    s.roundTimeMs = Math.max(8000, ROUND_TIME_BASE - (s.level - 1) * 1000);
    s.roundTimerMs = s.roundTimeMs;
    s.lanes = buildLanes(s.level);
    s.frog = makeFrog();
    s.visitedRows = new Set();
    s.pendingDir = null;
  }, []);

  const resolveCellArrival = useCallback(() => {
    const s = stateRef.current;
    const { frog } = s;

    // In goals row
    if (frog.row === ROW_GOALS) {
      const mouthIdx = getMouthIndex(frog.col);
      if (mouthIdx === -1 || s.goalsOccupied[mouthIdx]) {
        killFrog();
        return;
      }
      s.goalsOccupied[mouthIdx] = true;
      const timeBonus = Math.floor((s.roundTimerMs / 1000) * 10);
      s.score += 50 + timeBonus;
      onScoreRef.current(s.score);

      if (s.goalsOccupied.every(Boolean)) {
        completeRound();
      } else {
        s.frog = makeFrog();
        s.roundTimerMs = s.roundTimeMs;
        s.visitedRows = new Set();
        s.pendingDir = null;
      }
      return;
    }

    // Road collision
    if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
      if (checkRoadCollision(frog, s.lanes)) {
        killFrog();
        return;
      }
    }

    // River: must be on support
    if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
      if (!getSupport(frog, s.lanes)) {
        killFrog();
        return;
      }
    }

    // Score for advancing rows
    if (!s.visitedRows.has(frog.row) && frog.row < ROW_START) {
      const rowsFromStart = ROW_START - frog.row;
      if (rowsFromStart > 0) {
        s.visitedRows.add(frog.row);
        s.score += 10;
        onScoreRef.current(s.score);
      }
    }
  }, [killFrog, completeRound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    stateRef.current = makeState(1);

    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.over || pausedRef.current) return;
      if (s.frog.animating) return;
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        w: "up",
        W: "up",
        ArrowDown: "down",
        s: "down",
        S: "down",
        ArrowLeft: "left",
        a: "left",
        A: "left",
        ArrowRight: "right",
        d: "right",
        D: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        s.pendingDir = dir;
      }
    };

    touchDirRef.current = (dir) => {
      const s = stateRef.current;
      if (s.over || pausedRef.current || s.frog.animating) return;
      const dirMap: Record<string, "up" | "down" | "left" | "right"> = {
        UP: "up",
        DOWN: "down",
        LEFT: "left",
        RIGHT: "right",
      };
      s.pendingDir = dirMap[dir];
    };

    document.addEventListener("keydown", handleKey);

    let prevT = performance.now();

    const loop = (t: number) => {
      const dt = Math.min(t - prevT, 50); // cap at 50ms to avoid spiral
      prevT = t;
      lastTRef.current = t;
      const s = stateRef.current;

      if (!s.over) {
        if (!pausedRef.current) {
          // Update round timer
          s.roundTimerMs -= dt;
          if (s.roundTimerMs <= 0) {
            s.roundTimerMs = 0;
            killFrog();
          }

          // Update entity positions
          for (const lane of s.lanes) {
            for (const e of lane.entities) {
              e.col += (lane.speed * lane.dir * dt) / 1000;
              // Wrap around
              if (lane.dir === 1 && e.col > COLS) e.col = -e.width;
              if (lane.dir === -1 && e.col < -e.width) e.col = COLS;
            }

            // Update turtle phases
            for (const e of lane.entities) {
              if (e.type === "turtle") {
                e.turtleTimer = (e.turtleTimer ?? 0) + dt;
                const phaseDur =
                  e.turtlePhase === "visible" ? TURTLE_VISIBLE_DURATION : TURTLE_SUBMERGE_DURATION;
                if ((e.turtleTimer ?? 0) >= phaseDur) {
                  e.turtleTimer = 0;
                  if (e.turtlePhase === "visible") {
                    e.turtlePhase = "submerging";
                    e.submerged = true;
                  } else {
                    e.turtlePhase = "visible";
                    e.submerged = false;
                  }
                  // If frog is riding this turtle group and it just submerged
                  const { frog } = s;
                  if (
                    !frog.animating &&
                    frog.row >= ROW_RIVER_TOP &&
                    frog.row <= ROW_RIVER_BOT &&
                    frog.row === lane.row &&
                    e.submerged &&
                    frog.col >= e.col &&
                    frog.col < e.col + e.width
                  ) {
                    killFrog();
                  }
                }
              }
            }
          }

          const { frog } = s;

          if (frog.animating) {
            frog.animT += dt;
            if (frog.animT >= JUMP_DURATION) {
              frog.col = frog.targetCol;
              frog.row = frog.targetRow;
              frog.animating = false;
              resolveCellArrival();
            }
          } else {
            // River drift
            if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
              const support = getSupport(frog, s.lanes);
              if (support) {
                const lane = s.lanes.find((l) => l.row === frog.row)!;
                frog.col += (lane.speed * lane.dir * dt) / 1000;
                // If drifted out of bounds, die
                if (frog.col < 0 || frog.col >= COLS) {
                  killFrog();
                }
              } else {
                // Fell off support
                killFrog();
              }
            }

            // Process input
            if (s.pendingDir && !frog.animating && !s.over) {
              const dir = s.pendingDir;
              s.pendingDir = null;
              let tc = frog.col;
              let tr = frog.row;
              if (dir === "up") tr -= 1;
              else if (dir === "down") tr += 1;
              else if (dir === "left") tc -= 1;
              else if (dir === "right") tc += 1;

              // Clamp horizontal
              tc = Math.max(0, Math.min(COLS - 1, tc));
              // Clamp vertical — can't go below start
              tr = Math.max(0, Math.min(ROW_START, tr));

              frog.fromCol = frog.col;
              frog.fromRow = frog.row;
              frog.targetCol = tc;
              frog.targetRow = tr;
              frog.animating = true;
              frog.animT = 0;
            }
          }
        }

        // Always draw
        draw(ctx, s);

        // Fire callbacks when values change
        if (s.score !== s.prevScore) {
          onScoreRef.current(s.score);
          s.prevScore = s.score;
        }
        if (s.lives !== s.prevLives) {
          onLivesRef.current(s.lives);
          s.prevLives = s.lives;
        }
        if (s.level !== s.prevLevel) {
          onLevelRef.current(s.level);
          s.prevLevel = s.level;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("keydown", handleKey);
    };
  }, [killFrog, resolveCellArrival]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{ display: "block", width: "100%", height: "100%", imageRendering: "pixelated" }}
      />
      {portalTarget &&
        createPortal(
          <div className="flex items-center justify-center w-full h-full">
            <TouchControls
              visible={showControls}
              layout="dpad"
              onDirection={(dir) => {
                const map = {
                  up: "UP",
                  down: "DOWN",
                  left: "LEFT",
                  right: "RIGHT",
                } as const;
                touchDirRef.current?.(map[dir]);
              }}
            />
          </div>,
          portalTarget
        )}
    </>
  );
}
