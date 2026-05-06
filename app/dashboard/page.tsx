'use client';

import { useEffect, useRef, useState } from 'react';
import mqtt from 'mqtt';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

/* ================= ESP STRUCT ================= */

type EspData = {
  time: number;
  values: {
    temp: number;
    hum: number;
    ec: number;
    ph: number;
    lux: number;
    ppfd: number;
    rpm: number;
  };
};

/* ================= PAGE ================= */

export default function Page() {

  const clientRef = useRef<mqtt.MqttClient | null>(null);

  const [esp, setEsp] = useState<EspData | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [time, setTime] = useState('');

  const [controls, setControls] = useState({
    pump: false,
    led: false,
  });

  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  /* ================= MQTT ================= */
  useEffect(() => {

    const client = mqtt.connect(
      'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
      {
        username: process.env.NEXT_PUBLIC_MQTT_USER || '',
        password: process.env.NEXT_PUBLIC_MQTT_PASS || '',
      }
    );

    clientRef.current = client;

    client.on('connect', () => {
      client.subscribe('smartfarm/jeho123/data');
    });

    client.on('message', (_t, payload: Buffer) => {

      const msg = JSON.parse(payload.toString());

      const data: EspData = {
        time: msg.time,
        values: {
          temp: msg.values.temp,
          hum: msg.values.hum,
          ec: msg.values.ec ?? 2.0,
          ph: msg.values.ph ?? 6.5,
          lux: msg.values.lux ?? 30000,
          ppfd: msg.values.ppfd ?? 400,
          rpm: msg.values.rpm ?? 1200,
        },
      };

      setEsp(data);

      setHistory(prev => [
        ...prev.slice(-120),
        {
          time: new Date().toLocaleTimeString().slice(0, 8),
          temp: data.values.temp,
          hum: data.values.hum,
          ec: data.values.ec,
          ph: data.values.ph,
          lux: data.values.lux,
          ppfd: data.values.ppfd,
        },
      ]);
    });

    return () => client.end();

  }, []);

  /* ================= STATUS COLORS ================= */

  const pumpColor = controls.pump ? '#22c55e' : '#ef4444';

  const ecStatus =
    (esp?.values.ec ?? 0) < 1.5
      ? 'ok'
      : (esp?.values.ec ?? 0) < 3
      ? 'warn'
      : 'danger';

  const phStatus =
    (esp?.values.ph ?? 0) > 5.8 && (esp?.values.ph ?? 0) < 7.2
      ? 'ok'
      : 'warn';

  return (
    <div className="scada">

      {/* HEADER */}
      <div className="topbar">
        <h1>INDUSTRIAL SCADA DASHBOARD</h1>
        <div>{time}</div>
      </div>

      {/* STATUS GRID */}
      <div className="grid">

        <Box label="TEMP" value={esp?.values.temp ?? '--'} unit="°C" />
        <Box label="HUM" value={esp?.values.hum ?? '--'} unit="%" />
        <Box label="EC" value={esp?.values.ec ?? '--'} color={ecStatus} />
        <Box label="PH" value={esp?.values.ph ?? '--'} color={phStatus} />
        <Box label="PPFD" value={esp?.values.ppfd ?? '--'} />
        <Box label="LUX" value={esp?.values.lux ?? '--'} />

      </div>

      {/* PUMP GAUGE (RPM STYLE) */}
      <div className="gauge">

        <div className="needle"
          style={{
            transform: `rotate(${(esp?.values.rpm ?? 0) / 20}deg)`,
          }}
        />

        <div className="rpm">
          RPM: {esp?.values.rpm ?? 0}
        </div>

      </div>

      {/* REALTIME GRAPH */}
      <div className="chart">

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area dataKey="temp" stroke="#ff4d4d" />
            <Area dataKey="hum" stroke="#4dff88" />
            <Area dataKey="ec" stroke="#4da6ff" />
            <Area dataKey="ph" stroke="#ffd24d" />
            <Area dataKey="ppfd" stroke="#a855f7" />

          </AreaChart>
        </ResponsiveContainer>

      </div>

      {/* CONTROL PANEL */}
      <div className="controls">

        <button
          onClick={() =>
            setControls(p => ({ ...p, pump: !p.pump }))
          }
          style={{ borderColor: pumpColor }}
        >
          PUMP {controls.pump ? 'ON' : 'OFF'}
        </button>

        <button
          onClick={() =>
            setControls(p => ({ ...p, led: !p.led }))
          }
        >
          LED {controls.led ? 'ON' : 'OFF'}
        </button>

      </div>

      {/* STYLE */}
      <style jsx>{`

        .scada {
          background: #05070f;
          color: white;
          padding: 16px;
          min-height: 100vh;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
          margin-top: 12px;
        }

        .gauge {
          margin-top: 20px;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 4px solid #1f2937;
          position: relative;
        }

        .needle {
          width: 2px;
          height: 90px;
          background: red;
          position: absolute;
          left: 50%;
          top: 50%;
          transform-origin: bottom;
        }

        .rpm {
          position: absolute;
          bottom: 10px;
          width: 100%;
          text-align: center;
        }

        .chart {
          margin-top: 20px;
        }

        .controls {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        button {
          padding: 10px;
          border: 1px solid #334155;
          background: #0b1220;
          color: white;
        }

      `}</style>

    </div>
  );
}

/* ================= BOX ================= */

function Box({
  label,
  value,
  unit,
  color,
}: any) {
  return (
    <div style={{
      padding: 10,
      background: '#0b1220',
      border: '1px solid #1f2937',
      textAlign: 'center'
    }}>
      <div>{label}</div>
      <div style={{
        color:
          color === 'danger'
            ? '#ef4444'
            : color === 'warn'
            ? '#facc15'
            : '#22c55e'
      }}>
        {value}{unit}
      </div>
    </div>
  );
}