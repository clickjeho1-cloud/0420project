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

type AlarmLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

type EventLog = {
  id: string;
  time: string;
  type: AlarmLevel;
  tag: string;
  value: number;
  message: string;
};

/* ================= PAGE ================= */

export default function Page() {
  const mqttRef = useRef<mqtt.MqttClient | null>(null);

  const [time, setTime] = useState('');
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

    client.on('message', (_topic: string, payload: any) => {
      const msg = JSON.parse(payload.toString());

      const data: SensorData = {
        temperature: msg.temperature ?? 0,
        humidity: msg.humidity ?? 0,
        ec: msg.ec ?? 0,
        ph: msg.ph ?? 0,
        waterTemp: msg.waterTemp ?? 0,
        lux: msg.lux ?? 0,
        rpm: msg.rpm ?? 0,
      };

      setSensors(data);
      setHistory(prev => [...prev.slice(-120), data]);

      /* ================= SCADA ALARM ENGINE ================= */

      const ecLevel: AlarmLevel =
        data.ec < 1.5 ? 'NORMAL' : data.ec < 3 ? 'WARNING' : 'CRITICAL';

      const phLevel: AlarmLevel =
        data.ph >= 6 && data.ph <= 7
          ? 'NORMAL'
          : data.ph >= 5.5 && data.ph <= 7.5
          ? 'WARNING'
          : 'CRITICAL';

      const pushEvent = (tag: string, value: number, level: AlarmLevel) => {
        if (level === 'NORMAL') return;

        const ev: EventLog = {
          id: cryptoFallback(),
          time: new Date().toLocaleTimeString(),
          type: level,
          tag,
          value,
          message: `${tag} anomaly: ${value}`,
        };

        setEvents(prev => [ev, ...prev].slice(0, 100));
      };

      pushEvent('EC', data.ec, ecLevel);
      pushEvent('PH', data.ph, phLevel);
    });

    return () => client.end();
  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: string) => {
    setControls(prev => {
      const next = !prev[key];

      mqttRef.current?.publish(
        'smartfarm/jeho123/control',
        JSON.stringify({ device: key, state: next })
      );

      return { ...prev, [key]: next };
    });
  };

  /* ================= UI COLORS ================= */
  const ecColor =
    sensors.ec < 1.5 ? 'text-green-400' :
    sensors.ec < 3 ? 'text-yellow-400' : 'text-red-500';

  const phColor =
    sensors.ph >= 6 && sensors.ph <= 7
      ? 'text-green-400'
      : sensors.ph >= 5.5 && sensors.ph <= 7.5
      ? 'text-yellow-400'
      : 'text-red-500';

  return (
    <div className="min-h-screen bg-[#05070f] text-white p-4">

      <div className="border-b border-gray-700 pb-2">
        <h1 className="text-lg font-bold">SCADA DASHBOARD</h1>
        <div className="text-xs opacity-60">{time}</div>
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-6 gap-2 mt-4 text-sm">
        <Card label="TEMP" value={sensors.temperature} />
        <Card label="HUMID" value={sensors.humidity} />
        <Card label="EC" value={sensors.ec} color={ecColor} />
        <Card label="PH" value={sensors.ph} color={phColor} />
        <Card label="WATER" value={sensors.waterTemp} />
        <Card label="LUX" value={sensors.lux} />
      </div>

      {/* RPM */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-4">
        <div className="text-xs opacity-70">PUMP RPM</div>

        <div className="relative w-44 h-44 mx-auto">
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

      {/* WAVE */}
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

      {/* EVENTS */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-3">
        <div className="text-xs mb-2">ALARM LOG</div>

        <div className="text-xs space-y-1 max-h-40 overflow-auto">
          {events.map(e => (
            <div key={e.id} className={
              e.type === 'CRITICAL'
                ? 'text-red-500'
                : e.type === 'WARNING'
                ? 'text-yellow-400'
                : 'text-green-400'
            }>
              [{e.time}] {e.message}
            </div>
          ))}
        </div>
      </div>

      {/* CONTROL */}
      <div className="grid grid-cols-4 gap-2 mt-6">
        {Object.keys(controls).map(k => (
          <button
            key={k}
            onClick={() => toggle(k)}
            className={`p-3 border text-xs ${
              controls[k] ? 'border-green-400' : 'border-red-500'
            }`}
          >
            {k.toUpperCase()}
          </button>
        ))}
      </div>

    </div>
  );
}

/* ================= SAFE CARD ================= */

function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="bg-[#0b1220] border border-gray-700 p-2">
      <div className="text-[10px] opacity-60">{label}</div>
      <div className={`text-sm font-bold ${color || ''}`}>{value}</div>
    </div>
  );
}

/* ================= SAFE UUID ================= */

function cryptoFallback() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2);
}