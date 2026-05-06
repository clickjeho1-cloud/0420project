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

/* ================= TYPE ================= */

type Sensor = {
  temp: number;
  hum: number;
  lux: number;
  ec: number;
  ph: number;
  ppfd: number;
};

const EMPTY: Sensor = {
  temp: 0,
  hum: 0,
  lux: 0,
  ec: 0,
  ph: 0,
  ppfd: 0,
};

/* ================= PAGE ================= */

export default function Page() {

  const clientRef = useRef<any>(null);
  const reconnectRef = useRef<any>(null);

  const [sensor, setSensor] = useState<Sensor>(EMPTY);
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] =
    useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');

  const [time, setTime] = useState('');

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

  /* ================= NORMALIZE ================= */
  const normalize = (msg: any): Sensor => ({
    temp: msg?.values?.temp ?? msg?.temp ?? 0,
    hum: msg?.values?.hum ?? msg?.hum ?? 0,
    lux: msg?.values?.lux ?? 0,
    ec: msg?.values?.ec ?? 0,
    ph: msg?.values?.ph ?? 0,
    ppfd: msg?.values?.ppfd ?? 0,
  });

  /* ================= MQTT ================= */
  const connectMQTT = () => {

    try {

      setStatus('CONNECTING');

      const client = mqtt.connect(
        'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
        {
          username: process.env.NEXT_PUBLIC_MQTT_USER || '',
          password: process.env.NEXT_PUBLIC_MQTT_PASS || '',
          reconnectPeriod: 2000,
          connectTimeout: 5000,
        }
      );

      clientRef.current = client;

      client.on('connect', () => {
        setStatus('CONNECTED');
        client.subscribe('smartfarm/jeho123/data');
      });

      client.on('error', () => {
        setStatus('DISCONNECTED');
        scheduleReconnect();
      });

      client.on('close', () => {
        setStatus('DISCONNECTED');
        scheduleReconnect();
      });

      client.on('message', (_: any, payload: any) => {

        try {

          const msg = JSON.parse(payload.toString());
          const data = normalize(msg);

          setSensor(data);

          setHistory(prev => [
            ...prev.slice(-120),
            {
              time: new Date().toLocaleTimeString().slice(0, 8),
              ...data,
            },
          ]);

        } catch {
          // SCADA safe fail
        }

      });

    } catch {
      setStatus('DISCONNECTED');
      scheduleReconnect();
    }

  };

  /* ================= AUTO RECONNECT ================= */
  const scheduleReconnect = () => {

    if (reconnectRef.current) return;

    reconnectRef.current = setTimeout(() => {
      reconnectRef.current = null;
      connectMQTT();
    }, 3000);

  };

  useEffect(() => {

    connectMQTT();

    return () => {
      clientRef.current?.end?.();
      clearTimeout(reconnectRef.current);
    };

  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof control) => {

    setControl(prev => {

      const next = !prev[key];

      clientRef.current?.publish(
        'smartfarm/jeho123/control',
        JSON.stringify({ device: key, state: next })
      );

      return { ...prev, [key]: next };
    });

  };

  const v = sensor ?? EMPTY;

  /* ================= UI ================= */
  return (
    <div className="scada">

      {/* HEADER */}
      <div className="header">

        <h1>Glovera Smart farm 대시보드</h1>

        <div className={`status ${status}`}>
          MQTT: {status}
        </div>

        <div>{time}</div>

      </div>

      {/* SENSOR GRID */}
      <div className="grid">

        <Box label="TEMP" value={v.temp} />
        <Box label="HUM" value={v.hum} />
        <Box label="LUX" value={v.lux} />
        <Box label="EC" value={v.ec} />
        <Box label="PH" value={v.ph} />
        <Box label="PPFD" value={v.ppfd} />

      </div>

      {/* CHART */}
      <div className="chart">

        <ResponsiveContainer width="100%" height={320}>

          <AreaChart
            data={
              history.length
                ? history
                : [{ time: '--', temp: 0, hum: 0, lux: 0, ec: 0, ph: 0, ppfd: 0 }]
            }
          >

            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area dataKey="temp" stroke="#ff4d4d" fill="#ff4d4d" />
            <Area dataKey="hum" stroke="#4dff88" fill="#4dff88" />
            <Area dataKey="lux" stroke="#4da6ff" fill="#4da6ff" />
            <Area dataKey="ec" stroke="#facc15" fill="#facc15" />
            <Area dataKey="ph" stroke="#a855f7" fill="#a855f7" />

          </AreaChart>

        </ResponsiveContainer>

      </div>

      {/* CONTROL */}
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
        copyright @ originated jhk in 2026
      </div>

      {/* STYLE */}
      <style jsx>{`

        .scada {
          background: #05070f;
          color: white;
          min-height: 100vh;
          padding: 24px;
          font-size: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
          margin-bottom: 16px;
        }

        h1 {
          font-size: 26px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 10px;
        }

        .chart {
          margin-top: 20px;
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

        .footer {
          margin-top: 30px;
          text-align: center;
          color: #64748b;
        }

        .status.CONNECTED { color: #22c55e; }
        .status.CONNECTING { color: #facc15; }
        .status.DISCONNECTED { color: #ef4444; }

        .box {
          background: #0b1220;
          padding: 12px;
          border: 1px solid #1f2937;
          text-align: center;
        }

      `}</style>

    </div>
  );
}

/* ================= BOX ================= */

function Box({ label, value }: any) {
  return (
    <div className="box">
      <div>{label}</div>
      <div style={{ color: '#22d3ee', fontSize: 18 }}>
        {value}
      </div>
    </div>
  );
}