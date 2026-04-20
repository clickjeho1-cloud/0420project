"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import { createClient } from "@supabase/supabase-js";
import type { SensorRow } from "@/lib/types";
import {
  normalizeMqttWsUrl,
} from "@/lib/env-public";
import {
  MQTT_TOPIC_HUMI,
  MQTT_TOPIC_STATUS,
  MQTT_TOPIC_TEMP,
} from "@/lib/mqtt-topics";
import { PumpLedControls } from "./PumpLedControls";
import { SensorCharts } from "./SensorCharts";
import { StatusCards } from "./StatusCards";

export function Dashboard() {
  const [mqttStatus, setMqttStatus] = useState<"연결 중" | "연결됨" | "끊김" | "설정없음">(
    "연결 중"
  );
  const [mqttReady, setMqttReady] = useState(false);
  const [mqttError, setMqttError] = useState<string | null>(null);
  const [temp, setTemp] = useState<number | null>(null);
  const [humi, setHumi] = useState<number | null>(null);
  const [lastStatus, setLastStatus] = useState<string>("—");
  const [history, setHistory] = useState<SensorRow[]>([]);
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [publicEnvError, setPublicEnvError] = useState<string | null>(null);

  const [env, setEnv] = useState<{
    mqtt: { wsUrl: string; user: string; password: string; missingKeys: string[] };
    supabase: { url: string; anonKey: string; missingKeys: string[] };
  } | null>(null);
  const [override, setOverride] = useState<{
    mqttWsUrl: string;
    mqttUser: string;
    mqttPassword: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
  } | null>(null);

  const clientRef = useRef<MqttClient | null>(null);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smartfarm_env_override_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      setOverride({
        mqttWsUrl: String(parsed?.mqttWsUrl || ""),
        mqttUser: String(parsed?.mqttUser || ""),
        mqttPassword: String(parsed?.mqttPassword || ""),
        supabaseUrl: String(parsed?.supabaseUrl || ""),
        supabaseAnonKey: String(parsed?.supabaseAnonKey || ""),
      });
    } catch {
      // 무시 (깨진 저장값)
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPublicEnvError(null);

    const url = new URL("/api/public-env", window.location.origin).toString();
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        const ct = r.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          const text = await r.text();
          const head = text.slice(0, 120).replace(/\s+/g, " ");
          throw new Error(`public-env 응답이 JSON이 아닙니다 (${r.status}) - ${head}`);
        }
        const json = (await r.json()) as any;
        if (!r.ok || !json?.ok) throw new Error(json?.error || `public-env 실패 (${r.status})`);
        if (cancelled) return;
        setEnv(json);
      })
      .catch((e) => {
        if (cancelled) return;
        setEnv(null);
        setPublicEnvError(String(e?.message || e));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveMqttWsUrl = (override?.mqttWsUrl || env?.mqtt?.wsUrl || "").trim();
  const effectiveMqttUser = (override?.mqttUser || env?.mqtt?.user || "").trim();
  const effectiveMqttPassword = (override?.mqttPassword || env?.mqtt?.password || "").trim();
  const effectiveSupabaseUrl = (override?.supabaseUrl || env?.supabase?.url || "").trim();
  const effectiveSupabaseAnonRaw = (override?.supabaseAnonKey || env?.supabase?.anonKey || "").trim();
  const effectiveSupabaseAnon = effectiveSupabaseAnonRaw.replace(/\s+/g, "");

  const wsUrl = useMemo(() => normalizeMqttWsUrl(effectiveMqttWsUrl), [effectiveMqttWsUrl]);
  const user = effectiveMqttUser;
  const pass = effectiveMqttPassword;

  const missingMqttKeys =
    !effectiveMqttWsUrl || !effectiveMqttUser || !effectiveMqttPassword
      ? [
          ...(!effectiveMqttWsUrl ? ["NEXT_PUBLIC_MQTT_WS_URL"] : []),
          ...(!effectiveMqttUser ? ["NEXT_PUBLIC_MQTT_USER"] : []),
          ...(!effectiveMqttPassword ? ["NEXT_PUBLIC_MQTT_PASSWORD"] : []),
        ]
      : [];
  const missingSupabaseKeys =
    !effectiveSupabaseUrl || !effectiveSupabaseAnon
      ? [
          ...(!effectiveSupabaseUrl ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
          ...(!effectiveSupabaseAnon ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : []),
        ]
      : [];

  const hasAnyMissing = missingMqttKeys.length > 0 || missingSupabaseKeys.length > 0;

  const usingOverride =
    Boolean(override?.mqttWsUrl?.trim()) ||
    Boolean(override?.mqttUser?.trim()) ||
    Boolean(override?.mqttPassword?.trim()) ||
    Boolean(override?.supabaseUrl?.trim()) ||
    Boolean(override?.supabaseAnonKey?.trim());

  const appliedHint = (
    <div className="rounded-xl border border-slate-700/60 bg-panel px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-slate-200">현재 적용 상태</p>
        <span className="text-xs text-slate-400">
          적용 출처: {usingOverride ? "임시 설정(localStorage)" : "Vercel/.env 런타임(public-env)"}
        </span>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400 md:grid-cols-2">
        <li>
          MQTT URL:{" "}
          <span className="text-slate-200">{wsUrl ? "OK" : "없음"}</span>
        </li>
        <li>
          MQTT USER/PASS:{" "}
          <span className="text-slate-200">{user && pass ? "OK" : "없음"}</span>
        </li>
        <li>
          Supabase URL:{" "}
          <span className="text-slate-200">{effectiveSupabaseUrl ? "OK" : "없음"}</span>
        </li>
        <li>
          Supabase anon key:{" "}
          <span className="text-slate-200">{effectiveSupabaseAnon ? "OK" : "없음"}</span>
        </li>
      </ul>
      {hasAnyMissing ? (
        <p className="mt-2 text-xs text-amber-200/90">
          누락: <span className="font-mono">{[...missingMqttKeys, ...missingSupabaseKeys].join(", ")}</span>
        </p>
      ) : null}
    </div>
  );

  const overridePanel = (
    <div className="rounded-xl border border-slate-700/60 bg-panel px-4 py-4 text-sm">
      <p className="font-medium text-slate-200">임시 설정 입력(로컬 저장)</p>
      <p className="mt-1 text-xs text-slate-400">
        Vercel 환경 변수가 아직 반영되지 않아도, 여기 입력하면 이 브라우저에서 바로 동작합니다. (localStorage 저장)
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-xs text-slate-400">MQTT WebSocket URL</div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder="wss://...:8884/mqtt"
            value={override?.mqttWsUrl ?? ""}
            onChange={(e) =>
              setOverride((p) => ({
                ...(p ?? {
                  mqttWsUrl: "",
                  mqttUser: "",
                  mqttPassword: "",
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                }),
                mqttWsUrl: e.target.value,
              }))
            }
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs text-slate-400">MQTT USER</div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder="(HiveMQ 사용자명)"
            value={override?.mqttUser ?? ""}
            onChange={(e) =>
              setOverride((p) => ({
                ...(p ?? {
                  mqttWsUrl: "",
                  mqttUser: "",
                  mqttPassword: "",
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                }),
                mqttUser: e.target.value,
              }))
            }
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs text-slate-400">MQTT PASSWORD</div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder="(HiveMQ 비밀번호)"
            type="password"
            value={override?.mqttPassword ?? ""}
            onChange={(e) =>
              setOverride((p) => ({
                ...(p ?? {
                  mqttWsUrl: "",
                  mqttUser: "",
                  mqttPassword: "",
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                }),
                mqttPassword: e.target.value,
              }))
            }
          />
        </label>
        <div />
        <label className="space-y-1">
          <div className="text-xs text-slate-400">Supabase URL</div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder="https://xxxxx.supabase.co"
            value={override?.supabaseUrl ?? ""}
            onChange={(e) =>
              setOverride((p) => ({
                ...(p ?? {
                  mqttWsUrl: "",
                  mqttUser: "",
                  mqttPassword: "",
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                }),
                supabaseUrl: e.target.value,
              }))
            }
          />
        </label>
        <label className="space-y-1">
          <div className="text-xs text-slate-400">Supabase anon key</div>
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
            placeholder="eyJhbGciOi..."
            value={override?.supabaseAnonKey ?? ""}
            onChange={(e) =>
              setOverride((p) => ({
                ...(p ?? {
                  mqttWsUrl: "",
                  mqttUser: "",
                  mqttPassword: "",
                  supabaseUrl: "",
                  supabaseAnonKey: "",
                }),
                supabaseAnonKey: e.target.value,
              }))
            }
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          onClick={() => {
            const v = override ?? {
              mqttWsUrl: "",
              mqttUser: "",
              mqttPassword: "",
              supabaseUrl: "",
              supabaseAnonKey: "",
            };
            localStorage.setItem("smartfarm_env_override_v1", JSON.stringify(v));
          }}
        >
          저장(즉시 적용)
        </button>
        <button
          className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60"
          onClick={() => {
            localStorage.removeItem("smartfarm_env_override_v1");
            setOverride(null);
          }}
        >
          초기화
        </button>
      </div>
    </div>
  );

  const envHint =
    publicEnvError || missingMqttKeys.length > 0 || missingSupabaseKeys.length > 0 ? (
      <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        <p className="font-medium text-amber-200">설정 확인</p>
        {publicEnvError ? (
          <p className="mt-2 text-amber-100/90">
            서버 설정 확인 API 호출 실패: <span className="font-mono">{publicEnvError}</span>
          </p>
        ) : (
          <>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100/90">
              {missingMqttKeys.length > 0 && <li>MQTT: {missingMqttKeys.join(", ")}</li>}
              {missingSupabaseKeys.length > 0 && <li>Supabase: {missingSupabaseKeys.join(", ")}</li>}
            </ul>
            <p className="mt-2 text-xs text-amber-200/80">
              Vercel → Project → Settings → Environment Variables 에서 Key 이름을 위와 같이 넣고 값을 설정한 뒤,
              Deployments에서 Redeploy(가능하면 Clear build cache) 하세요.{" "}
              <code className="rounded bg-slate-800 px-1">NEXT_PUBLIC_*</code> 는 배포 빌드 시점에만 클라이언트에 반영됩니다.
            </p>
          </>
        )}
      </div>
    ) : null;

  const loadHistory = useCallback(async () => {
    setSupabaseError(null);
    const url = effectiveSupabaseUrl;
    const anon = effectiveSupabaseAnon;
    if (!url || !anon) {
      setSupabaseOk(false);
      return;
    }
    setSupabaseOk(true);

    const sb = createClient(url, anon);
    const { data, error } = await sb
      .from("sensor_readings")
      .select("created_at,temperature,humidity")
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      console.error(error);
      setSupabaseError(error.message || "Supabase 오류");
      return;
    }
    const rows = (data ?? []).map((r) => ({
      created_at: r.created_at as string,
      temperature: Number(r.temperature),
      humidity: Number(r.humidity),
    }));
    setHistory(rows.reverse());
  }, [effectiveSupabaseAnon, effectiveSupabaseUrl]);

  useEffect(() => {
    if (env) void loadHistory();
  }, [env, loadHistory]);

  const saveSample = useCallback(
    async (t: number, h: number) => {
      const now = Date.now();
      if (now - lastSaveRef.current < 10000) return;
      lastSaveRef.current = now;

      const url = effectiveSupabaseUrl;
      const anon = effectiveSupabaseAnon;
      if (!url || !anon) return;
      const sb = createClient(url, anon);

      const { error } = await sb.from("sensor_readings").insert({
        temperature: t,
        humidity: h,
      });
      if (error) {
        console.error("Supabase insert", error);
        setSupabaseError(error.message || "Supabase insert 오류");
        return;
      }
      void loadHistory();
    },
    [effectiveSupabaseAnon, effectiveSupabaseUrl, loadHistory]
  );

  useEffect(() => {
    if (!wsUrl || !user || !pass) {
      setMqttStatus("설정없음");
      setMqttReady(false);
      setMqttError(null);
      return;
    }

    let cancelled = false;
    setMqttError(null);

    void import("mqtt")
      .then(({ connect }) => {
        if (cancelled) return;

        const client = connect(wsUrl, {
          username: user,
          password: pass,
          clientId: `web-${Math.random().toString(16).slice(2, 10)}`,
          reconnectPeriod: 4000,
        });

        clientRef.current = client;

        client.on("connect", () => {
          if (cancelled) return;
          setMqttStatus("연결됨");
          setMqttReady(true);
          setMqttError(null);
          client.subscribe([MQTT_TOPIC_TEMP, MQTT_TOPIC_HUMI, MQTT_TOPIC_STATUS], (err) => {
            if (err) console.error(err);
          });
        });

        client.on("reconnect", () => {
          setMqttStatus("연결 중");
          setMqttReady(false);
        });
        client.on("offline", () => {
          setMqttStatus("끊김");
          setMqttReady(false);
        });
        client.on("error", (e) => {
          console.error("MQTT", e);
          setMqttStatus("끊김");
          setMqttReady(false);
          setMqttError(String((e as any)?.message || e));
        });

        client.on("message", (topic, payload) => {
          const msg = payload.toString();
          if (topic === MQTT_TOPIC_TEMP) {
            const v = parseFloat(msg);
            if (!Number.isNaN(v)) setTemp(v);
          } else if (topic === MQTT_TOPIC_HUMI) {
            const v = parseFloat(msg);
            if (!Number.isNaN(v)) setHumi(v);
          } else if (topic === MQTT_TOPIC_STATUS) {
            setLastStatus(msg);
          }
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setMqttStatus("끊김");
        setMqttReady(false);
        setMqttError(`mqtt 모듈 로드 실패: ${String((e as any)?.message || e)}`);
      });

    return () => {
      cancelled = true;
      setMqttReady(false);
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {
          /* ignore */
        }
        clientRef.current = null;
      }
    };
  }, [wsUrl, user, pass]);

  useEffect(() => {
    if (temp != null && humi != null) {
      void saveSample(temp, humi);
    }
  }, [temp, humi, saveSample]);

  const chartData = useMemo(() => {
    return history.map((r) => ({
      time: r.created_at
        ? new Date(r.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "",
      temperature: r.temperature,
      humidity: r.humidity,
    }));
  }, [history]);

  return (
    <div className="space-y-6">
      {envHint}
      {appliedHint}
      {overridePanel}
      {wsUrl && /:8883(\/|$)/.test(wsUrl) ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium text-amber-200">MQTT WebSocket 포트 확인</p>
          <p className="mt-2 text-amber-100/90">
            현재 URL에 <code className="rounded bg-slate-800 px-1">:8883</code> 이 보입니다. 아두이노(TLS)는 8883이지만,
            웹 대시보드는 보통 <code className="rounded bg-slate-800 px-1">wss://...:8884/mqtt</code> (WebSocket) 를 사용합니다.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-panel px-4 py-3 text-sm">
        <div>
          <span className="text-slate-400">MQTT </span>
          <span
            className={
              mqttStatus === "연결됨"
                ? "text-emerald-400"
                : mqttStatus === "끊김"
                  ? "text-rose-400"
                  : "text-amber-300"
            }
          >
            {mqttStatus}
          </span>
        </div>
        <div>
          <span className="text-slate-400">Supabase </span>
          <span className={supabaseOk ? "text-emerald-400" : "text-rose-400"}>
            {supabaseOk === null ? "확인 중" : supabaseOk ? "연동됨" : ".env 미설정"}
          </span>
        </div>
      </div>
      {mqttError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium text-rose-200">MQTT 오류</p>
          <p className="mt-2 text-rose-100/90">{mqttError}</p>
          <p className="mt-2 text-xs text-rose-200/80">
            연결 URL: <code className="rounded bg-slate-800 px-1">{wsUrl}</code>
          </p>
        </div>
      ) : null}
      {supabaseError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium text-rose-200">Supabase 오류</p>
          <p className="mt-2 text-rose-100/90">
            {supabaseError}
          </p>
          {supabaseError.toLowerCase().includes("invalid api key") ? (
            <p className="mt-2 text-xs text-rose-200/80">
              <b>API 키가 잘못되었습니다.</b> Supabase Settings → API 의 <code className="rounded bg-slate-800 px-1">anon public</code>{" "}
              키를 그대로 복사해 넣었는지(앞뒤 공백/따옴표 포함 여부)와 <code className="rounded bg-slate-800 px-1">Supabase URL</code> 이 프로젝트와 일치하는지 확인하세요.
            </p>
          ) : (
            <p className="mt-2 text-xs text-rose-200/80">
              테이블이 없으면 Supabase SQL Editor에서 <code className="rounded bg-slate-800 px-1">supabase/schema.sql</code> 을 1회 실행해야 합니다.
            </p>
          )}
        </div>
      ) : null}

      <StatusCards temp={temp} humi={humi} lastStatus={lastStatus} />

      <SensorCharts data={chartData} liveTemp={temp} liveHumi={humi} />

      <PumpLedControls disabled={!mqttReady} getClient={() => clientRef.current} />
    </div>
  );
}
