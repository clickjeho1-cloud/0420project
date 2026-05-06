'use client';

import { useEffect, useState } from 'react';
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

  // ===== 시간 =====
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const days = ['일','월','화','수','목','금','토'];

      setTime(
        `${now.getFullYear()}년 ${
          now.getMonth() + 1
        }월 ${now.getDate()}일 ${
          days[now.getDay()]
        }요일 ${String(now.getHours()).padStart(2, '0')}시 ${String(
          now.getMinutes()
        ).padStart(2, '0')}분 ${String(now.getSeconds()).padStart(2, '0')}초`
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // ===== 날씨 =====
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
    const interval = setInterval(loadWeather, 60000);
    return () => clearInterval(interval);
  }, []);

  // ===== MQTT (핵심 수정 완료 버전) =====
  useEffect(() => {

    const client = mqtt.connect(
      'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
      {
        username: 'jhk001',
        password: 'Sinwonpark1!',
        reconnectPeriod: 2000,
      }
    );

    client.on('connect', () => {
      console.log('MQTT connected');
      client.subscribe('smartfarm/jeho123/data');
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        setSensors(prev => ({
          ...prev,
          temperature: data?.values?.temp ?? prev.temperature,
          humidity: data?.values?.hum ?? prev.humidity,
        }));

        setHistory(prev => [
          ...prev.slice(-80),
          {
            time: new Date().toLocaleTimeString().slice(0, 8),
            temperature: data?.values?.temp ?? 0,
            humidity: data?.values?.hum ?? 0,
            ec: prev.at(-1)?.ec ?? 0,
            ph: prev.at(-1)?.ph ?? 0,
            waterTemp: prev.at(-1)?.waterTemp ?? 0,
          },
        ]);

      } catch (e) {
        console.log('MQTT parse error');
      }
    });

    client.on('error', (err) => {
      console.log('MQTT error:', err.message);
    });

    // ✔️ Vercel 통과 핵심: 반드시 end()만 반환
    return () => {
      client.end(true);
    };

  }, []);

  // ===== 제어 =====
  const toggleControl = (key: keyof typeof controls) => {
    setControls(prev => ({
      ...prev,
      [key]: !prev[key],
    }));

    console.log('MQTT SEND', key);
  };

  return (
    <div className="dashboard">

      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      {/* 상태 */}
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

      {/* 파형 */}
      <section className="panel glass-wave">
        <h2>실시간 파형</h2>

        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#334155" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area dataKey="temperature" stroke="#ff0000" fill="#ff0000" fillOpacity={0.2} />
            <Area dataKey="humidity" stroke="#00ff00" fill="#00ff00" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* 제어 */}
      <section className="panel glass-control">
        <h2>제어 시스템</h2>

        <div className="control-grid">
          {Object.keys(controls).map((key) => (
            <div key={key} className="control-card">
              <h3>{key.toUpperCase()}</h3>
              <div className="status">
                상태: {controls[key as keyof typeof controls] ? 'ON' : 'OFF'}
              </div>

              <button
                className={controls[key as keyof typeof controls] ? 'btn-on' : 'btn-off'}
                onClick={() => toggleControl(key as keyof typeof controls)}
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

// ===== UI 컴포넌트 =====
function GlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="glass-value">{value}</div>
    </div>
  );
}