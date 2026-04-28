/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mqtt, { type MqttClient } from "mqtt";
import { MQTT_TOPIC_HUMI, MQTT_TOPIC_STATUS, MQTT_TOPIC_TEMP } from "@/lib/mqtt-topics";
import { normalizeMqttWsUrl } from "@/lib/env-public";
import { StatusCards } from "@/components/StatusCards";
import { SensorCharts } from "@/components/SensorCharts";
import { PumpLedControls } from "@/components/PumpLedControls";

type MqttStatus = "설정없음" | "연결 중" | "연결됨" | "끊김";

type HistoryPoint = {
  time: string;
  temperature: number;
  humidity: number;
};

const LS_KEYS = {
  mqttWsUrl: "sf.mqtt.wsUrl",
  mqttUser: "sf.mqtt.user",
  mqttPassword: "sf.mqtt.password",
} as const;

function stripQuotesAndTrim(v: string) {
  const trimmed = v.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function readNumberFromObject(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const raw = obj[key];

    if (typeof raw === "number" && Number.isFinite(raw)) return raw;

    if (typeof raw === "string") {
      const n = Number.parseFloat(raw);
      if (!Number.isNaN(n) && Number.isFinite(n)) return n;
    }
  }

  return null;
}

function clampStatusText(v: string, max = 180) {
  if (v.length <= max) return v;
  return `${v.slice(0, max)}…`;
}

function safeReadLS(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function safeWriteLS(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

export function Dashboard() {
  const clientRef = useRef<MqttClient | null>(null);
  const lastDbSaveAtRef = useRef<number>(0);

  const [showSettings, setShowSettings] = useState(false);

  const [mqttWsUrlInput, setMqttWsUrlInput] = useState("");
  const [mqttUserInput, setMqttUserInput] = useState("");
  const [mqttPasswordInput, setMqttPasswordInput] = useState("");

  const [mqttStatus, setMqttStatus] = useState<MqttStatus>("설정없음");
  const [mqttReady, setMqttReady] = useState(false);
  const [mqttError, setMqttError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  const [temp, setTemp] = useState<number | null>(null);
  const [humi, setHumi] = useState<number | null>(null);
  const [ec, setEc] = useState<number | null>(null);
  const [tdsEst, setTdsEst] = useState<number | null>(null);

  const [lastStatus, setLastStatus] = useState<string>("—");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [nowText, setNowText] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const d = new Date();

      setNowText(
        d.toLocaleString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    tick();

    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const envMqttWsUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL ?? "";
    const envMqttUser = process.env.NEXT_PUBLIC_MQTT_USER ?? "";
    const envMqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD ?? "";

    setMqttWsUrlInput(safeReadLS(LS_KEYS.mqttWsUrl) || envMqttWsUrl);
    setMqttUserInput(safeReadLS(LS_KEYS.mqttUser) || envMqttUser);
    setMqttPasswordInput(safeReadLS(LS_KEYS.mqttPassword) || envMqttPassword);
  }, []);

  const effectiveMqttWsUrl = useMemo(() => {
    const raw = stripQuotesAndTrim(mqttWsUrlInput);
    return normalizeMqttWsUrl(raw) ?? "";
  }, [mqttWsUrlInput]);

  const canConnect = Boolean(effectiveMqttWsUrl);

  const loadHistory = async () => {
    try {
      setDbError(null);

      const res = await fetch("/api/sensors/history", {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "DB 이력 데이터를 불러오지 못했습니다.");
      }

      const points = (json.data ?? []).map((r: any) => ({
        time: r.created_at ? new Date(r.created_at).toLocaleTimeString("ko-KR") : "",
        temperature: Number(r.temperature),
        humidity: Number(r.humidity),
      }));

      setHistory(points);
    } catch (e) {
      setDbError(String((e as any)?.message || e));
    }
  };

  const saveSensorReading = async (temperature: number, humidity: number) => {
    try {
      const now = Date.now();

      if (now - lastDbSaveAtRef.current < 5000) return;
      lastDbSaveAtRef.current = now;

      const res = await fetch("/api/sensors/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature,
          humidity,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "DB 저장 실패");
      }

      setDbError(null);
      loadHistory();
    } catch (e) {
      setDbError(String((e as any)?.message || e));
    }
  };

  useEffect(() => {
    loadHistory();

    const id = window.setInterval(loadHistory, 10_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!canConnect) {
      setMqttStatus("설정없음");
      setMqttReady(false);
      setMqttError(null);
      return;
    }

    const wsUrl = effectiveMqttWsUrl;
    const user = mqttUserInput.trim();
    const pass = mqttPasswordInput.trim();

    let cancelled = false;

    setMqttStatus("연결 중");
    setMqttReady(false);
    setMqttError(null);

    const timeout = window.setTimeout(() => {
      if (cancelled) return;

      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError("연결 시간 초과 (8초)");
    }, 8000);

    try {
      const maybeModule: any = mqtt as any;
      const connectFn = maybeModule?.connect ?? maybeModule?.default?.connect ?? maybeModule;

      if (typeof connectFn !== "function") {
        throw new TypeError("MQTT connect 함수를 찾지 못했습니다.");
      }

      const client: MqttClient = connectFn(wsUrl, {
        ...(user ? { username: user } : {}),
        ...(pass ? { password: pass } : {}),
        clientId: `web-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: 4000,
        connectTimeout: 10_000,
        clean: true,
      });

      clientRef.current = client;

      client.on("connect", () => {
        if (cancelled) return;

        window.clearTimeout(timeout);

        setMqttStatus("연결됨");
        setMqttReady(true);
        setMqttError(null);

        client.subscribe([MQTT_TOPIC_TEMP, MQTT_TOPIC_HUMI, MQTT_TOPIC_STATUS]);
      });

      client.on("reconnect", () => {
        setMqttStatus("연결 중");
        setMqttReady(false);
      });

      client.on("offline", () => {
        setMqttStatus("끊김");
        setMqttReady(false);
      });

      client.on("error", (err: unknown) => {
        window.clearTimeout(timeout);

        setMqttStatus("끊김");
        setMqttReady(false);
        setMqttError(String((err as any)?.message || err));
      });

      client.on("message", async (topic: string, payload: any) => {
        const msg = payload.toString();

        if (topic === MQTT_TOPIC_TEMP) {
          const v = Number.parseFloat(msg);

          if (!Number.isNaN(v) && Number.isFinite(v)) {
            setTemp(v);
          }

          return;
        }

        if (topic === MQTT_TOPIC_HUMI) {
          const v = Number.parseFloat(msg);

          if (!Number.isNaN(v) && Number.isFinite(v)) {
            setHumi(v);
          }

          return;
        }

        if (topic !== MQTT_TOPIC_STATUS) return;

        setLastStatus(clampStatusText(msg));

        try {
          const parsed = JSON.parse(msg) as Record<string, unknown>;

          const tempFromStatus = readNumberFromObject(parsed, [
            "air_temp",
            "temp",
            "temperature",
            "airTemperature",
            "air_temperature",
          ]);

          const humiFromStatus = readNumberFromObject(parsed, [
            "air_humi",
            "humi",
            "humidity",
            "airHumidity",
            "air_humidity",
          ]);

          const ecFromStatus = readNumberFromObject(parsed, [
            "ec",
            "EC",
            "conductivity",
          ]);

          const tdsFromStatus = readNumberFromObject(parsed, [
            "tds_est",
            "tds",
            "TDS",
          ]);

          if (tempFromStatus !== null) {
            setTemp(tempFromStatus);
          }

          if (humiFromStatus !== null) {
            setHumi(humiFromStatus);
          }

          if (ecFromStatus !== null) {
            setEc(ecFromStatus);
          }

          if (tdsFromStatus !== null) {
            setTdsEst(tdsFromStatus);
          }

          if (tempFromStatus !== null && humiFromStatus !== null) {
            await saveSensorReading(tempFromStatus, humiFromStatus);
          }
        } catch {
          // JSON이 아닌 상태 메시지는 최근 상태 텍스트로만 보여줌
        }
      });
    } catch (e) {
      window.clearTimeout(timeout);

      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError(`mqtt 초기화 실패: ${String(e)}`);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);

      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {}

        clientRef.current = null;
      }
    };
  }, [effectiveMqttWsUrl, mqttUserInput, mqttPasswordInput, canConnect]);

  const saveNow = () => {
    safeWriteLS(LS_KEYS.mqttWsUrl, mqttWsUrlInput);
    safeWriteLS(LS_KEYS.mqttUser, mqttUserInput);
    safeWriteLS(LS_KEYS.mqttPassword, mqttPasswordInput);
  };

  const reset = () => {
    setMqttWsUrlInput("");
    setMqttUserInput("");
    setMqttPasswordInput("");

    if (typeof window !== "undefined") {
      Object.values(LS_KEYS).forEach((key) => window.localStorage.removeItem(key));
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-700/60 bg-panel p-5 shadow-lg backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="sf-title text-xl font-extrabold tracking-tight text-white sm:text-2xl">
              스마트팜 대시보드
            </div>
            <div className="mt-1 text-sm text-slate-400">{nowText || "—"}</div>
          </div>

          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <a className="sf-icon-btn" href="#sensor">
              📡 센서
            </a>
            <a className="sf-icon-btn" href="#db">
              📈 DB
            </a>
            <a className="sf-icon-btn" href="#actuator">
              ⚙️ 제어
            </a>
            <a className="sf-icon-btn" href="#logs">
              🧾 로그
            </a>
            <button
              type="button"
              className="sf-icon-btn"
              onClick={() => setShowSettings((v) => !v)}
            >
              ⚙ 설정 {showSettings ? "닫기" : "열기"}
            </button>
          </div>
        </div>
      </section>

      {showSettings && (
        <section className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="sf-section-title text-base font-semibold text-white">
              연결 설정
            </h2>
            <div className="text-xs text-slate-500">저장 후 자동으로 재연결됩니다.</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">MQTT WebSocket URL</label>
              <input
                value={mqttWsUrlInput}
                onChange={(e) => setMqttWsUrlInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="wss://...hivemq.cloud:8884/mqtt"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-400">MQTT USER</label>
              <input
                value={mqttUserInput}
                onChange={(e) => setMqttUserInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="jhk001"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-xs text-slate-400">MQTT PASSWORD</label>
              <input
                value={mqttPasswordInput}
                onChange={(e) => setMqttPasswordInput(e.target.value)}
                type="password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="********"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveNow}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              저장(즉시 적용)
            </button>

            <button
              type="button"
              onClick={reset}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              초기화
            </button>
          </div>
        </section>
      )}

      <div id="logs" className="space-y-3">
        {mqttError && (
          <section className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-4 text-sm text-rose-200">
            <div className="sf-section-title font-semibold">MQTT 오류</div>
            <div className="mt-1">{mqttError}</div>
            <div className="mt-1 text-xs text-rose-200/80">
              연결 URL: {effectiveMqttWsUrl}
            </div>
          </section>
        )}

        {dbError && (
          <section className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200">
            <div className="sf-section-title font-semibold">DB 오류</div>
            <div className="mt-1">{dbError}</div>
          </section>
        )}
      </div>

      <div id="sensor" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">
          실시간 센서
        </h2>

        <StatusCards temp={temp} humi={humi} lastStatus={lastStatus} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-400">EC (실시간)</div>
            <div className="mt-3 text-2xl font-semibold text-cyan-200">
              {ec === null ? "-" : `${ec.toFixed(0)} µS/cm`}
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 p-4">
            <div className="text-xs text-slate-400">TDS 추정 (실시간)</div>
            <div className="mt-3 text-2xl font-semibold text-cyan-200">
              {tdsEst === null ? "-" : `${tdsEst.toFixed(0)} ppm`}
            </div>
          </div>
        </div>
      </div>

      <div id="db" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">
          DB 그래프
        </h2>

        <SensorCharts data={history} liveTemp={temp} liveHumi={humi} />
      </div>

      <div id="actuator" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">
          액츄에이터
        </h2>

        <PumpLedControls
          disabled={!mqttReady}
          getClient={() => clientRef.current}
          lastStatus={lastStatus}
        />
      </div>
    </div>
  );
}

export default Dashboard;
