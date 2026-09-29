import { createClient } from "./server";
import type { Game, ScoreWithGame } from "./types";

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id,title,short,long,cat,cover,color,best,plays")
    .order("title");
  if (error) throw error;
  return (data ?? []) as Game[];
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id,title,short,long,cat,cover,color,best,plays")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Game;
}

export async function getTopScores(gameId?: string, limit = 10): Promise<ScoreWithGame[]> {
  const supabase = await createClient();
  let q = supabase
    .from("scores")
    .select("id,game_id,player_name,score,created_at,games(title)")
    .order("score", { ascending: false })
    .limit(limit);
  if (gameId) q = q.eq("game_id", gameId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as ScoreWithGame[];
}
