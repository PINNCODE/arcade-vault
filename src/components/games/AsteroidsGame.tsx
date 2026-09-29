"use client";

import { useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AsteroidsCallbacks {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

interface Props extends AsteroidsCallbacks {
  paused: boolean;
  restartKey?: number; // increment to restart the game
}

// ── Utils ─────────────────────────────────────────────────────────────────────

const W = 800;
const H = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

// ── Constants ─────────────────────────────────────────────────────────────────

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;
const RADII = [0, 16, 30, 50];
const SPEEDS = [0, 85, 55, 32];
const POINTS = [0, 100, 50, 20];

// ── Game classes ──────────────────────────────────────────────────────────────

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];
  dead: boolean;

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++) ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = 12;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = "#0ff";
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = "#0ff";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

class Ship {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  radius: number;
  thrusting: boolean;
  invincible: number;
  shootCooldown: number;
  tripleShot: number;
  dead: boolean;

  constructor() {
    this.tripleShot = 0;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 0;
    this.shootCooldown = 0;
    this.dead = false;
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Record<string, boolean>) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5;
    const THRUST = 260;
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AsteroidsGame({
  paused,
  restartKey = 0,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);

  // game state refs
  const shipRef = useRef<Ship | null>(null);
  const bulletsRef = useRef<Bullet[]>([]);
  const asteroidsRef = useRef<Asteroid[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const stateRef = useRef<"playing" | "dead" | "gameover">("playing");
  const deadTimerRef = useRef(0);
  const powerUpSpawnedRef = useRef(false);
  const killsSinceSpawnRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const gameOverFiredRef = useRef(false);

  // track previous values to avoid flooding parent with callbacks
  const prevScoreRef = useRef(0);
  const prevLivesRef = useRef(3);
  const prevLevelRef = useRef(1);

  // input
  const keysRef = useRef<Record<string, boolean>>({});
  const justPressedRef = useRef<Record<string, boolean>>({});

  const pressed = (code: string) => {
    const val = justPressedRef.current[code];
    justPressedRef.current[code] = false;
    return val;
  };

  // keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // main effect: init game + loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    // reset fired flag on (re)start
    gameOverFiredRef.current = false;
    prevScoreRef.current = 0;
    prevLivesRef.current = 3;
    prevLevelRef.current = 1;

    // ── helpers ───────────────────────────────────────────────────────────────

    function spawnAsteroids(count: number) {
      const SAFE_DIST = 130;
      for (let i = 0; i < count; i++) {
        let x: number, y: number;
        do {
          x = rand(0, W);
          y = rand(0, H);
        } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
        asteroidsRef.current.push(new Asteroid(x, y, 3));
      }
    }

    function initGame() {
      shipRef.current = new Ship();
      bulletsRef.current = [];
      asteroidsRef.current = [];
      particlesRef.current = [];
      powerUpsRef.current = [];
      powerUpSpawnedRef.current = false;
      killsSinceSpawnRef.current = 0;
      scoreRef.current = 0;
      livesRef.current = 3;
      levelRef.current = 1;
      stateRef.current = "playing";
      spawnAsteroids(4);
    }

    function nextLevel() {
      levelRef.current++;
      bulletsRef.current = [];
      particlesRef.current = [];
      powerUpsRef.current = [];
      powerUpSpawnedRef.current = false;
      killsSinceSpawnRef.current = 0;
      shipRef.current?.reset();
      spawnAsteroids(3 + levelRef.current);
    }

    function explode(x: number, y: number, count = 8) {
      for (let i = 0; i < count; i++) particlesRef.current.push(new Particle(x, y));
    }

    function killShip() {
      const ship = shipRef.current!;
      explode(ship.x, ship.y, 14);
      ship.dead = true;
      livesRef.current--;
      if (livesRef.current <= 0) {
        stateRef.current = "gameover";
      } else {
        stateRef.current = "dead";
        deadTimerRef.current = 2;
      }
    }

    // ── drawHUD ───────────────────────────────────────────────────────────────

    function drawLifeIcon(x: number, y: number) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    function drawHUD() {
      ctx.fillStyle = "#fff";
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`SCORE  ${scoreRef.current}`, 14, 26);
      ctx.textAlign = "center";
      ctx.fillText(`NIVEL ${levelRef.current}`, W / 2, 26);
      for (let i = 0; i < livesRef.current; i++) drawLifeIcon(W - 16 - i * 22, 18);
      const ship = shipRef.current;
      if (ship && ship.tripleShot > 0) {
        ctx.textAlign = "left";
        ctx.fillStyle = "#0ff";
        ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 46);
      }
    }

    function drawOverlay(title: string, sub: string) {
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      ctx.font = "bold 46px monospace";
      ctx.fillText(title, W / 2, H / 2 - 18);
      ctx.font = "18px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.fillText(sub, W / 2, H / 2 + 22);
    }

    // ── update ────────────────────────────────────────────────────────────────

    function update(dt: number) {
      if (stateRef.current === "gameover") {
        particlesRef.current.forEach((p) => p.update(dt));
        particlesRef.current = particlesRef.current.filter((p) => !p.dead);
        return;
      }

      if (stateRef.current === "dead") {
        deadTimerRef.current -= dt;
        particlesRef.current.forEach((p) => p.update(dt));
        particlesRef.current = particlesRef.current.filter((p) => !p.dead);
        asteroidsRef.current.forEach((a) => a.update(dt));
        if (deadTimerRef.current <= 0) {
          stateRef.current = "playing";
          shipRef.current?.reset();
        }
        return;
      }

      const ship = shipRef.current!;
      const keys = keysRef.current;

      if (pressed("Space")) bulletsRef.current.push(...ship.tryShoot());

      ship.update(dt, keys);
      bulletsRef.current.forEach((b) => b.update(dt));
      asteroidsRef.current.forEach((a) => a.update(dt));
      particlesRef.current.forEach((p) => p.update(dt));
      powerUpsRef.current.forEach((p) => p.update(dt));

      bulletsRef.current = bulletsRef.current.filter((b) => !b.dead);
      particlesRef.current = particlesRef.current.filter((p) => !p.dead);
      powerUpsRef.current = powerUpsRef.current.filter((p) => !p.dead);

      for (const p of powerUpsRef.current) {
        if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
          p.dead = true;
          ship.tripleShot = POWERUP_DURATION;
        }
      }

      const newAsteroids: Asteroid[] = [];
      for (const b of bulletsRef.current) {
        for (const a of asteroidsRef.current) {
          if (!a.dead && !b.dead && dist(b, a) < a.radius) {
            b.dead = true;
            a.dead = true;
            scoreRef.current += POINTS[a.size];
            explode(a.x, a.y, a.size * 5);
            newAsteroids.push(...a.split());
            if (!powerUpSpawnedRef.current) {
              killsSinceSpawnRef.current++;
              const guaranteed = killsSinceSpawnRef.current >= 5;
              if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
                powerUpsRef.current.push(new PowerUp(a.x, a.y));
                powerUpSpawnedRef.current = true;
              }
            }
          }
        }
      }
      asteroidsRef.current = asteroidsRef.current.filter((a) => !a.dead).concat(newAsteroids);
      bulletsRef.current = bulletsRef.current.filter((b) => !b.dead);

      if (ship.invincible <= 0) {
        for (const a of asteroidsRef.current) {
          if (dist(ship, a) < ship.radius + a.radius * 0.82) {
            killShip();
            break;
          }
        }
      }

      if (asteroidsRef.current.length === 0) nextLevel();
    }

    // ── draw ──────────────────────────────────────────────────────────────────

    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      particlesRef.current.forEach((p) => p.draw(ctx));
      asteroidsRef.current.forEach((a) => a.draw(ctx));
      powerUpsRef.current.forEach((p) => p.draw(ctx));
      bulletsRef.current.forEach((b) => b.draw(ctx));
      shipRef.current?.draw(ctx);
      drawHUD();
      if (stateRef.current === "gameover")
        drawOverlay("GAME OVER", `PUNTAJE: ${scoreRef.current}   —   ESPACIO PARA REINICIAR`);
    }

    // ── loop ──────────────────────────────────────────────────────────────────

    function loop(ts: number) {
      const dt =
        lastTimeRef.current === null ? 0 : Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      if (!pausedRef.current) update(dt);
      draw();

      // notify parent when values change
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

      if (stateRef.current === "gameover" && !gameOverFiredRef.current) {
        gameOverFiredRef.current = true;
        onGameOver(scoreRef.current);
        return; // stop the loop
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    // ── input ─────────────────────────────────────────────────────────────────

    const handleKeyDown = (e: KeyboardEvent) => {
      // prevent Space/arrows from scrolling the page or triggering buttons
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

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      lastTimeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
    />
  );
}
