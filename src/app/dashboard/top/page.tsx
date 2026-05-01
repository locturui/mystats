'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { AllStats } from '@/lib/stats';
import { TopArtistsChart } from '@/components/dashboard/TopArtistsChart';
import { TopTracksList } from '@/components/dashboard/TopTracksList';
import { TopAlbumsList } from '@/components/dashboard/TopAlbumsList';
import { DateRangePicker, DateRange } from '@/components/ui/DateRangePicker';

type Tab = 'artists' | 'tracks' | 'albums';
type PresetId = '7d' | '30d' | '3m' | '6m' | '1y' | 'all' | 'custom';

const PRESETS: { id: PresetId; label: string; days?: number }[] = [
  { id: '7d',  label: '7d',  days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '3m',  label: '3m',  days: 90 },
  { id: '6m',  label: '6m',  days: 180 },
  { id: '1y',  label: '1y',  days: 365 },
  { id: 'all', label: 'All' },
];

function presetToRange(preset: PresetId, days?: number): { startDate?: string; endDate?: string } {
  if (preset === 'all' || preset === 'custom') return {};
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days ?? 0));
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function TopPage() {
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('artists');
  const [preset, setPreset] = useState<PresetId>('all');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);

  const buildUrl = useCallback(() => {
    if (preset === 'custom' && customRange) {
      const p = new URLSearchParams({
        startDate: customRange.start.toISOString(),
        endDate: customRange.end.toISOString(),
      });
      return `/api/stats?${p}`;
    }
    const p = PRESETS.find((x) => x.id === preset);
    if (p?.days) {
      const { startDate, endDate } = presetToRange(preset, p.days);
      return `/api/stats?startDate=${startDate}&endDate=${endDate}`;
    }
    return '/api/stats';
  }, [preset, customRange]);

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setStats(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [buildUrl]);

  const customTrigger = (
    <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
      preset === 'custom'
        ? 'bg-spotify-green text-black font-bold'
        : 'text-white/50 hover:text-white hover:bg-white/8'
    }`}>
      <Calendar size={13} />
      {preset === 'custom' && customRange
        ? `${fmtDate(customRange.start)} – ${fmtDate(customRange.end)}`
        : 'Custom'}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-5">Top</h1>

      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              preset === p.id
                ? 'bg-spotify-green text-black font-bold'
                : 'text-white/50 hover:text-white hover:bg-white/8'
            }`}
          >
            {p.label}
          </button>
        ))}
        <DateRangePicker
          value={customRange}
          onChange={(r) => { setCustomRange(r); setPreset('custom'); }}
          trigger={customTrigger}
        />
      </div>

      <div className="flex border-b border-white/10 mb-5">
        {(['artists', 'tracks', 'albums'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-spotify-green text-spotify-green'
                : 'border-transparent text-white/40 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          {tab === 'artists' && <TopArtistsChart data={stats.topArtists} />}
          {tab === 'tracks' && <TopTracksList data={stats.topTracks} />}
          {tab === 'albums' && <TopAlbumsList data={stats.topAlbums} />}
        </>
      ) : (
        <p className="text-center text-white/40 py-24">Failed to load stats.</p>
      )}
    </div>
  );
}
