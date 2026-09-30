"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { saveScore } from "@/lib/supabase/queries-client";
import SnakeGame from "@/components/games/SnakeGame";
import { useTouchDevice } from "@/hooks/useTouchDevice";

export default function SnakePlayPage() {
  const router = useRouter();
  const { user } = useSession();

  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [forceTouch, setForceTouch] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("touch") === "1") setForceTouch(true);
  }, []);
  const isTouch = useTouchDevice();
  const showControls = isTouch || forceTouch;

  const scoreRef = useRef(0);

  const handleScoreChange = useCallback((s: number) => {
    scoreRef.current = s;
    setScore(s);
  }, []);

  const handleGameOver = useCallback(
    (s: number, _meta: { fruitsEaten: number; maxLength: number }) => {
      scoreRef.current = s;
      setScore(s);
      setFinalScore(s);
      setOver(true);
    },
    []
  );

  const handleFin = () => {
    setFinalScore(scoreRef.current);
    setOver(true);
  };

  const restart = () => {
    setScore(0);
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
      await saveScore("serpentina", name, finalScore);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="av-player fade-in"
      style={
        showControls
          ? {
              maxWidth: 640,
              display: "flex",
              flexDirection: "column",
              height: "calc(100svh - 81px)",
            }
          : { maxWidth: 640 }
      }
    >
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
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)} disabled={over}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleFin} disabled={over}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push("/games/serpentina")}>
            SALIR
          </button>
          <button
            className="btn ghost"
            onClick={() => setForceTouch((t) => !t)}
            title="Toggle touch controls (debug)"
          >
            🕹️
          </button>
        </div>
      </div>

      <div className="crt" style={showControls ? { flex: 1, minHeight: 0 } : undefined}>
        <div
          className="crt-screen"
          style={
            showControls
              ? { height: "100%" }
              : { aspectRatio: "1 / 1", height: "min(calc(100svh - 200px), 480px)" }
          }
        >
          {!over && (
            <SnakeGame
              paused={paused}
              restartKey={restartKey}
              forceTouch={forceTouch}
              onGameOver={handleGameOver}
              onScoreChange={handleScoreChange}
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
          <span>SNAKE · CRT-84 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      <div
        id="game-touch-area"
        style={{
          flex: "0 0 auto",
          minHeight: 150,
          display: showControls ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
        }}
      />

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
