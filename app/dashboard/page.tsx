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
  LineChart,
  Line,
} from 'recharts';

/* ================= TYPES ================= */

type Sensor = {
  temp: number;
  hum: number;
  lux: number;
  ec: number;
  ph: number;
  ppfd: number;
};

/* ================= PAGE ================= */

export default function Page() {

  const mqttRef = useRef<any>(null);

  const [sensor, setSensor] = useState<Sensor>({
    temp: 0,
    hum: 0,
    lux: 0,
    ec: 0,
    ph: 0,
    ppfd: 0,
  });

  const [history, setHistory] = useState<any[]>([]);
  const [alarm, setAlarm] = useState<string[]>([]);

  const [control, setControl] = useState({
    led: false,
    pump: false,
    pump1: false,
  });

  /* ================= MQTT SAFE ================= */
  useEffect(() => {

    let client: any;

    (async () => {

      const mqtt = (await import('mqtt')).default;

      client = mqtt.connect(
        'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
        {
          username: process.env.NEXT_PUBLIC_MQTT_USER || '',
          password: process.env.NEXT_PUBLIC_MQTT_PASS || '',
          reconnectPeriod: 2000,
        }
      );

      mqttRef.current = client;

      client.on('connect', () => {
        client.subscribe('smartfarm/jeho123/data');
      });

      client.on('message', (_t: any, payload: any) => {

        const msg = JSON.parse(payload.toString());

        const data: Sensor = {
          temp: msg.values?.temp ?? 0,
          hum: msg.values?.hum ?? 0,
          lux: msg.values?.lux ?? 0,
          ec: msg.values?.ec ?? 0,
          ph: msg.values?.ph ?? 0,
          ppfd: msg.values?.ppfd ?? 0,
        };

        setSensor(data);

        /* ================= HISTORY ================= */
        setHistory(prev => [
          ...prev.slice(-80),
          {
            time: new Date().toLocaleTimeString().slice(0, 8),
            ...data,
          },
        ]);

        /* ================= ALARM SYSTEM ================= */
        if (data.ec > 3 || data.ph < 5.5 || data.ph > 7.5) {
          setAlarm(prev => [
            `[CRITICAL] EC/PH OUT OF RANGE`,
            ...prev.slice(0, 10),
          ]);
        }

        if (data.lux < 5000) {
          setAlarm(prev => [
            `[WARNING] LOW LUX DETECTED`,
            ...prev.slice(0, 10),
          ]);
        }

        /* ================= PLC AUTO CONTROL ================= */
        if (data.ec > 3) {
          mqttRef.current?.publish(
            'smartfarm/jeho123/control',
            JSON.stringify({ pump: true })
          );
        }

      });

    })();

    return () => client?.end?.();

  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof control) => {

    setControl(p => {
      const next = !p[key];

      mqttRef.current?.publish(
        'smartfarm/jeho123/control',
        JSON.stringify({ device: key, state: next })
      );

      return { ...p, [key]: next };
    });
  };

  /* ================= SAFE VALUES ================= */
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const max = (arr: number[]) =>
    arr.length ? Math.max(...arr) : 0;

  const min = (arr: number[]) =>
    arr.length ? Math.min(...arr) : 0;

  const luxRotate = Math.min(180, (sensor.lux / 50000) * 180);

  return (
    <div className="scada">

      {/* HEADER */}
      <div className="header">
        <h1>GLOVERA FARM SCADA</h1>
      </div>

      {/* STATUS */}
      <div className="grid">

        <Box label="TEMP" value={sensor.temp.toFixed(1)} />
        <Box label="HUM" value={sensor.hum.toFixed(1)} />
        <Box label="LUX" value={sensor.lux} />
        <Box label="EC" value={sensor.ec.toFixed(3)} />
        <Box label="PH" value={sensor.ph.toFixed(2)} />
        <Box label="PPFD" value={sensor.ppfd} />

      </div>

      {/* GAUGE */}
      <div className="gauge">

        <div
          className="needle"
          style={{ transform: `rotate(${luxRotate - 90}deg)` }}
        />

        <div className="label">LUX GAUGE</div>

      </div>

      {/* MIN / AVG / MAX GRAPH */}
      <div className="chart">

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>

            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            {/* MIN */}
            <Area
              dataKey="temp"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.2}
            />

            {/* AVG */}
            <Area
              dataKey="hum"
              stroke="#facc15"
              fill="#facc15"
              fillOpacity={0.2}
            />

            {/* MAX */}
            <Area
              dataKey="lux"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.2}
            />

          </AreaChart>
        </ResponsiveContainer>

      </div>

      {/* EC GRAPH */}
      <div className="chart">

        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={history}>
            <Line type="monotone" dataKey="ec" stroke="#38bdf8" />
            <Line type="monotone" dataKey="ph" stroke="#f97316" />
          </LineChart>
        </ResponsiveContainer>

      </div>

      {/* ALARM */}
      <div className="alarm">
        {alarm.map((a, i) => (
          <div key={i}>{a}</div>
        ))}
      </div>

      {/* CONTROL */}
      <div className="control">

        <button onClick={() => toggle('pump')}>
          PUMP
        </button>

        <button onClick={() => toggle('pump1')}>
          PUMP1
        </button>

        <button onClick={() => toggle('led')}>
          LED
        </button>

      </div>

      {/* STYLE (PC 확대 1.5x) */}
      <style jsx>{`

        .scada {
          background: #05070f;
          color: white;
          min-height: 100vh;
          padding: 24px;
          font-size: 18px; /* 🔥 1.5x 증가 */
        }

        .header {
          font-size: 28px;
          margin-bottom: 20px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .gauge {
          margin-top: 20px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 3px solid #1f2937;
          position: relative;
        }

        .needle {
          position: absolute;
          width: 2px;
          height: 100px;
          background: red;
          left: 50%;
          top: 50%;
          transform-origin: bottom;
        }

        .chart {
          margin-top: 20px;
        }

        .alarm {
          margin-top: 20px;
          color: #f87171;
        }

        .control {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        button {
          padding: 12px;
          background: #0b1220;
          border: 1px solid #334155;
          color: white;
        }

      `}</style>

    </div>
  );
}

/* ================= BOX ================= */

function Box({ label, value }: any) {
  return (
    <div style={{
      background: '#0b1220',
      padding: 12,
      border: '1px solid #1f2937'
    }}>
      <div>{label}</div>
      <div style={{ fontSize: 20, color: '#22d3ee' }}>{value}</div>
    </div>
  );
}