"use client";

import { useSession } from "@/hooks/useSession";
import Nav from "./Nav";

export default function NavWrapper() {
  const { user, signOut } = useSession();
  return <Nav user={user} onSignOut={signOut} />;
}
