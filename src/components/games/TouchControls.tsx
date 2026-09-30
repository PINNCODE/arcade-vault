"use client";

import React from "react";

type Direction = "up" | "down" | "left" | "right";

interface TouchControlsProps {
  onDirection: (dir: Direction) => void;
  onDirectionEnd?: (dir: Direction) => void;
  onFire?: () => void;
  visible: boolean;
  layout?: "dpad" | "lr-only";
}

// Shared button style — minimum 56×56 px touch target
const BTN =
  "flex items-center justify-center w-14 h-14 rounded-xl bg-white/10 border border-white/20 text-white text-xl active:bg-white/25 select-none";

function DirButton({
  dir,
  label,
  onDirection,
  onDirectionEnd,
}: {
  dir: Direction;
  label: string;
  onDirection: (dir: Direction) => void;
  onDirectionEnd?: (dir: Direction) => void;
}) {
  return (
    <button
      className={BTN}
      onTouchStart={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        onDirectionEnd?.(dir);
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        onDirection(dir);
      }}
      onMouseUp={(e) => {
        e.preventDefault();
        onDirectionEnd?.(dir);
      }}
      onMouseLeave={(e) => {
        e.preventDefault();
        onDirectionEnd?.(dir);
      }}
      style={{ touchAction: "manipulation" }}
      aria-label={dir}
    >
      {label}
    </button>
  );
}

export function TouchControls({
  onDirection,
  onDirectionEnd,
  onFire,
  visible,
  layout = "dpad",
}: TouchControlsProps) {
  if (!visible) return null;

  if (layout === "lr-only") {
    return (
      <div className="flex gap-4 justify-center mt-4">
        <DirButton dir="left" label="◀" onDirection={onDirection} onDirectionEnd={onDirectionEnd} />
        <DirButton
          dir="right"
          label="▶"
          onDirection={onDirection}
          onDirectionEnd={onDirectionEnd}
        />
      </div>
    );
  }

  // Full D-pad layout
  //   [ ↑ ]
  // [←][↓][→]   [🔥]
  return (
    <div className="flex items-end gap-6 justify-center mt-4">
      {/* D-pad */}
      <div className="flex flex-col items-center gap-1">
        <DirButton dir="up" label="▲" onDirection={onDirection} onDirectionEnd={onDirectionEnd} />
        <div className="flex gap-1">
          <DirButton
            dir="left"
            label="◀"
            onDirection={onDirection}
            onDirectionEnd={onDirectionEnd}
          />
          <DirButton
            dir="down"
            label="▼"
            onDirection={onDirection}
            onDirectionEnd={onDirectionEnd}
          />
          <DirButton
            dir="right"
            label="▶"
            onDirection={onDirection}
            onDirectionEnd={onDirectionEnd}
          />
        </div>
      </div>

      {/* Fire button (optional) */}
      {onFire && (
        <button
          className={`${BTN} w-16 h-16 rounded-full bg-red-500/30 border-red-400/50 text-2xl`}
          onTouchStart={(e) => {
            e.preventDefault();
            onFire();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onFire();
          }}
          style={{ touchAction: "manipulation" }}
          aria-label="fire"
        >
          🔥
        </button>
      )}
    </div>
  );
}
