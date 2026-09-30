"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTouchDevice } from "@/hooks/useTouchDevice";
import { TouchControls } from "./TouchControls";

interface Props {
  paused?: boolean;
  restartKey?: number;
  forceTouch?: boolean;
  onGameOver: (score: number, outcome: "gameover" | "win") => void;
  onScoreChange?: (score: number) => void;
}

export default function ArkanoidGame({
  paused = false,
  restartKey = 0,
  forceTouch = false,
  onGameOver,
  onScoreChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onScoreChangeRef = useRef(onScoreChange);
  const setKeyRef = useRef<((key: string, value: boolean) => void) | null>(null);
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
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | undefined;

    import("@/lib/games/arkanoid/game").then(({ initGame }) => {
      const result = initGame(
        canvas,
        onGameOver,
        () => pausedRef.current,
        (s: number) => onScoreChangeRef.current?.(s)
      );
      cleanup = result.cleanup;
      setKeyRef.current = result.setKey;
    });

    return () => {
      cleanup?.();
      setKeyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restartKey]);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
      />
      {portalTarget &&
        createPortal(
          <div className="flex items-center justify-center w-full h-full">
            <TouchControls
              visible={showControls}
              layout="lr-only"
              onDirection={(dir) =>
                setKeyRef.current?.(dir === "left" ? "ArrowLeft" : "ArrowRight", true)
              }
              onDirectionEnd={(dir) =>
                setKeyRef.current?.(dir === "left" ? "ArrowLeft" : "ArrowRight", false)
              }
            />
          </div>,
          portalTarget
        )}
    </>
  );
}
