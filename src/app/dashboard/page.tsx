'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart2, TrendingUp, ChevronRight } from 'lucide-react';
import { AllStats } from '@/lib/stats';
import { useImages } from '@/hooks/useImages';

const CACHE_TTL = 5 * 60 * 1000;
function getCached(key: string): AllStats | null {
  try {
    const d = localStorage.getItem(`stats_${key}`);
    const t = localStorage.getItem(`stats_${key}_t`);
    if (d && t && Date.now() - +t < CACHE_TTL) return JSON.parse(d);
  } catch {}
  return null;
}
function setCache(key: string, data: AllStats) {
  try {
    localStorage.setItem(`stats_${key}`, JSON.stringify(data));
    localStorage.setItem(`stats_${key}_t`, String(Date.now()));
  } catch {}
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewPage() {
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [username, setUsername] = useState('');

  const artistKeys = (stats?.topArtists ?? []).slice(0, 8).map((a) => `artist:${a.artistName.toLowerCase()}`);
  const trackKeys = (stats?.topTracks ?? []).slice(0, 5).map((t) => `track:${t.artistName.toLowerCase()}:${t.trackName.toLowerCase()}`);
  const artistImages = useImages(artistKeys);
  const trackImages = useImages(trackKeys);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) setUsername(d.user.username);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const cacheKey = year ?? 'all';
    const cached = getCached(String(cacheKey));
    if (cached) { setStats(cached); setLoading(false); return; }
    setLoading(true);
    const url = year ? `/api/stats?year=${year}` : '/api/stats';
    fetch(url)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setCache(String(cacheKey), d); setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year]);

  const statCards = stats ? [
    { label: 'minutes streamed', value: Math.round(stats.overview.totalMs / 60000).toLocaleString() },
    { label: 'streams', value: stats.overview.totalPlays.toLocaleString() },
    { label: 'different artists', value: stats.overview.uniqueArtists.toLocaleString() },
    { label: 'different tracks', value: stats.overview.uniqueTracks.toLocaleString() },
  ] : [];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-8 pb-6 space-y-8">

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/40 mb-1">{greeting()}</p>
          <h1 className="text-2xl font-bold">{username || '…'}</h1>
        </div>
        {stats && (
          <select
            value={year ?? ''}
            onChange={e => setYear(e.target.value ? parseInt(e.target.value) : undefined)}
            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-spotify-green transition-colors cursor-pointer"
          >
            <option value="">All time</option>
            {stats.availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(({ label, value }) => (
              <div key={label} className="bg-white/3 border border-white/5 rounded-2xl px-4 py-4">
                <p className="text-2xl font-bold text-spotify-green">{value}</p>
                <p className="text-sm text-white/40 mt-1">{label}</p>
              </div>
            ))}
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Top Artists</h2>
              <Link href="/dashboard/top" className="text-xs text-white/40 hover:text-white flex items-center gap-0.5 transition-colors">
                See all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="flex gap-5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
              {stats.topArtists.slice(0, 8).map((a) => (
                <div key={a.artistName} className="shrink-0 flex flex-col items-center gap-2 w-[68px]">
                  {artistImages.get(`artist:${a.artistName.toLowerCase()}`) ? (
                    <img src={artistImages.get(`artist:${a.artistName.toLowerCase()}`)!} alt={a.artistName} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-white/8 flex items-center justify-center text-xl font-bold text-white/50">
                      {a.artistName.charAt(0)}
                    </div>
                  )}
                  <p className="text-[11px] text-center text-white/55 leading-tight line-clamp-2">{a.artistName}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Top Tracks</h2>
              <Link href="/dashboard/top" className="text-xs text-white/40 hover:text-white flex items-center gap-0.5 transition-colors">
                See all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-0.5">
              {stats.topTracks.slice(0, 5).map((t, i) => (
                <div key={t.trackUri} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/4 transition-colors">
                  <span className="w-5 text-xs text-white/25 text-right shrink-0">{i + 1}</span>
                  {trackImages.get(`track:${t.artistName.toLowerCase()}:${t.trackName.toLowerCase()}`) ? (
                    <img src={trackImages.get(`track:${t.artistName.toLowerCase()}:${t.trackName.toLowerCase()}`)!} alt={t.trackName} className="w-9 h-9 rounded-md object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-md bg-white/8 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.trackName}</p>
                    <p className="text-xs text-white/40 truncate">{t.artistName}</p>
                  </div>
                  <span className="text-xs text-white/25 shrink-0">{t.playCount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/top" className="bg-white/3 border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition-colors">
              <BarChart2 size={20} className="text-spotify-green mb-3" />
              <p className="font-semibold text-sm">Top Lists</p>
              <p className="text-xs text-white/35 mt-1">Artists, tracks & albums</p>
            </Link>
            <Link href="/dashboard/stats" className="bg-white/3 border border-white/5 rounded-2xl p-4 hover:bg-white/5 transition-colors">
              <TrendingUp size={20} className="text-spotify-green mb-3" />
              <p className="font-semibold text-sm">Charts</p>
              <p className="text-xs text-white/35 mt-1">Timeline, habits & more</p>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
