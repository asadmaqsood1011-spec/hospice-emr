"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";

type PPSRow = { id: string; recordedAt: Date; score: number };

export function PPSChart({ data }: { data: PPSRow[] }) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.recordedAt), "MMM d"),
    PPS: d.score,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ fontSize: 12 }} />
        <ReferenceLine y={30} stroke="#dc2626" strokeDasharray="3 3" label={{ value: "Imminent", fontSize: 10, fill: "#dc2626" }} />
        <Line type="monotone" dataKey="PPS" stroke="#1e293b" strokeWidth={2} dot />
      </LineChart>
    </ResponsiveContainer>
  );
}
