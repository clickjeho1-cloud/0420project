"use client";

type Props = {
  temp: number | null;
  humi: number | null;
  lastStatus: string;
};

export function StatusCards({ temp, humi, lastStatus }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-slate-400">온도 (실시간)</p>
        <p className="mt-2 text-3xl font-semibold text-sky-300">
          {temp != null ? `${temp.toFixed(2)} °C` : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
        <p className="text-xs uppercase tracking-wide text-slate-400">습도 (실시간)</p>
        <p className="mt-2 text-3xl font-semibold text-cyan-300">
          {humi != null ? `${humi.toFixed(2)} %` : "—"}
        </p>
      </div>
      <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur sm:col-span-1">
        <p className="text-xs uppercase tracking-wide text-slate-400">최근 상태 (MQTT)</p>
        <p className="mt-2 line-clamp-3 text-sm text-slate-200">{lastStatus}</p>
      </div>
    </div>
  );
}
