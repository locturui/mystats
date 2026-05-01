'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MonthData { year: number; month: number; totalMs: number; playCount: number; }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const hours = Math.round(payload[0].value / 3_600_000);
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-sm">
      <p className="text-white/60 mb-1">{label}</p>
      <p className="font-bold text-spotify-green">{hours}h</p>
    </div>
  );
}

export function ListeningTimeline({ data }: { data: MonthData[] }) {
  const chartData = data.map((d) => ({
    label: `${MONTHS[d.month - 1]} ${d.year}`,
    totalMs: d.totalMs,
    playCount: d.playCount,
  }));

  const displayData = chartData;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1DB954" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" tick={{ fill: '#B3B3B3', fontSize: 10 }} tickLine={false} axisLine={false}
          interval={Math.floor(displayData.length / 6)} />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="totalMs" stroke="#1DB954" strokeWidth={2} fill="url(#greenGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
