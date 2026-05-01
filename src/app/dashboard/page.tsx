'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { SmartFarmChart3 } from './components/SmartFarmChart3';

export default function Dashboard() {
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      if (data && data.length > 0) {
        setLatest(data[0]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatest();
    const interval = setInterval(fetchLatest, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={outer}>
      <h1 style={title}>🌱 스마트팜 실시간 대시보드</h1>

      {/* 로딩 */}
      {loading && <p>데이터 불러오는 중...</p>}

      {/* ===== 상태 카드 ===== */}
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

      {/* ===== 그래프 ===== */}
      <div style={chartBox}>
        <h2>📈 센서 실시간 그래프</h2>
        <SmartFarmChart3 />
      </div>
    </div>
  );
}

// ===== 카드 컴포넌트 =====
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
