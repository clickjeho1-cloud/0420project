'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setData(data[0]);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={container}>
      <h1 style={title}>🌱 스마트팜 대시보드</h1>

      <div style={cardWrap}>
        <Card title="온도" value={`${data?.temperature ?? '--'} °C`} />
        <Card title="습도" value={`${data?.humidity ?? '--'} %`} />
        <Card title="상태" value={data ? 'LIVE' : 'READY'} />
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

// 스타일 그대로 유지
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