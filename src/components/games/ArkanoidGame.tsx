"use client";

import { useEffect, useRef } from "react";

interface Props {
  paused?: boolean;
  restartKey?: number;
  onGameOver: (score: number, outcome: "gameover" | "win") => void;
  onScoreChange?: (score: number) => void;
}

export default function ArkanoidGame({
  paused = false,
  restartKey = 0,
  onGameOver,
  onScoreChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onScoreChangeRef = useRef(onScoreChange);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | undefined;

    import("@/lib/games/arkanoid/game").then(({ initGame }) => {
      cleanup = initGame(
        canvas,
        onGameOver,
        () => pausedRef.current,
        (s: number) => onScoreChangeRef.current?.(s)
      );
    });

    return () => {
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
