import { WhotEngine } from "./WhotEngine";

interface Props {
  onWin: (player: string) => void;
}

export function WhotView({ onWin }: Props) {
  return (
    <div className="whot-view rounded-2xl bg-black/40 p-4 border border-white/10">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-black text-red-500">WHOT!</h3>
        <p className="text-white/60">Card Game</p>
      </div>

      <WhotEngine onWin={onWin} />
    </div>
  );
}
