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
};

type HistoryData = {
  time: string;
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
};

export default function DashboardPage() {

  const [time, setTime] = useState('');
  const [historyMode, setHistoryMode] = useState('1H');

  const [weather, setWeather] = useState({
    temp: '--',
    wind: '--',
    source: '기상청 제공',
  });

  const [controls, setControls] = useState({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  const [sensors, setSensors] = useState<SensorData>({
    temperature: 24,
    humidity: 58,
    ec: 2.2,
    ph: 6.1,
    waterTemp: 21,
    lux: 32000,
  });

  const [history, setHistory] = useState<HistoryData[]>([]);

  const mqttRef = useRef<mqtt.MqttClient | null>(null);

  // ================= TIME =================
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['일','월','화','수','목','금','토'];

      setTime(
        `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ` +
        `${days[now.getDay()]}요일 ` +
        `${String(now.getHours()).padStart(2,'0')}시 ` +
        `${String(now.getMinutes()).padStart(2,'0')}분 ` +
        `${String(now.getSeconds()).padStart(2,'0')}초`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // ================= WEATHER =================
  useEffect(() => {
    async function loadWeather() {
      try {
        const res = await fetch('/api/weather', { cache: 'no-store' });
        const data = await res.json();

        setWeather({
          temp: `${data.temperature}°C`,
          wind: `${data.windspeed} km/h`,
          source: '기상청 제공',
        });
      } catch {
        setWeather({
          temp: '--',
          wind: '--',
          source: '기상청 연결 실패',
        });
      }
    }

    loadWeather();
    const t = setInterval(loadWeather, 60000);
    return () => clearInterval(t);
  }, []);

  // ================= MQTT REALTIME =================
  useEffect(() => {
    const client = mqtt.connect(
      'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
      {
        username: process.env.NEXT_PUBLIC_MQTT_USER || 'jhk001',
        password: process.env.NEXT_PUBLIC_MQTT_PASS || 'Sinwonpark1!',
        reconnectPeriod: 2000,
      }
    );

    mqttRef.current = client;

    client.on('connect', () => {
      console.log('MQTT CONNECTED');
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
        };

        setSensors(data);

        setHistory(prev => [
          ...prev.slice(-80),
          {
            time: new Date().toLocaleTimeString().slice(0,8),
            ...data,
          },
        ]);

      } catch (e) {
        console.log('MQTT PARSE ERROR');
      }
    });

    return () => {
      client.end();
    };
  }, []);

  // ================= CONTROL =================
  const toggleControl = (key: keyof typeof controls) => {
    setControls(prev => ({ ...prev, [key]: !prev[key] }));

    mqttRef.current?.publish(
      'smartfarm/jeho123/control',
      JSON.stringify({ device: key, state: !controls[key] })
    );
  };

  return (
    <div className="dashboard">

      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      {/* ===== WEATHER / STATUS ===== */}
      <section className="panel glass-blue">
        <h2>실시간 상황 계기판</h2>

        <div className="grid">
          <GlassCard title="외부온도" value={weather.temp} />
          <GlassCard title="풍속" value={weather.wind} />
          <GlassCard title="온도" value={`${sensors.temperature}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity}%`} />
          <GlassCard title="EC" value={`${sensors.ec}`} />
          <GlassCard title="광량" value={`${sensors.lux}`} />
        </div>

        <div className="source">{weather.source}</div>
      </section>

      {/* ===== GAUGE ===== */}
      <section className="panel glass-dark">
        <h2>실시간 원형 분석 계기판</h2>

        <div className="gauge-grid">
          <Gauge title="TEMP" value={sensors.temperature} unit="°C" />
          <Gauge title="HUMIDITY" value={sensors.humidity} unit="%" />
          <Gauge title="EC" value={sensors.ec} unit="ds/m" />
        </div>
      </section>

      {/* ===== CHART ===== */}
      <section className="panel glass-wave">
        <h2>실시간 업다운 파형 분석</h2>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#334155" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area dataKey="temperature" stroke="#ff0000" fill="#ff0000" />
            <Area dataKey="humidity" stroke="#00ff00" fill="#00ff00" />
            <Area dataKey="ec" stroke="#00ccff" fill="#00ccff" />
            <Area dataKey="ph" stroke="#ffff00" fill="#ffff00" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* ===== CONTROL ===== */}
      <section className="panel glass-control">
        <h2>제어 시스템</h2>

        <div className="control-grid">
          {(Object.keys(controls) as (keyof typeof controls)[]).map(key => (
            <div key={key} className="control-card">
              <h3>{key.toUpperCase()}</h3>
              <div>상태: {controls[key] ? 'ON' : 'OFF'}</div>

              <button
                className={controls[key] ? 'btn-on' : 'btn-off'}
                onClick={() => toggleControl(key)}
              >
                TOGGLE
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">
        copyright@glovera orginated by jhk in 2026
      </footer>

    </div>
  );
}

/* ===== UI COMPONENTS ===== */

function GlassCard({ title, value }: any) {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="glass-value">{value}</div>
    </div>
  );
}

function Gauge({ title, value, unit }: any) {
  return (
    <div className="gauge">
      <h3>{title}</h3>
      <div className="ring">
        <div className="inner">
          <div className="gauge-value">{value}</div>
          <div>{unit}</div>
        </div>
      </div>
    </div>
  );
}