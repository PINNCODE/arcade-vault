import { createClient } from "./client";

export async function saveScore(gameId: string, playerName: string, score: number): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("scores")
    .insert({ game_id: gameId, player_name: playerName, score });
  if (error) throw error;
}
