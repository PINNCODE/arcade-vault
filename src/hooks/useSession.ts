"use client";

import { useState, useCallback, useEffect } from "react";

export interface SessionUser {
  name: string;
}

export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

const SESSION_KEY = "av_user";
const SESSION_EVENT = "av:session";

function readUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeUser(u: SessionUser | null) {
  try {
    if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
  // Notify all useSession instances in this tab
  window.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(readUser);

  // Re-sync whenever another useSession instance writes a change
  useEffect(() => {
    const handler = () => setUser(readUser());
    window.addEventListener(SESSION_EVENT, handler);
    return () => window.removeEventListener(SESSION_EVENT, handler);
  }, []);

  const login = useCallback((u: SessionUser | null) => {
    setUser(u);
    writeUser(u);
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    writeUser(null);
  }, []);

  const saveScore = useCallback((entry: Omit<SavedScore, "at">) => {
    try {
      const all: SavedScore[] = JSON.parse(
        localStorage.getItem("av_scores") || "[]"
      );
      all.push({ ...entry, at: Date.now() });
      localStorage.setItem("av_scores", JSON.stringify(all));
    } catch {}
  }, []);

  return { user, login, signOut, saveScore };
}
