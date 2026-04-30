'use client';

import { useEffect, useState } from 'react';
import { SmartFarmChart3 } from './components/SmartFarmChart3';

export default function Dashboard() {
  const [latest, setLatest] = useState({
    temperature: 0,
    humidity: 0,
    time: '',
  });

  // 🔥 현재 최신값 표시용 (간단 fetch)
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
            time: data[0].created_at,
          });
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 3000); // 3초마다 갱신

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={outer}>
      <h1 style={title}>🌱 스마트팜 실시간 대시보드</h1>

      {/* ===== 현재 상태 ===== */}
      <div style={cardWrap}>
        <div style={card}>
          <h3>온도</h3>
          <p style={value}>{latest.temperature} °C</p>
        </div>

        <div style={card}>
          <h3>습도</h3>
          <p style={value}>{latest.humidity} %</p>
        </div>

        <div style={card}>
          <h3>시간</h3>
          <p style={valueSmall}>{latest.time}</p>
        </div>
      </div>

      {/* ===== 그래프 ===== */}
      <div style={chartBox}>
        <h2>📈 센서 실시간 그래프</h2>
        <SmartFarmChart3 />
      </div>
    </div>
  );
}

// ===== 스타일 =====
const outer = {
  padding: '20px',
  fontFamily: 'sans-serif',
  background: '#0f172a',
  minHeight: '100vh',
  color: 'white',
};

const title = {
  marginBottom: '20px',
};

const cardWrap = {
  display: 'flex',
  gap: '16px',
  marginBottom: '20px',
};

const card = {
  flex: 1,
  background: '#1e293b',
  padding: '16px',
  borderRadius: '10px',
};

const value = {
  fontSize: '28px',
  fontWeight: 'bold',
};

const valueSmall = {
  fontSize: '12px',
};

const chartBox = {
  background: '#1e293b',
  padding: '16px',
  borderRadius: '10px',
};
