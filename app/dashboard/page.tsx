'use client';

import { useEffect, useState } from 'react';

/* ================= TYPES (ESP REAL FORMAT) ================= */

type EspPayload = {
  time: number;
  values: {
    temp: number;
    hum: number;
  };
};

/* ================= PAGE ================= */

export default function DashboardPage() {

  const [time, setTime] = useState('');
  const [esp, setEsp] = useState<EspPayload | null>(null);

  const [weather, setWeather] = useState({
    temp: '--',
    wind: '--',
  });

  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  /* ================= WEATHER (SEOUL ONLY KEEP) ================= */
  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        const data = await res.json();

        setWeather({
          temp: `${data.temperature}°C`,
          wind: `${data.windspeed} km/h`,
        });

      } catch {
        setWeather({
          temp: '--',
          wind: '--',
        });
      }
    }

    loadWeather();
    const t = setInterval(loadWeather, 60000);
    return () => clearInterval(t);
  }, []);

  /* ================= ESP DATA (REAL STRUCTURE ONLY) ================= */
  useEffect(() => {

    const t = setInterval(() => {

      // 🔥 여기 실제 MQTT 붙이면 됨 (현재는 구조 맞추기용)
      const mock: EspPayload = {
        time: Date.now(),
        values: {
          temp: 23.5 + Math.random(),
          hum: 34 + Math.random() * 2,
        },
      };

      setEsp(mock);

    }, 2000);

    return () => clearInterval(t);

  }, []);

  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="top">
        <h1>SMART FARM SCADA (SEOUL)</h1>
        <div>{time}</div>
      </div>

      {/* MAIN GRID */}
      <div className="grid">

        {/* WEATHER */}
        <div className="panel">
          <h3>SEOUL WEATHER</h3>
          <div>Temp: {weather.temp}</div>
          <div>Wind: {weather.wind}</div>
        </div>

        {/* ESP REAL DATA */}
        <div className="panel center">
          <h3>ESP32 LIVE DATA</h3>

          <div className="big">
            TEMP: {esp?.values.temp.toFixed(2) ?? '--'} °C
          </div>

          <div className="big">
            HUM: {esp?.values.hum.toFixed(2) ?? '--'} %
          </div>

        </div>

        {/* STATUS */}
        <div className="panel">
          <h3>STATUS</h3>

          <div className={
            (esp?.values.temp ?? 0) > 25
              ? 'danger'
              : 'ok'
          }>
            TEMP STATUS
          </div>

          <div className={
            (esp?.values.hum ?? 0) < 30
              ? 'warn'
              : 'ok'
          }>
            HUM STATUS
          </div>

        </div>

      </div>

      {/* FOOTER */}
      <div className="footer">
        LIVE ESP32 + SEOUL WEATHER SCADA SYSTEM
      </div>

      {/* STYLE */}
      <style jsx>{`

        .dashboard {
          background: #05070f;
          color: white;
          min-height: 100vh;
          padding: 20px;
          font-family: monospace;
        }

        .top {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
          padding-bottom: 10px;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 12px;
          margin-top: 20px;
        }

        .panel {
          background: #0b1220;
          padding: 16px;
          border-radius: 10px;
          border: 1px solid #1f2937;
        }

        .center {
          text-align: center;
        }

        .big {
          font-size: 24px;
          margin-top: 10px;
          color: #22d3ee;
        }

        .ok { color: #22c55e; }
        .warn { color: #facc15; }
        .danger { color: #ef4444; }

        .footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }

      `}</style>

    </div>
  );
}