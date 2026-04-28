/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import mqtt, { type MqttClient } from "mqtt";
import { MQTT_TOPIC_HUMI, MQTT_TOPIC_STATUS, MQTT_TOPIC_TEMP } from "@/lib/mqtt-topics";
import { normalizeMqttWsUrl } from "@/lib/env-public";
import { StatusCards } from "@/components/StatusCards";
import { SensorCharts } from "@/components/SensorCharts";
import { PumpLedControls } from "@/components/PumpLedControls";
import type { SensorRow } from "@/lib/types";

type MqttStatus = "설정없음" | "연결 중" | "연결됨" | "끊김";
type HistoryPoint = { time: string; temperature: number; humidity: number };

const SUPABASE_TABLE = "sensor_readings";

const LS_KEYS = {
  mqttWsUrl: "sf.mqtt.wsUrl",
  mqttUser: "sf.mqtt.user",
  mqttPassword: "sf.mqtt.password",
  supabaseUrl: "sf.sb.url",
  supabaseAnon: "sf.sb.anon",
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

function normalizeSupabaseAnonKey(v: string) {
  // 복사/붙여넣기 과정에서 섞이는 공백, 줄바꿈, 따옴표 제거
  return stripQuotesAndTrim(v).replace(/\s+/g, "");
}

function safeReadLS(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function safeWriteLS(key: string, value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const n = toNumber(obj[key]);
    if (n !== null) return n;
  }
  return null;
}

export function Dashboard() {
  const clientRef = useRef<MqttClient | null>(null);
  const tempRef = useRef<number | null>(null);
  const humiRef = useRef<number | null>(null);

  const [showSettings, setShowSettings] = useState(false);

  const [mqttWsUrlInput, setMqttWsUrlInput] = useState("");
  const [mqttUserInput, setMqttUserInput] = useState("");
  const [mqttPasswordInput, setMqttPasswordInput] = useState("");
  const [supabaseUrlInput, setSupabaseUrlInput] = useState("");
  const [supabaseAnonInput, setSupabaseAnonInput] = useState("");

  const [mqttStatus, setMqttStatus] = useState<MqttStatus>("설정없음");
  const [mqttReady, setMqttReady] = useState(false);
  const [mqttError, setMqttError] = useState<string | null>(null);

  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  const [temp, setTemp] = useState<number | null>(null);
  const [humi, setHumi] = useState<number | null>(null);
  const [lastStatus, setLastStatus] = useState<string>("—");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [nowText, setNowText] = useState<string>("");

  const updateTemp = (value: number) => {
    tempRef.current = value;
    setTemp(value);
  };

  const updateHumi = (value: number) => {
    humiRef.current = value;
    setHumi(value);
  };

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
    const envSbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const envSbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

    setMqttWsUrlInput(safeReadLS(LS_KEYS.mqttWsUrl) || envMqttWsUrl);
    setMqttUserInput(safeReadLS(LS_KEYS.mqttUser) || envMqttUser);
    setMqttPasswordInput(safeReadLS(LS_KEYS.mqttPassword) || envMqttPassword);
    setSupabaseUrlInput(safeReadLS(LS_KEYS.supabaseUrl) || envSbUrl);
    setSupabaseAnonInput(safeReadLS(LS_KEYS.supabaseAnon) || envSbAnon);
  }, []);

  const effectiveMqttWsUrl = useMemo(() => {
    const raw = stripQuotesAndTrim(mqttWsUrlInput);
    return normalizeMqttWsUrl(raw) ?? "";
  }, [mqttWsUrlInput]);

  const effectiveSupabaseUrl = useMemo(
    () => stripQuotesAndTrim(supabaseUrlInput),
    [supabaseUrlInput]
  );

  const effectiveSupabaseAnon = useMemo(
    () => normalizeSupabaseAnonKey(supabaseAnonInput),
    [supabaseAnonInput]
  );

  const canConnect = Boolean(effectiveMqttWsUrl);
  const canUseSupabase = Boolean(effectiveSupabaseUrl && effectiveSupabaseAnon);

  const supabase = useMemo(() => {
    if (!canUseSupabase) return null;
    try {
      return createClient(effectiveSupabaseUrl, effectiveSupabaseAnon);
    } catch {
      return null;
    }
  }, [canUseSupabase, effectiveSupabaseUrl, effectiveSupabaseAnon]);

  const loadHistory = async () => {
    if (!supabase) return;
    setSupabaseError(null);

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("created_at,temperature,humidity")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setSupabaseError(error.message);
      return;
    }

    const rows = (data ?? []) as SensorRow[];
    const points = rows
      .slice()
      .reverse()
      .map((r) => ({
        time: r.created_at ? new Date(r.created_at).toLocaleTimeString("ko-KR") : "",
        temperature: r.temperature,
        humidity: r.humidity,
      }));

    setHistory(points);
  };

  useEffect(() => {
    loadHistory();
    const id = setInterval(loadHistory, 10_000);
    return () => clearInterval(id);
  }, [supabase]);

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

    const timeout = setTimeout(() => {
      if (cancelled) return;
      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError("연결 시간 초과 (8초)");
    }, 8000);

    try {
      const maybeModule: any = mqtt as any;
      const connectFn =
        maybeModule?.connect ?? maybeModule?.default?.connect ?? maybeModule;

      if (typeof connectFn !== "function") {
        throw new TypeError("MQTT connect 함수를 찾지 못했습니다.");
      }

      const client = connectFn(wsUrl, {
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
        clearTimeout(timeout);
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
        clearTimeout(timeout);
        setMqttStatus("끊김");
        setMqttReady(false);
        setMqttError(String((err as any)?.message || err));
      });

      client.on("message", async (topic: string, payload: any) => {
        const msg = payload.toString();

        if (topic === MQTT_TOPIC_TEMP) {
          const v = toNumber(msg);
          if (v !== null) updateTemp(v);
        } else if (topic === MQTT_TOPIC_HUMI) {
          const v = toNumber(msg);
          if (v !== null) updateHumi(v);
        } else if (topic === MQTT_TOPIC_STATUS) {
          setLastStatus(msg);
          try {
            const parsed = JSON.parse(msg) as Record<string, unknown>;

            // 아두이노 현재 payload: {"air_temp":27.3,"air_humi":83.0,"ec":208.00,...}
            // 예전 payload나 다른 센서명도 같이 허용
            const tempFromStatus = pickNumber(parsed, [
              "air_temp",
              "temp",
              "temperature",
              "airTemperature",
            ]);
            const humiFromStatus = pickNumber(parsed, [
              "air_humi",
              "humi",
              "humidity",
              "airHumidity",
            ]);

            if (tempFromStatus !== null) updateTemp(tempFromStatus);
            if (humiFromStatus !== null) updateHumi(humiFromStatus);
          } catch {
            // JSON이 아닌 상태 메시지는 최근 상태 카드에만 표시
          }
        }

        const latestTemp = tempRef.current;
        const latestHumi = humiRef.current;

        if (supabase && latestTemp !== null && latestHumi !== null) {
          const { error } = await supabase.from(SUPABASE_TABLE).insert({
            temperature: latestTemp,
            humidity: latestHumi,
          });

          if (error) {
            setSupabaseError(error.message);
          } else {
            setSupabaseError(null);
          }
        }
      });
    } catch (e) {
      clearTimeout(timeout);
      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError(`mqtt 초기화 실패: ${String(e)}`);
    }

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {}
        clientRef.current = null;
      }
    };
  }, [effectiveMqttWsUrl, mqttUserInput, mqttPasswordInput, supabase, canConnect]);

  const saveNow = () => {
    safeWriteLS(LS_KEYS.mqttWsUrl, mqttWsUrlInput);
    safeWriteLS(LS_KEYS.mqttUser, mqttUserInput);
    safeWriteLS(LS_KEYS.mqttPassword, mqttPasswordInput);
    safeWriteLS(LS_KEYS.supabaseUrl, supabaseUrlInput);
    safeWriteLS(LS_KEYS.supabaseAnon, supabaseAnonInput);
  };

  const reset = () => {
    setMqttWsUrlInput("");
    setMqttUserInput("");
    setMqttPasswordInput("");
    setSupabaseUrlInput("");
    setSupabaseAnonInput("");

    safeWriteLS(LS_KEYS.mqttWsUrl, "");
    safeWriteLS(LS_KEYS.mqttUser, "");
    safeWriteLS(LS_KEYS.mqttPassword, "");
    safeWriteLS(LS_KEYS.supabaseUrl, "");
    safeWriteLS(LS_KEYS.supabaseAnon, "");
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
            <a className="sf-icon-btn" href="#sensor">📡 센서</a>
            <a className="sf-icon-btn" href="#db">📈 DB</a>
            <a className="sf-icon-btn" href="#actuator">⚙️ 제어</a>
            <a className="sf-icon-btn" href="#logs">🧾 로그</a>
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
            <h2 className="sf-section-title text-base font-semibold text-white">연결 설정</h2>
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
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">MQTT PASSWORD</label>
              <input
                value={mqttPasswordInput}
                onChange={(e) => setMqttPasswordInput(e.target.value)}
                type="password"
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="********"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Supabase URL</label>
              <input
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="https://xxxx.supabase.co"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-xs text-slate-400">Supabase anon key</label>
              <input
                value={supabaseAnonInput}
                onChange={(e) => setSupabaseAnonInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 outline-none"
                placeholder="eyJhbGciOi..."
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
            <div className="mt-1 text-xs text-rose-200/80">연결 URL: {effectiveMqttWsUrl}</div>
          </section>
        )}

        {supabaseError && (
          <section className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200">
            <div className="sf-section-title font-semibold">Supabase 오류</div>
            <div className="mt-1">{supabaseError}</div>
            <div className="mt-2 text-xs text-amber-200/80">
              anon key는 Supabase Settings → API의 anon public 키를 그대로 복사해야 합니다.
              앞뒤 공백/따옴표/줄바꿈은 자동 제거되지만, 잘린 키나 service_role 키를 넣으면 오류가 납니다.
            </div>
          </section>
        )}
      </div>

      <div id="sensor" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">실시간 센서</h2>
        <StatusCards temp={temp} humi={humi} lastStatus={lastStatus} />
      </div>

      <div id="db" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">DB 그래프</h2>
        <SensorCharts data={history} liveTemp={temp} liveHumi={humi} />
      </div>

      <div id="actuator" className="space-y-3">
        <h2 className="sf-section-title text-base font-semibold text-white">액츄에이터</h2>
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
