'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

// 1. Supabase 클라이언트 설정 (반드시 .env.local에 설정되어 있어야 함)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 타입 정의
type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
};

export default function DashboardPage() {
  const [time, setTime] = useState('');
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    lux: 0,
  });

  // 1. 실시간 데이터 구독 (Supabase Realtime)
  useEffect(() => {
    // 초기값 불러오기
    const fetchInitialData = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setSensors(data[0] as unknown as SensorData);
      }
    };
    fetchInitialData();

    // 실시간 채널 구독
    const channel = supabase
      .channel('sensor_readings_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          console.log('실시간 데이터 감지:', payload.new);
          setSensors(payload.new as unknown as SensorData);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. 시계 기능
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(`${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}시 ${String(now.getMinutes()).padStart(2, '0')}분 ${String(now.getSeconds()).padStart(2, '0')}초`);
    };
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dashboard">
      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      <section className="panel glass-blue">
        <h2>실시간 상황 계기판</h2>
        <div className="grid">
          <GlassCard title="온도" value={`${sensors.temperature}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity}%`} />
          <GlassCard title="EC" value={`${sensors.ec}`} />
          <GlassCard title="광량" value={`${sensors.lux}`} />
        </div>
      </section>
      
      {/* 스타일 및 하위 컴포넌트는 기존 코드 그대로 사용하세요 */}
      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 20px; background: #020617; color: white; }
        .title { font-size: 42px; color: #38bdf8; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .panel { padding: 24px; border-radius: 24px; margin-bottom: 25px; background: rgba(255,255,255,0.05); }
        .glass-card { padding: 22px; border-radius: 20px; background: rgba(255, 255, 255, 0.05); }
        .glass-value { margin-top: 12px; font-size: 34px; color: #22d3ee; font-weight: bold; }
      `}</style>
    </div>
  );
}

function GlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="glass-value">{value}</div>
    </div>
  );
}