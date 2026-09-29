"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { saveScore } from "@/lib/supabase/queries-client";
import TetrisGame from "@/components/games/TetrisGame";

export default function TetrisPlayPage() {
  const router = useRouter();
  const { user } = useSession();

  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  const scoreRef = useRef(0);

  const handleScoreChange = useCallback((s: number) => {
    scoreRef.current = s;
    setScore(s);
  }, []);

  const handleLinesChange = useCallback((l: number) => setLines(l), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);

  const handleGameOver = useCallback((s: number) => {
    setFinalScore(s);
    setOver(true);
  }, []);

  const handleFin = () => {
    setFinalScore(scoreRef.current);
    setOver(true);
  };

  const restart = () => {
    setScore(0);
    setLines(0);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setFinalScore(0);
    scoreRef.current = 0;
    setRestartKey((k) => k + 1);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveScore("tetris", name, finalScore);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in" style={{ maxWidth: 640 }}>
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Líneas</div>
            <div className="v">{lines}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)} disabled={over}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleFin} disabled={over}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push("/games/tetris")}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div
          className="crt-screen"
          style={{
            aspectRatio: "unset",
            height: "min(calc(100svh - 200px), 600px)",
          }}
        >
          {!over && (
            <TetrisGame
              paused={paused}
              restartKey={restartKey}
              onScoreChange={handleScoreChange}
              onLinesChange={handleLinesChange}
              onLevelChange={handleLevelChange}
              onGameOver={handleGameOver}
            />
          )}
          {paused && !over && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>TETRIS · CRT-84 · 60 HZ</span>
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
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSave} disabled={saving}>
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
