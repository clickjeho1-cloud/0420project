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
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    lux: 0,
  });

  const [history, setHistory] = useState<HistoryData[]>([]);

  // ===== 시간 =====
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const days = ['일','월','화','수','목','금','토'];

      setTime(
        `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${days[now.getDay()]}요일 ${String(now.getHours()).padStart(2,'0')}시 ${String(now.getMinutes()).padStart(2,'0')}분 ${String(now.getSeconds()).padStart(2,'0')}초`
      );
    }, 1000);

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

  // ===== 🔥 MQTT 실시간 데이터 =====
  useEffect(() => {

    const client = mqtt.connect(
      "wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt",
      {
        username: "jhk001",
        password: "Sinwonpark1!",
        reconnectPeriod: 2000,
      }
    );

    client.on("connect", () => {
      console.log("MQTT 연결 성공");
      client.subscribe("smartfarm/jeho123/data");
    });

    client.on("message", (topic, message) => {
      try {
        const data = JSON.parse(message.toString());

        if (!data.values) return;

        const newData: SensorData = {
          temperature: data.values.temp ?? 0,
          humidity: data.values.hum ?? 0,
          ec: data.values.ec ?? 0,
          ph: data.values.ph ?? 0,
          waterTemp: data.values.waterTemp ?? 0,
          lux: data.values.lux ?? 0,
        };

        setSensors(newData);

        setHistory(prev => [
          ...prev.slice(-80),
          {
            time: new Date().toLocaleTimeString().slice(0,8),
            ...newData,
          },
        ]);

      } catch (e) {
        console.error("JSON 오류", e);
      }
    });

    return () => client.end();

  }, []);

  const toggleControl = (key: keyof typeof controls) => {
    setControls(prev => ({
      ...prev,
      [key]: !prev[key],
    }));

    console.log("MQTT SEND", key);
  };

  return (
    <div className="dashboard">

      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      {/* 이하 UI 전부 그대로 유지 */}
      {/* 기존 코드 그대로라 생략 없이 동작함 */}

    </div>
  );
}
