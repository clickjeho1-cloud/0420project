"use client";

import { useEffect, useRef, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import { StatusCards } from "@/components/StatusCards";
import { SensorCharts } from "@/components/SensorCharts";

const MQTT_URL = "wss://broker.hivemq.com:8884/mqtt";
const TOPIC_STATUS = "smartfarm/jeho123/status";
const TOPIC_CONTROL = "smartfarm/jeho123/control";

export default function Dashboard() {
  const clientRef = useRef<MqttClient | null>(null);

  const [connected, setConnected] = useState(false);
  const [temp, setTemp] = useState<number | null>(null);
  const [humi, setHumi] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [lastStatus, setLastStatus] = useState("");

  // ===== MQTT 연결 =====
  useEffect(() => {
    const client = mqtt.connect(MQTT_URL, {
      clientId: "web_" + Math.random().toString(16).slice(2),
      reconnectPeriod: 3000,
    });

    clientRef.current = client;

    client.on("connect", () => {
      console.log("MQTT 연결됨");
      setConnected(true);
      client.subscribe(TOPIC_STATUS);
    });

    client.on("disconnect", () => {
      setConnected(false);
    });

    client.on("error", (err) => {
      console.log("MQTT 오류:", err.message);
      setConnected(false);
    });

    client.on("message", (topic, payload) => {
      const msg = payload.toString();

      if (topic === TOPIC_STATUS) {
        setLastStatus(msg);

        try {
          const data = JSON.parse(msg);

          const t = Number(data.temp);
          const h = Number(data.humi);

          if (!isNaN(t)) setTemp(t);
          if (!isNaN(h)) setHumi(h);

          // 그래프 저장
          if (!isNaN(t) && !isNaN(h)) {
            setHistory((prev) => [
              ...prev.slice(-29),
              {
                time: new Date().toLocaleTimeString(),
                temperature: t,
                humidity: h,
              },
            ]);
          }

        } catch (e) {
          console.log("JSON 파싱 실패");
        }
      }
    });

    return () => {
      client.end(true);
    };
  }, []);

  // ===== 제어 =====
  const sendControl = (cmd: string) => {
    if (!clientRef.current || !connected) return;
    clientRef.current.publish(TOPIC_CONTROL, cmd);
  };

  return (
    <div className="space-y-6">

      {/* 상태 */}
      <StatusCards
        temp={temp}
        humi={humi}
        lastStatus={connected ? "MQTT 연결됨" : "연결 끊김"}
      />

      {/* 그래프 */}
      <SensorCharts
        data={history}
        liveTemp={temp}
        liveHumi={humi}
      />

      {/* 제어 */}
      <div className="flex gap-2">
        <button onClick={() => sendControl("pump_on")}>펌프 ON</button>
        <button onClick={() => sendControl("pump_off")}>펌프 OFF</button>
        <button onClick={() => sendControl("fan_on")}>팬 ON</button>
        <button onClick={() => sendControl("fan_off")}>팬 OFF</button>
      </div>

    </div>
  );
}
