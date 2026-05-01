'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ControlPanel from './components/ControlPanel';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  const [latest, setLatest] = useState({
    temperature: '--',
    humidity: '--',
  });

  // 🔥 최신 데이터
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sensor_readings?select=*&order=created_at.desc&limit=1`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await res.json();

        if (data && data.length > 0) {
          setLatest({
            temperature: data[0].temperature,
            humidity: data[0].humidity,
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLatest();
    const t = setInterval(fetchLatest, 3000);
    return () => clearInterval(t);
  }, []);

  // 🔥 그래프
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/sensor_readings?select=*&order=created_at.asc&limit=20`,
          {
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
          }
        );

        const data = await res.json();

        if (!canvasRef.current || !data || data.length === 0) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        if (chartRef.current) chartRef.current.destroy();

        chartRef.current = new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.map(() => ''),
            datasets: [
              {
                label: '온도',
                data: data.map((d: any) => d.temperature),
                borderColor: 'red',
              },
              {
                label: '습도',
                data: data.map((d: any) => d.humidity),
                borderColor: 'blue',
              },
            ],
          },
          options: {
            responsive: true,
            animation: false,
          },
        });
      } catch (e) {
        console.error(e);
      }
    };

    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={container}>
      <h1 style={title}>🌱 스마트팜 대시보드</h1>

      {/* 카드 */}
      <div style={cardWrap}>
        <Card title="온도" value={`${latest.temperature} °C`} />
        <Card title="습도" value={`${latest.humidity} %`} />
        <Card title="상태" value="LIVE" />
      </div>

      {/* 날씨 */}
      <WeatherPanel />

      {/* 그래프 */}
      <div style={chartBox}>
        <h2>📈 실시간 그래프</h2>
        <canvas ref={canvasRef} />
      </div>

      {/* 제어 */}
      <ControlPanel />
    </div>
  );
}

function Card({ title, value }: any) {
  return (
    <div style={card}>
      <h3>{title}</h3>
      <p style={valueStyle}>{value}</p>
    </div>
  );
}

const container = {
  padding: '40px',
  background: '#0f172a',
  minHeight: '100vh',
  color: 'white',
};

const title = { marginBottom: '20px' };

const cardWrap = {
  display: 'flex',
  gap: '16px',
  marginBottom: '20px',
};

const card = {
  flex: 1,
  background: '#1e293b',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center' as const,
};

const valueStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
};

const chartBox = {
  background: '#1e293b',
  padding: '20px',
  borderRadius: '12px',
  marginTop: '20px',
};