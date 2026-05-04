'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

// 1. 차트 라이브러리를 브라우저 전용으로 동적 로드 (SSR 에러 방지)
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, lux: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [controls, setControls] = useState({ fan: false, led: false });
  const [config, setConfig] = useState({ tempThreshold: 18, minLux: 20000 });

  useEffect(() => {
    setMounted(true);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // 초기 데이터 로드
    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data.reverse()); });

    // 실시간 구독
    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload: any) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useMemo(() => {
    setControls({
      fan: sensors.temperature > config.tempThreshold,
      led: sensors.lux < config.minLux
    });
  }, [sensors, config]);

  if (!mounted) return null; // 빌드 및 초기 렌더링 에러 방지

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      
      <section className="panel grid-gauge">
        <Gauge title="온도" value={sensors.temperature || 0} unit="°C" color="#f87171" />
        <Gauge title="습도" value={sensors.humidity || 0} unit="%" color="#60a5fa" />
        <Gauge title="광량(Lux)" value={Math.min((sensors.lux || 0)/500, 100)} unit="%" color="#fbbf24" />
      </section>

      <section className="panel">
        <h2>자동 제어 설정</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label>온도 팬 기준: <input type="number" value={config.tempThreshold} onChange={e => setConfig({...config, tempThreshold: Number(e.target.value)})} /></label>
          <label>LED 최소 광량: <input type="number" value={config.minLux} onChange={e => setConfig({...config, minLux: Number(e.target.value)})} /></label>
        </div>
      </section>

      <section className="panel log-box">
        <h2>실시간 로그</h2>
        <div className="log-list">
          {history.map((h, i) => <p key={i}>[{h.created_at?.slice(11,19)}] Temp: {h.temperature}°C / Fan: {controls.fan ? 'ON':'OFF'}</p>)}
        </div>
      </section>

      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 30px; background: #020617; color: white; }
        .panel { background: rgba(30,41,59,0.5); padding: 20px; border-radius: 20px; margin-bottom: 20px; }
        .grid-gauge { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
        .log-box { height: 150px; overflow-y: auto; color: #94a3b8; }
        input { background: #1e293b; border: 1px solid #334155; color: white; padding: 5px; border-radius: 5px; }
      `}</style>
    </div>
  );
}

function Gauge({ title, value, unit, color }: any) {
  return (
    <div>
      <h3>{title}</h3>
      <PieChart width={150} height={150}>
        <Pie data={[{value: value}, {value: 100-value}]} startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value">
          <Cell fill={color} /><Cell fill="#1e293b" />
        </Pie>
      </PieChart>
      <div style={{marginTop: '-40px', fontWeight:'bold'}}>{value}{unit}</div>
    </div>
  );
}