'use client';

import { useMemo } from 'react';

interface DayData { date: string; totalMs: number; playCount: number; }

function getColor(ms: number, max: number): string {
  if (ms === 0) return 'bg-white/5';
  const ratio = ms / max;
  if (ratio < 0.15) return 'bg-spotify-green/20';
  if (ratio < 0.35) return 'bg-spotify-green/40';
  if (ratio < 0.60) return 'bg-spotify-green/60';
  if (ratio < 0.80) return 'bg-spotify-green/80';
  return 'bg-spotify-green';
}

export function HeatmapCalendar({ data, year }: { data: DayData[]; year?: number }) {
  const { weeks, months } = useMemo(() => {
    const validData = data.filter(d => d.date != null);
    const dataMap = new Map(validData.map(d => [d.date, d]));
    const max = Math.max(...validData.map(d => d.totalMs), 1);

    const lastDate = validData[validData.length - 1]?.date;
    const targetYear = year ?? (lastDate ? parseInt(lastDate.slice(0, 4)) : new Date().getFullYear());
    const start = new Date(`${targetYear}-01-01`);
    const end = new Date(`${targetYear}-12-31`);

    const days: { date: string; ms: number; count: number; color: string }[] = [];
    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().slice(0, 10);
      const d = dataMap.get(dateStr);
      days.push({ date: dateStr, ms: d?.totalMs ?? 0, count: d?.playCount ?? 0, color: getColor(d?.totalMs ?? 0, max) });
      cur.setDate(cur.getDate() + 1);
    }

    const startDow = start.getDay();
    const padded = Array(startDow).fill(null).concat(days);
    const weeksArr: (typeof days[0] | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      weeksArr.push(padded.slice(i, i + 7));
    }

    const monthLabels: { label: string; col: number }[] = [];
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let lastMonth = -1;
    weeksArr.forEach((week, wi) => {
      week.forEach(day => {
        if (day) {
          const m = new Date(day.date).getMonth();
          if (m !== lastMonth) { monthLabels.push({ label: MONTHS[m], col: wi }); lastMonth = m; }
        }
      });
    });

    return { weeks: weeksArr, months: monthLabels, max };
  }, [data, year]);

  const DOW = ['S','M','T','W','T','F','S'];
  const monthMap = new Map(months.map(m => [m.col, m.label]));

  return (
    <div className="w-full space-y-2">
      <div
        className="w-full grid gap-0.5"
        style={{ gridTemplateColumns: `18px repeat(${weeks.length}, 1fr)` }}
      >
        <div />
        {weeks.map((_, wi) => (
          <div key={wi} className="text-[10px] text-white/30 truncate leading-tight pb-0.5">
            {monthMap.get(wi) ?? ''}
          </div>
        ))}

        {Array.from({ length: 7 }, (_, di) => (
          <div key={di} style={{ display: 'contents' }}>
            <div className="text-[9px] text-white/30 flex items-center justify-end pr-0.5 leading-none">
              {di % 2 === 1 ? DOW[di] : ''}
            </div>
            {weeks.map((week, wi) => {
              const day = week[di];
              if (!day) return <div key={wi} className="aspect-square" />;
              return (
                <div key={wi}
                  title={`${day.date}: ${day.count} plays`}
                  className={`aspect-square rounded-[2px] ${day.color} cursor-default hover:opacity-75 transition-opacity`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 justify-end">
        <span className="text-[10px] text-white/30">Less</span>
        {['bg-white/5','bg-spotify-green/20','bg-spotify-green/40','bg-spotify-green/70','bg-spotify-green'].map((c) => (
          <div key={c} className={`w-2.5 h-2.5 rounded-[2px] ${c}`} />
        ))}
        <span className="text-[10px] text-white/30">More</span>
      </div>
    </div>
  );
}
