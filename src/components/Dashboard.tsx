"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MqttClient } from "mqtt";
import { getSupabaseBrowser } from "@/lib/supabase-client";
import type { SensorRow } from "@/lib/types";
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

  const clientRef = useRef<MqttClient | null>(null);
  const lastSaveRef = useRef(0);

  const wsUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL;
  const user = process.env.NEXT_PUBLIC_MQTT_USER;
  const pass = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

  const loadHistory = useCallback(async () => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      setSupabaseOk(false);
      return;
    }
    setSupabaseOk(true);
    const { data, error } = await sb
      .from("sensor_readings")
      .select("created_at,temperature,humidity")
      .order("created_at", { ascending: false })
      .limit(120);

    if (error) {
      console.error(error);
      return;
    }
    const rows = (data ?? []).map((r) => ({
      created_at: r.created_at as string,
      temperature: Number(r.temperature),
      humidity: Number(r.humidity),
    }));
    setHistory(rows.reverse());
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const saveSample = useCallback(
    async (t: number, h: number) => {
      const now = Date.now();
      if (now - lastSaveRef.current < 10000) return;
      lastSaveRef.current = now;

      const sb = getSupabaseBrowser();
      if (!sb) return;

      const { error } = await sb.from("sensor_readings").insert({
        temperature: t,
        humidity: h,
      });
      if (error) {
        console.error("Supabase insert", error);
        return;
      }
      void loadHistory();
    },
    [loadHistory]
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

      <StatusCards temp={temp} humi={humi} lastStatus={lastStatus} />

      <SensorCharts data={chartData} liveTemp={temp} liveHumi={humi} />

      <PumpLedControls disabled={!mqttReady} getClient={() => clientRef.current} />
    </div>
  );
}
