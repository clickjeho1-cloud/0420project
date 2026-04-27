"use client";

import { useEffect, useMemo, useState } from "react";
import type { MqttClient } from "mqtt";
import { MQTT_TOPIC_CONTROL } from "@/lib/mqtt-topics";

type Props = {
  disabled: boolean;
  getClient: () => MqttClient | null;
  lastStatus: string;
};

export function PumpLedControls({ disabled, getClient, lastStatus }: Props) {
  // ✅ 상태 유지 (UI용)
  const [pump, setPump] = useState(false);
  const [led, setLed] = useState(false);
  const [fan, setFan] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const parsedStatus = useMemo(() => {
    try {
      const s = JSON.parse(lastStatus) as Record<string, unknown>;
      return s;
    } catch {
      return null;
    }
  }, [lastStatus]);

  useEffect(() => {
    if (!parsedStatus) return;
    if (typeof parsedStatus.pump === "boolean") setPump(parsedStatus.pump);
    if (typeof parsedStatus.led === "boolean") setLed(parsedStatus.led);
    if (typeof parsedStatus.fan === "boolean") setFan(parsedStatus.fan);
  }, [parsedStatus]);

  // ✅ MQTT 발행
  const send = (payload: string) => {
    const c = getClient();
    if (!c?.connected) {
      setWarning("MQTT 연결이 끊겨 제어 명령을 보낼 수 없습니다.");
      return;
    }

    setWarning(null);
    c.publish(MQTT_TOPIC_CONTROL, payload, { qos: 0 });
  };

  const btn =
    "rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
      <h2 className="mb-4 text-lg font-medium text-white">
        원격 제어 (MQTT 발행)
      </h2>

      <p className="mb-4 text-xs text-slate-500">
        토픽{" "}
        <code className="text-slate-400">{MQTT_TOPIC_CONTROL}</code>
      </p>

      {warning ? (
        <div className="mb-4 rounded-lg border border-amber-800/70 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
          {warning}
        </div>
      ) : null}

      <div className="mb-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-xs text-slate-300">
        명령어: <code>pump_on/off</code>, <code>led_on/off</code>, <code>fan_on/off</code>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* ================= 펌프 ================= */}
        <div>
          <p className="mb-2 text-sm text-slate-400">펌프</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                pump
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-600/70 text-white hover:bg-emerald-500"
              }`}
              onClick={() => {
                setPump(true);
                send("pump_on");
              }}
            >
              ON
            </button>

            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                !pump
                  ? "bg-slate-700 text-white"
                  : "bg-slate-600 text-white hover:bg-slate-500"
              }`}
              onClick={() => {
                setPump(false);
                send("pump_off");
              }}
            >
              OFF
            </button>
          </div>

          {/* 상태 표시 */}
          <p className="mt-2 text-xs text-slate-500">
            상태:{" "}
            <span className={pump ? "text-emerald-400" : "text-slate-400"}>
              {pump ? "ON" : "OFF"}
            </span>
          </p>
        </div>

        {/* ================= LED ================= */}
        <div>
          <p className="mb-2 text-sm text-slate-400">LED</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                led
                  ? "bg-amber-500 text-white"
                  : "bg-amber-600/80 text-white hover:bg-amber-500"
              }`}
              onClick={() => {
                setLed(true);
                send("led_on");
              }}
            >
              ON
            </button>

            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                !led
                  ? "bg-slate-700 text-white"
                  : "bg-slate-600 text-white hover:bg-slate-500"
              }`}
              onClick={() => {
                setLed(false);
                send("led_off");
              }}
            >
              OFF
            </button>
          </div>

          {/* 상태 표시 */}
          <p className="mt-2 text-xs text-slate-500">
            상태:{" "}
            <span className={led ? "text-amber-400" : "text-slate-400"}>
              {led ? "ON" : "OFF"}
            </span>
          </p>
        </div>

        {/* ================= FAN ================= */}
        <div>
          <p className="mb-2 text-sm text-slate-400">팬</p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                fan
                  ? "bg-sky-600 text-white"
                  : "bg-sky-600/80 text-white hover:bg-sky-500"
              }`}
              onClick={() => {
                setFan(true);
                send("fan_on");
              }}
            >
              ON
            </button>

            <button
              type="button"
              disabled={disabled}
              className={`${btn} ${
                !fan
                  ? "bg-slate-700 text-white"
                  : "bg-slate-600 text-white hover:bg-slate-500"
              }`}
              onClick={() => {
                setFan(false);
                send("fan_off");
              }}
            >
              OFF
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            상태:{" "}
            <span className={fan ? "text-sky-400" : "text-slate-400"}>
              {fan ? "ON" : "OFF"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
