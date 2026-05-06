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

  const mqttRef = useRef<any>(null);

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

  /* ================= MQTT (VERCEL SAFE DYNAMIC IMPORT) ================= */
  useEffect(() => {

    let client: any;

    const connect = async () => {

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

      client.on('message', (_topic: string, payload: Buffer) => {

        try {

          const msg = JSON.parse(payload.toString());

          const data: EspData = {
            time: msg.time,
            values: {
              temp: msg.values?.temp ?? 0,
              hum: msg.values?.hum ?? 0,
              ec: msg.values?.ec ?? 0,
              ph: msg.values?.ph ?? 0,
              lux: msg.values?.lux ?? 0,
              ppfd: msg.values?.ppfd ?? 0,
              rpm: msg.values?.rpm ?? 0,
            },
          };

          setEsp(data);

          setHistory(prev => [
            ...prev.slice(-100),
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

        } catch (e) {
          console.log('MQTT PARSE ERROR');
        }
      });

    };

    connect();

    return () => {
      client?.end?.();
    };

  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof controls) => {
    setControls(prev => {
      const next = !prev[key];

      mqttRef.current?.publish(
        'smartfarm/jeho123/control',
        JSON.stringify({ device: key, state: next })
      );

      return { ...prev, [key]: next };
    });
  };

  /* ================= SAFE VALUES ================= */
  const v = esp?.values;

  return (
    <div className="scada">

      {/* HEADER */}
      <div className="topbar">
        <h1>SCADA SYSTEM</h1>
        <div>{time}</div>
      </div>

      {/* STATUS GRID */}
      <div className="grid">

        <Box label="TEMP" value={v?.temp ?? '--'} unit="°C" />
        <Box label="HUM" value={v?.hum ?? '--'} unit="%" />
        <Box label="EC" value={v?.ec ?? '--'} />
        <Box label="PH" value={v?.ph ?? '--'} />
        <Box label="PPFD" value={v?.ppfd ?? '--'} />
        <Box label="LUX" value={v?.lux ?? '--'} />

      </div>

      {/* RPM GAUGE */}
      <div className="gauge">
        <div className="needle"
          style={{
            transform: `rotate(${(v?.rpm ?? 0) / 20}deg)`
          }}
        />
        <div className="rpm">
          RPM: {v?.rpm ?? 0}
        </div>
      </div>

      {/* CHART (SAFE DATA ONLY) */}
      <div className="chart">

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history || []}>
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

      {/* CONTROL */}
      <div className="controls">

        <button onClick={() => toggle('pump')}>
          PUMP {controls.pump ? 'ON' : 'OFF'}
        </button>

        <button onClick={() => toggle('led')}>
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
          margin-top: 10px;
        }

        .gauge {
          margin-top: 20px;
          width: 180px;
          height: 180px;
          border-radius: 50%;
          border: 4px solid #1f2937;
          position: relative;
        }

        .needle {
          position: absolute;
          width: 2px;
          height: 80px;
          background: red;
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
          background: #0b1220;
          border: 1px solid #334155;
          color: white;
          padding: 10px;
        }

      `}</style>

    </div>
  );
}

/* ================= BOX ================= */

function Box({ label, value, unit }: any) {
  return (
    <div style={{
      background: '#0b1220',
      padding: 10,
      border: '1px solid #1f2937',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 10 }}>{label}</div>
      <div>
        {value}{unit}
      </div>
    </div>
  );
}