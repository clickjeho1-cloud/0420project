"use client";

import type { MqttClient } from "mqtt";

const TOPIC_CONTROL = "smartfarm/control";

type Props = {
  disabled: boolean;
  getClient: () => MqttClient | null;
};

export function PumpLedControls({ disabled, getClient }: Props) {
  const send = (payload: string) => {
    const c = getClient();
    if (!c?.connected) return;
    c.publish(TOPIC_CONTROL, payload, { qos: 0 });
  };

  const btn =
    "rounded-lg px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded-xl border border-slate-700/60 bg-panel p-4 shadow-lg backdrop-blur">
      <h2 className="mb-4 text-lg font-medium text-white">원격 제어 (MQTT 발행)</h2>
      <p className="mb-4 text-xs text-slate-500">
        토픽 <code className="text-slate-400">{TOPIC_CONTROL}</code> — 아두이노 스케치와 동일한
        명령 문자열
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-sm text-slate-400">펌프</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className={`${btn} bg-emerald-600/80 text-white hover:bg-emerald-500`}
              onClick={() => send("PUMP_ON")}
            >
              ON
            </button>
            <button
              type="button"
              disabled={disabled}
              className={`${btn} bg-slate-700 text-white hover:bg-slate-600`}
              onClick={() => send("PUMP_OFF")}
            >
              OFF
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-slate-400">LED</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              className={`${btn} bg-amber-600/80 text-white hover:bg-amber-500`}
              onClick={() => send("LED_ON")}
            >
              ON
            </button>
            <button
              type="button"
              disabled={disabled}
              className={`${btn} bg-slate-700 text-white hover:bg-slate-600`}
              onClick={() => send("LED_OFF")}
            >
              OFF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
