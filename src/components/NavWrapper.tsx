"use client";

import { useState, useEffect } from "react";
import { useSession } from "@/hooks/useSession";
import Nav from "./Nav";

export default function NavWrapper() {
  const { user, signOut } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <Nav user={mounted ? user : null} onSignOut={signOut} />;
}
