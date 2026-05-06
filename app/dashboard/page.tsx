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

/* ================= TYPES ================= */

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
  rpm: number;
};

type EventLog = {
  id: string;
  time: string;
  type: 'NORMAL' | 'WARNING' | 'CRITICAL';
  tag: string;
  value: number;
  message: string;
};

/* ================= PAGE ================= */

export default function Page() {
  const mqttRef = useRef<mqtt.MqttClient | null>(null);

  const [time, setTime] = useState<string>('');
  const [history, setHistory] = useState<SensorData[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);

  const [controls, setControls] = useState<Record<string, boolean>>({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    lux: 0,
    rpm: 0,
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
    if (typeof window === 'undefined') return;

    const client = mqtt.connect(
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
      const msg = JSON.parse(payload.toString());

      const data: SensorData = {
        temperature: Number(msg.temperature ?? 0),
        humidity: Number(msg.humidity ?? 0),
        ec: Number(msg.ec ?? 0),
        ph: Number(msg.ph ?? 0),
        waterTemp: Number(msg.waterTemp ?? 0),
        lux: Number(msg.lux ?? 0),
        rpm: Number(msg.rpm ?? 0),
      };

      setSensors(data);
      setHistory(prev => [...prev.slice(-120), data]);

      /* ================= SIMPLE SCADA ALERT ================= */
      const isCritical =
        data.ec > 3 || data.ph < 5.5 || data.ph > 7.5;

      const isWarning =
        data.ec > 1.5;

      const level: EventLog['type'] =
        isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL';

      if (level !== 'NORMAL') {
        setEvents(prev => [
          {
            id: cryptoId(),
            time: new Date().toLocaleTimeString(),
            type: level,
            tag: 'SYSTEM',
            value: data.ec,
            message: 'Anomaly detected',
          },
          ...prev,
        ].slice(0, 80));
      }
    });

    return () => client.end();
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

  /* ================= COLORS ================= */
  const statusColor =
    sensors.ec < 1.5
      ? 'text-green-400'
      : sensors.ec < 3
      ? 'text-yellow-400'
      : 'text-red-500';

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-[#05070f] text-white p-4 font-mono">

      {/* HEADER */}
      <div className="border-b border-gray-700 pb-2">
        <h1 className="text-lg tracking-widest text-cyan-300">
          SMART FARM SCADA SYSTEM
        </h1>
        <div className="text-[11px] opacity-60">{time}</div>
      </div>

      {/* STATUS GRID */}
      <div className="grid grid-cols-6 gap-2 mt-4 text-xs">

        <Box label="TEMP" value={sensors.temperature} />
        <Box label="HUM" value={sensors.humidity} />
        <Box label="EC" value={sensors.ec} color={statusColor} />
        <Box label="PH" value={sensors.ph} />
        <Box label="WATER" value={sensors.waterTemp} />
        <Box label="LUX" value={sensors.lux} />

      </div>

      {/* RPM GAUGE */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-4">
        <div className="text-xs text-gray-400 mb-2">PUMP SPEED (RPM)</div>

        <div className="relative w-48 h-48 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700" />

          <div
            className="absolute left-1/2 top-1/2 w-1 h-20 bg-red-500 origin-bottom transition-transform duration-300"
            style={{
              transform: `translate(-50%, -100%) rotate(${(sensors.rpm / 4000) * 180 - 90}deg)`,
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center text-sm">
            {sensors.rpm} RPM
          </div>
        </div>
      </div>

      {/* CHART */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-3">

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area type="monotone" dataKey="temperature" stroke="#ff4d4d" />
            <Area type="monotone" dataKey="humidity" stroke="#4dff88" />
            <Area type="monotone" dataKey="ec" stroke="#4da6ff" />
            <Area type="monotone" dataKey="ph" stroke="#ffd24d" />
          </AreaChart>
        </ResponsiveContainer>

      </div>

      {/* EVENT LOG */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-3">
        <div className="text-xs text-gray-400 mb-2">ALARM HISTORY</div>

        <div className="text-xs space-y-1 max-h-40 overflow-auto">
          {events.map(e => (
            <div
              key={e.id}
              className={
                e.type === 'CRITICAL'
                  ? 'text-red-500'
                  : e.type === 'WARNING'
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }
            >
              [{e.time}] {e.message}
            </div>
          ))}
        </div>
      </div>

      {/* CONTROL PANEL */}
      <div className="grid grid-cols-4 gap-2 mt-6">

        {(Object.keys(controls) as (keyof typeof controls)[]).map(k => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`p-3 border text-xs tracking-wider ${
              controls[k]
                ? 'border-green-400 text-green-300'
                : 'border-red-500 text-red-400'
            }`}
          >
            {k.toUpperCase()}
          </button>
        ))}

      </div>

    </div>
  );
}

/* ================= BOX ================= */

function Box({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-[#0b1220] border border-gray-700 p-2 text-center">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${color || ''}`}>{value}</div>
    </div>
  );
}

/* ================= SAFE ID ================= */

function cryptoId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}