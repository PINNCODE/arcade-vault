import Link from "next/link";
import { getGames, getTopScores } from "@/lib/supabase/queries";

export default async function HallOfFamePage() {
  const [games, scores] = await Promise.all([getGames(), getTopScores(undefined, 12)]);

  const top3 = scores.slice(0, 3);
  const rest = scores.slice(3);

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link key={g.id} className="chip" href={`/leaderboard?game=${g.id}`}>
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
          <div>¡Sé el primero en entrar al salón!</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {top3[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{top3[1].player_name}</div>
                <div className="score">{top3[1].score.toLocaleString("es-ES")}</div>
                <div className="date">
                  {new Date(top3[1].created_at).toLocaleDateString("es-ES")}
                </div>
              </div>
            )}
            {top3[0] && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
                >
                  CAMPEÓN
                </div>
                <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                  01
                </div>
                <div className="name">{top3[0].player_name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {top3[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">
                  {new Date(top3[0].created_at).toLocaleDateString("es-ES")}
                </div>
              </div>
            )}
            {top3[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{top3[2].player_name}</div>
                <div className="score">{top3[2].score.toLocaleString("es-ES")}</div>
                <div className="date">
                  {new Date(top3[2].created_at).toLocaleDateString("es-ES")}
                </div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
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
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{new Date(r.created_at).toLocaleDateString("es-ES")}</div>
              </div>
            ))}
            {rest.length === 0 && top3.length > 0 && null}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
