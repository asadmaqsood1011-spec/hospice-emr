"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";

type ESASRow = {
  id: string;
  recordedAt: Date;
  pain: number;
  tiredness: number;
  nausea: number;
  shortBreath: number;
  anxiety: number;
};

export function ESASChart({ data }: { data: ESASRow[] }) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.recordedAt), "MMM d"),
    Pain: d.pain,
    Fatigue: d.tiredness,
    Nausea: d.nausea,
    SOB: d.shortBreath,
    Anxiety: d.anxiety,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="Pain" stroke="#dc2626" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Fatigue" stroke="#7c3aed" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Nausea" stroke="#059669" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="SOB" stroke="#2563eb" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="Anxiety" stroke="#d97706" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
