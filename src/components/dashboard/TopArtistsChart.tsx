'use client';

import { useImages } from '@/hooks/useImages';

interface Artist { artistName: string; totalMs: number; playCount: number; }

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const AVATAR_COLORS = ['#1DB954','#4776E6','#FF416C','#F7971E','#8E54E9','#4ECDC4','#E96C4E','#54C5E8'];

function msToHm(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function TopArtistsChart({ data }: { data: Artist[] }) {
  const top = data.slice(0, 15);
  const max = top[0]?.totalMs ?? 1;
  const images = useImages(top.map((a) => `artist:${a.artistName.toLowerCase()}`));

  return (
    <div className="space-y-1">
      {top.map((a, i) => {
        const pct = (a.totalMs / max) * 100;
        const rankColor = RANK_COLORS[i] ?? 'rgba(255,255,255,0.25)';
        const avatarColor = AVATAR_COLORS[i % AVATAR_COLORS.length];
        const initial = a.artistName.charAt(0).toUpperCase();
        return (
          <div key={a.artistName} className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl overflow-hidden group hover:bg-white/5 transition-colors">
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="h-full bg-white/5 transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="relative w-6 text-sm font-bold text-right shrink-0" style={{ color: rankColor }}>
              {i + 1}
            </span>
            {images.get(`artist:${a.artistName.toLowerCase()}`) ? (
              <img src={images.get(`artist:${a.artistName.toLowerCase()}`)!} alt={a.artistName} className="relative w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0" style={{ backgroundColor: avatarColor }}>
                {initial}
              </div>
            )}
            <div className="relative flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{a.artistName}</p>
              <p className="text-xs text-white/40 mt-0.5">{a.playCount.toLocaleString()} streams</p>
            </div>
            <div className="relative text-right shrink-0">
              <p className="text-xs font-medium text-white/70">{msToHm(a.totalMs)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
