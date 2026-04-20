"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  time: string;
  temperature: number;
  humidity: number;
};

type Props = {
  data: Point[];
  liveTemp: number | null;
  liveHumi: number | null;
};

export function SensorCharts({ data, liveTemp, liveHumi }: Props) {
  const merged =
    liveTemp != null && liveHumi != null
      ? [
          ...data,
          {
            time: "실시간",
            temperature: liveTemp,
            humidity: liveHumi,
          },
        ]
      : data;

  if (merged.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center text-slate-500">
        Supabase에 저장된 이력이 없습니다. MQTT 수신 후 약 10초마다 기록됩니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
      <h2 className="mb-4 text-lg font-medium text-white">온도 · 습도 추이</h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={merged}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
            <YAxis yAxisId="left" stroke="#7dd3fc" fontSize={11} domain={["auto", "auto"]} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#5eead4"
              fontSize={11}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
              labelStyle={{ color: "#e2e8f0" }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="temperature"
              name="온도 °C"
              stroke="#38bdf8"
              dot={false}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="humidity"
              name="습도 %"
              stroke="#2dd4bf"
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
