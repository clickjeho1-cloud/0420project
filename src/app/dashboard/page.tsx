'use client';

export const dynamic = 'force-dynamic'; // 🔥 이거 중요 (라우트 강제 인식)

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SmartFarmChart3 } from './components/SmartFarmChart3';

export default function Dashboard() {
  const [latest, setLatest] = useState<any>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatest(data[0]);
      }
    };

    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={outer}>
      <h1 style={title}>🌱 스마트팜 대시보드</h1>

      <div style={cardWrap}>
        <Card title="온도" value={`${latest?.temperature ?? '-'} °C`} />
        <Card title="습도" value={`${latest?.humidity ?? '-'} %`} />
        <Card
          title="시간"
          value={
            latest?.created_at
              ? new Date(latest.created_at).toLocaleString()
              : '-'
          }
        />
      </div>

      <div style={chartBox}>
        <h2>📈 실시간 그래프</h2>
        <SmartFarmChart3 />
      </div>
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

// ===== 스타일 =====
const outer = {
  padding: '20px',
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

const valueStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
};

const chartBox = {
  background: '#1e293b',
  padding: '16px',
  borderRadius: '10px',
};
