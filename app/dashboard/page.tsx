'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import ControlPanel from './components/ControlPanel';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 🔥 최신값
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
          setLatest(data[0]);
        } else {
          setLatest(null);
        }
      } catch {
        setLatest(null);
      }
    };

    fetchLatest();
    const t = setInterval(fetchLatest, 5000);
    return () => clearInterval(t);
  }, []);

  // 🔥 그래프 데이터
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
        setHistory(data || []);
      } catch {
        setHistory([]);
      }
    };

    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  // 🔥 그래프 렌더
  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartRef.current) chartRef.current.destroy();

    if (history.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map(() => ''),
        datasets: [
          {
            label: '온도',
            data: history.map((d) => d.temperature),
            borderColor: 'red',
          },
          {
            label: '습도',
            data: history.map((d) => d.humidity),
            borderColor: 'blue',
          },
        ],
      },
    });
  }, [history]);

  return (
    <div style={container}>
      <h1 style={title}>🌱 스마트팜 대시보드</h1>

      {/* 카드 */}
      <div style={cardWrap}>
        <Card
          title="온도"
          value={latest ? `${latest.temperature} °C` : '--'}
        />
        <Card
          title="습도"
          value={latest ? `${latest.humidity} %` : '--'}
        />
        <Card
          title="상태"
          value={latest ? 'LIVE' : 'NO DATA'}
        />
      </div>

      <WeatherPanel />

      {/* 그래프 */}
      <div style={chartBox}>
        <h2>📈 실시간 그래프</h2>

        {history.length === 0 ? (
          <p style={{ opacity: 0.6 }}>데이터 없음</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>

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