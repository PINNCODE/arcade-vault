import { getGames } from "@/lib/supabase/queries";
import HomeContent from "@/components/HomeContent";

export default async function HomePage() {
  const games = await getGames();
  return <HomeContent featuredGames={games.slice(0, 6)} />;
}
