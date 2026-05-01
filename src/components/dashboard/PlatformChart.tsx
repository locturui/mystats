'use client';

interface PlatformData { platform: string; totalMs: number; playCount: number; }

const COLORS = ['#1DB954', '#4776E6', '#FF416C', '#F7971E', '#8E54E9', '#4ECDC4', '#FFE66D'];

function msToHm(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function PlatformChart({ data }: { data: PlatformData[] }) {
  const top = data.slice(0, 7);
  const max = top[0]?.totalMs ?? 1;

  if (top.length === 0) return <p className="text-white/30 text-sm text-center py-8">No data</p>;

  return (
    <div className="space-y-3">
      {top.map((d, i) => (
        <div key={d.platform}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-sm font-medium text-white/80">{d.platform}</span>
            </div>
            <span className="text-xs text-white/40">{msToHm(d.totalMs)}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(d.totalMs / max) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
