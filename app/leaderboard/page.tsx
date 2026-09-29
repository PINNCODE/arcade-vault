import Link from "next/link";
import { getGames, getTopScores } from "@/lib/supabase/queries";

interface Props {
  searchParams: Promise<{ game?: string }>;
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const { game: gameId } = await searchParams;

  const [games, scores] = await Promise.all([getGames(), getTopScores(gameId, 10)]);

  const activeGame = games.find((g) => g.id === gameId);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>LEADERBOARD</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          {activeGame ? `TOP 10 · ${activeGame.title}` : "TOP 10 · TODOS LOS JUEGOS"}
        </p>
      </div>

      <div className="hall-tabs">
        <Link className={"chip" + (!gameId ? " active" : "")} href="/leaderboard">
          TODOS
        </Link>
        {games.map((g) => (
          <Link
            key={g.id}
            className={"chip" + (gameId === g.id ? " active" : "")}
            href={`/leaderboard?game=${g.id}`}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {scores.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--ink-faint)" }}>
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            AÚN NO HAY PUNTUACIONES
          </div>
          <div>¡Juega y sé el primero en el ranking!</div>
        </div>
      ) : (
        <div className="hall-table">
          <div className="th">
            <div>RANGO</div>
            <div>JUGADOR</div>
            {!gameId && <div>JUEGO</div>}
            <div>PUNTUACIÓN</div>
            <div>FECHA</div>
          </div>
          {scores.map((r, i) => (
            <div
              key={r.id}
              className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
              <div className="pl">{r.player_name}</div>
              {!gameId && (
                <div className="pl" style={{ color: "var(--ink-dim)" }}>
                  {(Array.isArray(r.games) ? r.games[0]?.title : r.games?.title) ?? r.game_id}
                </div>
              )}
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
              <div className="dt">{new Date(r.created_at).toLocaleDateString("es-ES")}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/games">
          VOLVER A LOS JUEGOS
        </Link>
      </div>
    </div>
  );
}
