"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

type ESASRow = {
  id: string;
  recordedAt: Date | string;
  pain: number | null;
  tiredness: number | null;
  nausea: number | null;
  shortBreath: number | null;
  anxiety: number | null;
};

export function ESASChart({ data }: { data: ESASRow[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-slate-500">
        No ESAS scores yet
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: format(new Date(d.recordedAt), "MMM d"),
    Pain: d.pain ?? null,
    Fatigue: d.tiredness ?? null,
    Nausea: d.nausea ?? null,
    SOB: d.shortBreath ?? null,
    Anxiety: d.anxiety ?? null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="Pain" stroke="#dc2626" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="Fatigue" stroke="#7c3aed" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="Nausea" stroke="#059669" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="SOB" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="Anxiety" stroke="#d97706" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
