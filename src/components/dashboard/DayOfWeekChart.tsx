'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DowData { dow: number; label: string; totalMs: number; playCount: number; }

export function DayOfWeekChart({ data }: { data: DowData[] }) {
  const max = Math.max(...data.map(d => d.totalMs), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="label" tick={{ fill: '#B3B3B3', fontSize: 12 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(value: number) => [`${Math.round(value / 3_600_000)}h`, 'Time']}
          contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
          labelStyle={{ color: '#B3B3B3' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey="totalMs" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.dow} fill={d.totalMs === max ? '#1DB954' : 'rgba(255,255,255,0.12)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
