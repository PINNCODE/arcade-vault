"use client";

import { useEffect, useState } from "react";

export function useTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}
