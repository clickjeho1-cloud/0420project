"use client";

type Props = {
  temp: number | null;
  humi: number | null;
  lastStatus: string;
};

export function StatusCards({ temp, humi, lastStatus }: Props) {
  const tempWarn = temp != null && (temp < 18 || temp > 32);
  const humiWarn = humi != null && (humi < 35 || humi > 80);
  const hasWarn = tempWarn || humiWarn;

  return (
    <div className="space-y-3">
      {hasWarn ? (
        <div className="rounded-xl border border-amber-800/60 bg-amber-950/40 p-3 text-sm text-amber-200">
          경고: {tempWarn ? "온도 임계값 이탈" : ""} {tempWarn && humiWarn ? "/" : ""}{" "}
          {humiWarn ? "습도 임계값 이탈" : ""}
        </div>
      ) : null}
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
    </div>
  );
}
