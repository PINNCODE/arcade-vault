export type GameColor = "cyan" | "magenta" | "green" | "yellow";
export type GameCat = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCat;
  cover: string;
  color: GameColor;
  best: number;
  plays: string;
}

export interface Score {
  id: string;
  game_id: string;
  player_name: string;
  score: number;
  created_at: string;
}

export interface ScoreWithGame extends Score {
  games: { title: string } | { title: string }[] | null;
}
