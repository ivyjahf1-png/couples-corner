interface Props {
  coinBalance: number;
  signedIn: boolean;
  onGift: () => void;
}

export function SlotsView({ coinBalance, signedIn, onGift }: Props) {
  return (
    <div className="slots-view rounded-2xl bg-black/40 p-4 border border-white/10">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-black text-yellow-400">FORTUNE TIGER</h3>
        <p className="text-white/60">Slot Machine</p>
      </div>

      <div className="slots-grid rounded-xl bg-gradient-to-b from-gray-900 to-black p-4 mb-4 border border-white/10">
        <div className="flex justify-center gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-black text-white">1. Ruby</p>
            <p className="text-2xl font-black text-red-500">◆</p>
            <p className="text-xs text-white/60">Payline 1</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white">2. Tiger</p>
            <p className="text-2xl font-black text-yellow-400">🐯</p>
            <p className="text-xs text-white/60">Payline 2</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white">3. Coin</p>
            <p className="text-2xl font-black text-yellow-300">🪙</p>
            <p className="text-xs text-white/60">Payline 3</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white">4. Fruit</p>
            <p className="text-2xl font-black text-orange-400">🍊</p>
            <p className="text-xs text-white/60">Payline 4</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black text-white">5. Bell</p>
            <p className="text-2xl font-black text-blue-400">🔔</p>
            <p className="text-xs text-white/60">Payline 5</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <div className="reel-box rounded-lg border-2 border-white/20 p-4 text-center">
            <p className="text-3xl font-black text-amber-400">◆</p>
          </div>
          <div className="reel-box rounded-lg border-2 border-white/20 p-4 text-center">
            <p className="text-3xl font-black text-amber-400">W</p>
          </div>
          <div className="reel-box rounded-lg border-2 border-white/20 p-4 text-center">
            <p className="text-3xl font-black text-amber-400">●</p>
          </div>
          <div className="reel-box rounded-lg border-2 border-white/20 p-4 text-center">
            <p className="text-3xl font-black text-amber-400">✸</p>
          </div>
          <div className="reel-box rounded-lg border-2 border-white/20 p-4 text-center">
            <p className="text-3xl font-black text-amber-400">▲</p>
          </div>
        </div>
      </div>

      <div className="paylines flex gap-2 mb-4 justify-center">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="w-6 h-1 rounded bg-yellow-500/50"></div>
        ))}
      </div>

      <div className="controls mb-4">
        <button onClick={() => {}} className="btn-primary rounded-full bg-blue-500 px-4 py-2 text-xs font-black">Bet -</button>
        <span className="text-white/60">Bet: <span className="text-white font-black">50</span></span>
        <button onClick={() => {}} className="btn-primary rounded-full bg-blue-500 px-4 py-2 text-xs font-black">Bet +</button>
        <button onClick={() => {}} className="btn-primary rounded-full bg-emerald-500 px-4 py-2 text-xs font-black">SPIN</button>
        <button onClick={() => {}} className="btn-primary rounded-full bg-purple-500 px-4 py-2 text-xs font-black">AUTO</button>
        <button onClick={() => {}} className="btn-primary rounded-full bg-yellow-500 px-4 py-2 text-xs font-black">TURBO</button>
      </div>

      <div className="balance mb-4 text-center">
        <p className="text-sm text-white/60">Balance</p>
        <p className="text-3xl font-black text-yellow-400">{coinBalance}</p>
      </div>

      {signedIn && (
        <button onClick={onGift} className="w-full rounded-xl bg-rose-500 px-4 py-2 font-black text-white hover:bg-rose-600">
          Gift Draw (x100)
        </button>
      )}
    </div>
  );
}
