export function DemoBanner() {
  return (
    <div className="fixed top-0 left-1/2 z-40 -translate-x-1/2 flex items-center gap-2 border-b border-amber-500/20 bg-amber-950/50 px-4 py-1.5 text-center text-xs text-amber-300 backdrop-blur-sm">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
      Demo Mode &bull; Conversations, dashboards and AI responses are simulated.
    </div>
  );
}
