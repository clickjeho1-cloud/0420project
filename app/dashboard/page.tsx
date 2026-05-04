'use client';
import { useEffect, useState, useMemo } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function DashboardPage() {
  const [sensors, setSensors] = useState<any>(null); // 처음엔 null로 설정
  const [history, setHistory] = useState<any[]>([]);
  const [controls, setControls] = useState({ fan: false, pump: false, led: false });
  const [config, setConfig] = useState({ tempThreshold: 18, minLux: 20000 });
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    setSupabase(client);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('sensor_readings_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload: any) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      })
      .subscribe();

    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20).then(({ data }: { data: any[] | null }) => {
      if (data) {
        setHistory(data.reverse());
        setSensors(data[data.length - 1]);
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // 자동 제어 로직: sensors가 null이면 실행 안 함
  useMemo(() => {
    if (sensors) {
      setControls(prev => ({
        ...prev,
        fan: sensors.temperature > config.tempThreshold,
        led: sensors.lux < config.minLux
      }));
    }
  }, [sensors, config]);

  // 핵심: 데이터가 준비될 때까지 화면을 그리지 않음 (에러 방지)
  if (!sensors) return <div style={{padding: '50px', color: 'white'}}>데이터 불러오는 중...</div>;

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      <section className="panel grid-gauge">
        <Gauge title="온도" value={sensors.temperature || 0} unit="°C" color="#f87171" />
        <Gauge title="습도" value={sensors.humidity || 0} unit="%" color="#60a5fa" />
        <Gauge title="광량(Lux)" value={Math.min((sensors.lux || 0)/500, 100)} unit="%" color="#fbbf24" />
      </section>

      {/* 나머지 UI 코드는 동일 */}
      <section className="panel">
        <h2>자동 제어 설정</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <label>온도 팬 기준: <input type="number" value={config.tempThreshold} onChange={e => setConfig({...config, tempThreshold: Number(e.target.value)})} /></label>
          <label>LED 최소 광량: <input type="number" value={config.minLux} onChange={e => setConfig({...config, minLux: Number(e.target.value)})} /></label>
        </div>
      </section>
      {/* ... 로그 출력 영역 ... */}
      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 30px; background: #020617; color: white; }
        .panel { background: rgba(30,41,59,0.5); padding: 20px; border-radius: 20px; margin-bottom: 20px; }
        .grid-gauge { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; }
        input { background: #1e293b; border: 1px solid #334155; color: white; padding: 5px; border-radius: 5px; }
      `}</style>
    </div>
  );
}

function Gauge({ title, value, unit, color }: any) {
  const data = [{ value: value }, { value: Math.max(0, 100 - value) }];
  return (
    <div>
      <h3>{title}</h3>
      <PieChart width={150} height={150}>
        <Pie data={data} startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value">
          <Cell fill={color} /><Cell fill="#1e293b" />
        </Pie>
      </PieChart>
      <div style={{marginTop: '-40px', fontWeight:'bold'}}>{value}{unit}</div>
    </div>
  );
}