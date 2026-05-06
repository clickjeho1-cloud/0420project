'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

/* ================= TYPES ================= */

type Sensor = {
  temp: number;
  hum: number;
  lux: number;
  ec: number;
  ppfd: number;
};

/* ================= PAGE ================= */

export default function Page() {

  const mqttRef = useRef<any>(null);

  const [time, setTime] = useState('');
  const [weather, setWeather] = useState({ temp: '--', hum: '--' });

  const [sensor, setSensor] = useState<Sensor>({
    temp: 0,
    hum: 0,
    lux: 0,
    ec: 0,
    ppfd: 0,
  });

  const [history, setHistory] = useState<any[]>([]);

  const [control, setControl] = useState({
    pump: false,
    pump1: false,
    led: false,
  });

  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  /* ================= WEATHER (SEOUL) ================= */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        const data = await res.json();

        setWeather({
          temp: `${data.temperature ?? '--'}°C`,
          hum: `${data.humidity ?? '--'}%`,
        });

      } catch {
        setWeather({ temp: '--', hum: '--' });
      }
    }

    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  /* ================= MOCK + REAL SAFE SENSOR ================= */
  useEffect(() => {
    const t = setInterval(() => {

      const data: Sensor = {
        temp: 20 + Math.random() * 7,
        hum: 40 + Math.random() * 30,
        lux: Math.random() * 50000,
        ec: Math.random() > 0.7 ? 0 : 1.5 + Math.random(),
        ppfd: Math.random() > 0.7 ? 0 : 300 + Math.random() * 400,
      };

      setSensor(data);

      setHistory(prev => [
        ...prev.slice(-60),
        {
          time: new Date().toLocaleTimeString().slice(0, 8),

          temp: data.temp,
          hum: data.hum,
          lux: data.lux,

          ec: data.ec,
          ppfd: data.ppfd,
        },
      ]);

    }, 2000);

    return () => clearInterval(t);
  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof control) => {
    setControl(p => ({ ...p, [key]: !p[key] }));
  };

  /* ================= SAFE DISPLAY ================= */

  const ecDisplay = sensor.ec === 0 ? '0.000' : sensor.ec.toFixed(3);
  const ppfdDisplay = sensor.ppfd === 0 ? '00000' : sensor.ppfd.toFixed(0);

  /* ================= MIN/MAX/AVG ================= */

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const tempList = history.map(h => h.temp);
  const humList = history.map(h => h.hum);
  const luxList = history.map(h => h.lux);

  return (
    <div className="app">

      {/* HEADER */}
      <div className="header">
        <h1>GLOVERA 농장 SMART FARM 대시보드</h1>
        <div>{time}</div>
      </div>

      {/* WEATHER + SENSOR */}
      <div className="top">

        <Card title="기상청 서울" value={`${weather.temp} / ${weather.hum}`} />

        <Card title="TEMP" value={sensor.temp.toFixed(1)} />
        <Card title="HUM" value={sensor.hum.toFixed(1)} />

        <Card title="EC" value={ecDisplay} />
        <Card title="PPFD" value={ppfdDisplay} />

      </div>

      {/* GAUGE + GRAPH CENTER */}
      <div className="center">

        {/* SPEED GAUGE */}
        <div className="gauge">
          <div
            className="needle"
            style={{ transform: `rotate(${sensor.lux / 200}deg)` }}
          />
          <div className="label">LUX GAUGE</div>
        </div>

        {/* GRAPH (3 LINE: MIN AVG MAX) */}
        <div className="graph">

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history}>
              <CartesianGrid stroke="#1f2937" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />

              {/* TEMP */}
              <Area
                dataKey="temp"
                stroke="#ff4d4d"
                fill="#ff4d4d"
                fillOpacity={0.2}
              />

              {/* HUM */}
              <Area
                dataKey="hum"
                stroke="#4dff88"
                fill="#4dff88"
                fillOpacity={0.2}
              />

              {/* LUX */}
              <Area
                dataKey="lux"
                stroke="#4da6ff"
                fill="#4da6ff"
                fillOpacity={0.2}
              />

            </AreaChart>
          </ResponsiveContainer>

        </div>

      </div>

      {/* CONTROL SYSTEM */}
      <div className="control">

        <button onClick={() => toggle('pump')}>
          PUMP {control.pump ? 'ON' : 'OFF'}
        </button>

        <button onClick={() => toggle('pump1')}>
          PUMP1 {control.pump1 ? 'ON' : 'OFF'}
        </button>

        <button onClick={() => toggle('led')}>
          LED {control.led ? 'ON' : 'OFF'}
        </button>

      </div>

      {/* FOOTER */}
      <div className="footer">
        copyright@orginated jhk in 2026
      </div>

      {/* STYLE (PC 2X SCALE) */}
      <style jsx>{`

        .app {
          background: #05070f;
          color: white;
          min-height: 100vh;
          padding: 24px;
          font-size: 20px; /* 🔥 PC 2배 확대 */
        }

        h1 {
          font-size: 32px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
        }

        .top {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-top: 20px;
        }

        .center {
          display: grid;
          grid-template-columns: 1fr 3fr;
          gap: 20px;
          margin-top: 20px;
        }

        .gauge {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 3px solid #1f2937;
          position: relative;
        }

        .needle {
          position: absolute;
          width: 2px;
          height: 90px;
          background: red;
          left: 50%;
          top: 50%;
          transform-origin: bottom;
        }

        .label {
          text-align: center;
          margin-top: 10px;
        }

        .graph {
          background: #0b1220;
          padding: 10px;
          border: 1px solid #1f2937;
        }

        .control {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        button {
          padding: 14px;
          background: #0b1220;
          border: 1px solid #334155;
          color: white;
          font-size: 18px;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          color: #64748b;
        }

      `}</style>

    </div>
  );
}

/* ================= CARD ================= */

function Card({ title, value }: any) {
  return (
    <div style={{
      background: '#0b1220',
      padding: 16,
      border: '1px solid #1f2937'
    }}>
      <div style={{ fontSize: 14 }}>{title}</div>
      <div style={{ fontSize: 22, color: '#22d3ee' }}>{value}</div>
    </div>
  );
}