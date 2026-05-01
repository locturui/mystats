'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HourData { hour: number; totalMs: number; playCount: number; }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: HourData }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const h = d.hour;
  const label = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="font-bold text-spotify-green">{d.playCount.toLocaleString()} plays</p>
    </div>
  );
}

export function HourlyDistribution({ data }: { data: HourData[] }) {
  const max = Math.max(...data.map(d => d.totalMs), 1);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <XAxis dataKey="hour" tickFormatter={(h) => h % 6 === 0 ? (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`) : ''}
          tick={{ fill: '#B3B3B3', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        <Bar dataKey="totalMs" radius={[3, 3, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.hour} fill={d.totalMs === max ? '#1DB954' : 'rgba(255,255,255,0.12)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
