import type { Game } from "@/lib/data";

interface MiniCardProps {
  game: Game;
  onClick: () => void;
}

export default function MiniCard({ game, onClick }: MiniCardProps) {
  return (
    <div className="mini-card" onClick={onClick}>
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover} />
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </div>
  );
}
