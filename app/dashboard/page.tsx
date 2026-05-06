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

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
  rpm: number;
};

type HistoryData = {
  time: string;
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
  rpm: number;
};

export default function DashboardPage() {
  const mqttRef = useRef<mqtt.MqttClient | null>(null);

  const [time, setTime] = useState('');
  const [history, setHistory] = useState<HistoryData[]>([]);

  const [controls, setControls] = useState({
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

  /* ================= MQTT (Vercel SAFE) ================= */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = 'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt';

    const client = mqtt.connect(url, {
      username: process.env.NEXT_PUBLIC_MQTT_USER || '',
      password: process.env.NEXT_PUBLIC_MQTT_PASS || '',
      reconnectPeriod: 2000,
      clean: true,
    });

    mqttRef.current = client;

    client.on('connect', () => {
      client.subscribe('smartfarm/jeho123/data');
    });

    client.on('message', (_topic, payload) => {
      try {
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

        setHistory(prev => [
          ...prev.slice(-120),
          {
            time: new Date().toLocaleTimeString(),
            ...data,
          },
        ]);
      } catch (e) {
        console.log('MQTT parse error');
      }
    });

    return () => client.end();
  }, []);

  /* ================= CONTROL ================= */
  const toggleControl = (key: keyof typeof controls) => {
    setControls(prev => {
      const next = !prev[key];

      mqttRef.current?.publish(
        'smartfarm/jeho123/control',
        JSON.stringify({ device: key, state: next })
      );

      return { ...prev, [key]: next };
    });
  };

  /* ================= SCADA COLORS ================= */
  const ecColor =
    sensors.ec < 1.5 ? 'text-green-400' :
    sensors.ec < 3 ? 'text-yellow-400' : 'text-red-500';

  const phColor =
    sensors.ph < 5.5 || sensors.ph > 7.5 ? 'text-red-500'
    : sensors.ph < 6 || sensors.ph > 7 ? 'text-yellow-400'
    : 'text-green-400';

  return (
    <div className="min-h-screen bg-[#05070f] text-white p-4">

      {/* HEADER */}
      <div className="border-b border-gray-700 pb-2">
        <h1 className="text-lg font-bold tracking-widest">
          SCADA SMART FARM CONTROL SYSTEM
        </h1>
        <div className="text-xs opacity-60">{time}</div>
      </div>

      {/* STATUS GRID */}
      <div className="grid grid-cols-6 gap-2 mt-4 text-sm">

        <Card label="TEMP" value={`${sensors.temperature}°C`} />
        <Card label="HUMID" value={`${sensors.humidity}%`} />
        <Card label="EC" value={sensors.ec} color={ecColor} />
        <Card label="PH" value={sensors.ph} color={phColor} />
        <Card label="WATER" value={`${sensors.waterTemp}°C`} />
        <Card label="LUX" value={sensors.lux} />

      </div>

      {/* RPM GAUGE */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-4">
        <h2 className="text-xs mb-2 opacity-70">PUMP RPM</h2>

        <div className="relative w-44 h-44 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-gray-700" />

          <div
            className="absolute left-1/2 top-1/2 w-1 h-20 bg-red-500 origin-bottom transition-transform duration-500"
            style={{
              transform: `translate(-50%, -100%) rotate(${(sensors.rpm / 4000) * 180 - 90}deg)`
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center text-sm">
            {sensors.rpm} RPM
          </div>
        </div>
      </div>

      {/* SCADA WAVE */}
      <div className="mt-6 bg-[#0b1220] border border-gray-700 p-3">
        <h2 className="text-xs mb-2">SIGNAL FLOW</h2>

        <ResponsiveContainer width="100%" height={260}>
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

      {/* PUMP FLOW SYSTEM */}
      <div className="grid grid-cols-4 gap-2 mt-6">

        {(['fan','pump','led','heater'] as (keyof typeof controls)[]).map(k => (
          <div
            key={k}
            className={`relative p-3 border text-center transition
              ${controls[k] ? 'border-green-400 bg-green-900/20' : 'border-red-500 bg-red-900/10'}
            `}
          >
            <div className="text-xs">{k.toUpperCase()}</div>

            <button
              onClick={() => toggleControl(k)}
              className="mt-2 text-xs border px-2 py-1"
            >
              TOGGLE
            </button>

            {/* FLOW ANIMATION */}
            {controls[k] && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 animate-pulse" />
            )}
          </div>
        ))}

      </div>

    </div>
  );
}

/* ================= CARD ================= */
function Card({ label, value, color }: any) {
  return (
    <div className="bg-[#0b1220] border border-gray-700 p-2">
      <div className="text-[10px] opacity-60">{label}</div>
      <div className={`text-sm font-bold ${color || ''}`}>{value}</div>
    </div>
  );
}