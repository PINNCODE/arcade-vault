"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/hooks/useSession";

interface NavProps {
  user: SessionUser | null;
  onSignOut: () => void;
}

export default function Nav({ user, onSignOut }: NavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/games") return pathname === "/games" || pathname.startsWith("/games/");
    return pathname.startsWith(href);
  };

  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        <div className="links">
          <Link href="/" className={isActive("/") ? "active" : ""}>
            HOME
          </Link>
          <Link href="/games" className={isActive("/games") ? "active" : ""}>
            JUEGOS
          </Link>
          <Link href="/hall-of-fame" className={isActive("/hall-of-fame") ? "active" : ""}>
            SALÓN
          </Link>
          <Link href="/leaderboard" className={isActive("/leaderboard") ? "active" : ""}>
            LEADERBOARD
          </Link>
          <Link href="/about" className={isActive("/about") ? "active" : ""}>
            ABOUT
          </Link>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button className="btn ghost auth-btn" onClick={onSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}

        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>
          MENÚ
        </div>
        <Link href="/" className={isActive("/") ? "active" : ""} onClick={close}>
          HOME
        </Link>
        <Link href="/games" className={isActive("/games") ? "active" : ""} onClick={close}>
          JUEGOS
        </Link>
        <Link
          href="/hall-of-fame"
          className={isActive("/hall-of-fame") ? "active" : ""}
          onClick={close}
        >
          SALÓN
        </Link>
        <Link
          href="/leaderboard"
          className={isActive("/leaderboard") ? "active" : ""}
          onClick={close}
        >
          LEADERBOARD
        </Link>
        <Link href="/about" className={isActive("/about") ? "active" : ""} onClick={close}>
          ABOUT
        </Link>
        <Link href="/auth" className={isActive("/auth") ? "active" : ""} onClick={close}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
