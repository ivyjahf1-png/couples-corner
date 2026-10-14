import { RacingEngine } from "./RacingEngine";

export function RacingView() {
  return (
    <div className="racing-view rounded-2xl bg-black/40 p-4 border border-white/10">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-black text-yellow-400">APEX RACING</h3>
        <p className="text-white/60">Need For Speed 3D</p>
      </div>
      <RacingEngine />
    </div>
  );
}
