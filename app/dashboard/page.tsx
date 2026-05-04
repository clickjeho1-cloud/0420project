'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function DashboardPage() {
  const [sensors, setSensors] = useState<any>({ temperature: 24, humidity: 50, ec: 1.5, lux: 30000 });
  const [history, setHistory] = useState<any[]>([]);
  const [controls, setControls] = useState({ fan: false, pump: false, led: false });
  // 자동 제어 설정 상태 (값 변경 시 실시간 반영됨)
  const [config, setConfig] = useState({ tempThreshold: 18, minLux: 20000 });

  useEffect(() => {
    // 실시간 구독 및 초기 로드
    const channel = supabase
      .channel('sensor_readings_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      })
      .subscribe();

    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20).then(({data}) => {
      if(data) setHistory(data.reverse());
    });

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 자동 제어 로직 (조건 변경 시 자동 적용)
  useMemo(() => {
    setControls(prev => ({
      ...prev,
      fan: sensors.temperature > config.tempThreshold,
      led: sensors.lux < config.minLux
    }));
  }, [sensors, config]);

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      
      {/* 1. 계기판 */}
      <section className="panel grid-gauge">
        <Gauge title="온도" value={sensors.temperature} unit="°C" color="#f87171" />
        <Gauge title="습도" value={sensors.humidity} unit="%" color="#60a5fa" />
        <Gauge title="광량(Lux)" value={Math.min(sensors.lux/500, 100)} unit="%" color="#fbbf24" />
      </section>

      {/* 2. 자동 제어 설정창 */}
      <section className="panel">
        <h2>자동 제어 설정</h2>
        <div className="settings-grid">
          <label>온도 팬 가동 기준: <input type="number" value={config.tempThreshold} onChange={e => setConfig({...config, tempThreshold: Number(e.target.value)})} /></label>
          <label>LED 최저 광량 기준: <input type="number" value={config.minLux} onChange={e => setConfig({...config, minLux: Number(e.target.value)})} /></label>
        </div>
      </section>

      {/* 3. 실시간 로그 */}
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
        .settings-grid { display: flex; gap: 20px; }
        .log-box { height: 200px; overflow-y: auto; color: #94a3b8; }
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