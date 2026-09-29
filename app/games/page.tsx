import { getGames } from "@/lib/supabase/queries";
import GamesLibrary from "@/components/GamesLibrary";

export default async function GamesPage() {
  const games = await getGames();
  return <GamesLibrary games={games} />;
}
