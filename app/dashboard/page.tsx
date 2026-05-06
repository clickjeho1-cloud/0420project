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

  // ===== 시간 (원본 유지) =====
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

  // ===== 기상청 (원본 유지) =====
  useEffect(() => {

    async function loadWeather() {

      try {

        const res = await fetch('/api/weather', {
          cache: 'no-store',
        });

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

  // ===== MQTT (기능만 안전하게 추가) =====
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

      } catch {
        console.log('MQTT parse error');
      }

    });

    client.on('error', err => {
      console.log('MQTT error:', err.message);
    });

    return () => {
      client.end(true);
    };

  }, []);

  const toggleControl = (key: keyof typeof controls) => {

    setControls(prev => ({
      ...prev,
      [key]: !prev[key],
    }));

  };

  return (

    <div className="dashboard">

      {/* ===== 타이틀 (원본 유지) ===== */}
      <h1 className="title">
        Glovera 농장 스마트팜 대시보드
      </h1>

      <div className="clock">{time}</div>

      {/* ===== 실시간 상황 (원본 UI 유지) ===== */}
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

        <div className="source">
          {weather.source}
        </div>

      </section>

      {/* ===== 원형 계기판 (원본 유지) ===== */}
      <section className="panel glass-dark">

        <h2>실시간 원형 분석 계기판</h2>

        <div className="gauge-grid">

          <Gauge title="TEMP" value={sensors.temperature} unit="°C" />
          <Gauge title="HUMIDITY" value={sensors.humidity} unit="%" />
          <Gauge title="EC" value={sensors.ec} unit="ds/m" />

        </div>

      </section>

      {/* ===== 파형 (원본 유지 + MQTT 데이터) ===== */}
      <section className="panel glass-wave">

        <h2>실시간 업다운 파형 분석</h2>

        <ResponsiveContainer width="100%" height={400}>

          <AreaChart data={history}>

            <CartesianGrid stroke="#334155" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            <Area dataKey="temperature" stroke="#ff0000" fill="#ff0000" fillOpacity={0.2} />
            <Area dataKey="humidity" stroke="#00ff00" fill="#00ff00" fillOpacity={0.2} />
            <Area dataKey="ec" stroke="#00ccff" fill="#00ccff" fillOpacity={0.2} />
            <Area dataKey="ph" stroke="#ffff00" fill="#ffff00" fillOpacity={0.2} />

          </AreaChart>

        </ResponsiveContainer>

      </section>

      {/* ===== history (원본 유지) ===== */}
      <section className="panel glass-history">

        <div className="history-top">

          <h2>센서 History</h2>

          <div className="history-buttons">

            {['1H','12H','24H','7D'].map(item => (

              <button
                key={item}
                onClick={() => setHistoryMode(item)}
              >
                {item}
              </button>

            ))}

          </div>

        </div>

        <div className="history-grid">

          <HistoryCard title="온도" value={`${sensors.temperature}°C`} />
          <HistoryCard title="습도" value={`${sensors.humidity}%`} />
          <HistoryCard title="EC" value={`${sensors.ec}`} />
          <HistoryCard title="PH" value={`${sensors.ph}`} />

        </div>

        <div className="log-box">
          현재 선택: {historyMode} 로그 출력 영역
        </div>

      </section>

      {/* ===== 제어 시스템 (원본 유지) ===== */}
      <section className="panel glass-control">

        <h2>제어 시스템</h2>

        <div className="control-grid">

          {(Object.keys(controls) as Array<keyof typeof controls>).map(key => (

            <div key={key} className="control-card">

              <h3>{key.toUpperCase()}</h3>

              <div className="status">
                상태: {controls[key] ? ' ON' : ' OFF'}
              </div>

              <button
                className={controls[key] ? 'btn-on' : 'btn-off'}
                onClick={() => toggleControl(key)}
              >
                {controls[key] ? 'TURN OFF' : 'TURN ON'}
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

/* ===== UI 컴포넌트 (원본 유지) ===== */

function GlassCard({ title, value }: { title: string; value: string }) {

  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="glass-value">{value}</div>
    </div>
  );

}

function Gauge({ title, value, unit }: { title: string; value: number; unit: string }) {

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

function HistoryCard({ title, value }: { title: string; value: string }) {

  return (
    <div className="history-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );

}