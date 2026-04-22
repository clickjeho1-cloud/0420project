"use client";

import { useState } from "react";
import type { MqttClient } from "mqtt";
import { MQTT_TOPIC_CONTROL } from "@/lib/mqtt-topics";

type Props = {
  disabled: boolean;
  getClient: () => MqttClient | null;
};

export function PumpLedControls({ disabled, getClient }: Props) {
  // ✅ 상태 유지 (UI용)
  const [pump, setPump] = useState(false);
  const [led, setLed] = useState(false);

  // ✅ MQTT 발행
  const send = (payload: string) => {
    const c = getClient();
    if (!c?.connected) {
      alert("MQTT 연결 안됨");
      return;
    }

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

      <div className="grid gap-4 sm:grid-cols-2">
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
                send("PUMP_ON");
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
                send("PUMP_OFF");
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
                send("LED_ON");
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
                send("LED_OFF");
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
      </div>
    </div>
  );
}
