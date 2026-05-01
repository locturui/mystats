'use client';

import { useState, useEffect } from 'react';
import { AllStats } from '@/lib/stats';

import { ListeningTimeline } from '@/components/dashboard/ListeningTimeline';
import { HourlyDistribution } from '@/components/dashboard/HourlyDistribution';
import { DayOfWeekChart } from '@/components/dashboard/DayOfWeekChart';
import { PlatformChart } from '@/components/dashboard/PlatformChart';
import { HeatmapCalendar } from '@/components/dashboard/HeatmapCalendar';

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

function YearSelect({ years, value, onChange }: {
  years: number[];
  value: number | undefined;
  onChange: (y: number | undefined) => void;
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
      className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-spotify-green transition-colors cursor-pointer"
    >
      <option value="">All time</option>
      {years.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white/3 border border-white/5 rounded-2xl p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<AllStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [heatmapYear, setHeatmapYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    const cacheKey = String(year ?? 'all');
    const cached = getCached(cacheKey);
    if (cached) {
      setStats(cached);
      if (!year && cached.availableYears?.length) setHeatmapYear(cached.availableYears[cached.availableYears.length - 1]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const url = year ? `/api/stats?year=${year}` : '/api/stats';
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        setCache(cacheKey, d);
        setStats(d);
        if (!year && d.availableYears?.length) setHeatmapYear(d.availableYears[d.availableYears.length - 1]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [year]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Charts</h1>
        {stats && (
          <YearSelect years={stats.availableYears} value={year} onChange={setYear} />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          <Card title="Listening Timeline">
            <ListeningTimeline data={stats.monthlyData} />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Card title="By Hour">
              <HourlyDistribution data={stats.hourlyData} />
            </Card>
            <Card title="Day of Week">
              <DayOfWeekChart data={stats.dowData} />
            </Card>
          </div>

          <Card title="By Platform">
            <PlatformChart data={stats.platformData} />
          </Card>

          <section className="hidden sm:block bg-white/3 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Listening Heatmap</h2>
              {!year && (() => {
                const years = stats.availableYears;
                const idx = heatmapYear ? years.indexOf(heatmapYear) : years.length - 1;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHeatmapYear(years[idx - 1])}
                      disabled={idx <= 0}
                      className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >‹</button>
                    <span className="text-sm font-semibold w-10 text-center">{years[idx]}</span>
                    <button
                      onClick={() => setHeatmapYear(years[idx + 1])}
                      disabled={idx >= years.length - 1}
                      className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    >›</button>
                  </div>
                );
              })()}
            </div>
            <HeatmapCalendar data={stats.heatmapData} year={year ?? heatmapYear} />
          </section>
        </>
      ) : (
        <p className="text-center text-white/40 py-24">Failed to load stats.</p>
      )}
    </div>
  );
}
