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

  const clientRef = useRef<MqttClient | null>(null);
  const lastSaveRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setPublicEnvError(null);

    fetch("/api/public-env", { cache: "no-store" })
      .then(async (r) => {
        const json = (await r.json()) as any;
        if (!r.ok || !json?.ok) {
          throw new Error(json?.error || `public-env 실패 (${r.status})`);
        }
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

  const wsUrl = useMemo(() => normalizeMqttWsUrl(env?.mqtt?.wsUrl), [env]);
  const user = env?.mqtt?.user?.trim() || "";
  const pass = env?.mqtt?.password?.trim() || "";
  const missingMqttKeys = env?.mqtt?.missingKeys ?? [];
  const missingSupabaseKeys = env?.supabase?.missingKeys ?? [];

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
    const url = env?.supabase?.url?.trim() || "";
    const anon = env?.supabase?.anonKey?.trim() || "";
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
  }, [env]);

  useEffect(() => {
    if (env) void loadHistory();
  }, [env, loadHistory]);

  const saveSample = useCallback(
    async (t: number, h: number) => {
      const now = Date.now();
      if (now - lastSaveRef.current < 10000) return;
      lastSaveRef.current = now;

      const url = env?.supabase?.url?.trim() || "";
      const anon = env?.supabase?.anonKey?.trim() || "";
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
    [env, loadHistory]
  );

  useEffect(() => {
    if (!wsUrl || !user || !pass) {
      setMqttStatus("설정없음");
      setMqttReady(false);
      return;
    }

    let cancelled = false;

    void import("mqtt").then(({ connect }) => {
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
      client.on("error", (e) => console.error("MQTT", e));

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
      {supabaseError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-4 py-3 text-sm text-rose-100">
          <p className="font-medium text-rose-200">Supabase 오류</p>
          <p className="mt-2 text-rose-100/90">
            {supabaseError}
          </p>
          <p className="mt-2 text-xs text-rose-200/80">
            테이블이 없으면 Supabase SQL Editor에서 <code className="rounded bg-slate-800 px-1">supabase/schema.sql</code> 을 1회 실행해야 합니다.
          </p>
        </div>
      ) : null}

      <StatusCards temp={temp} humi={humi} lastStatus={lastStatus} />

      <SensorCharts data={chartData} liveTemp={temp} liveHumi={humi} />

      <PumpLedControls disabled={!mqttReady} getClient={() => clientRef.current} />
    </div>
  );
}
