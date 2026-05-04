'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function DashboardPage() {
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, ph: 0, lux: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // 1. 데이터 가져오기
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!error && data) {
        setSensors(data[0] || {});
        setHistory(data.reverse());
      }
    };
    fetchData();

    // 2. 실시간 구독
    const channel = supabase
      .channel('sensor_readings_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 3. 데이터가 없을 때의 안전 장치 추가
  if (!sensors) return <div>데이터 로딩 중...</div>;

  return (
    <div className="dashboard">
      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      
      <section className="panel glass-blue">
        <div className="grid">
          <GlassCard title="온도" value={`${sensors.temperature ?? 0}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity ?? 0}%`} />
          <GlassCard title="EC" value={`${sensors.ec ?? 0}`} />
          <GlassCard title="광량" value={`${sensors.lux ?? 0}`} />
        </div>
      </section>

      <section className="panel glass-wave">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#334155" />
            <XAxis dataKey="created_at" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="temperature" stroke="#ff0000" fill="#ff0000" fillOpacity={0.2} />
            <Area type="monotone" dataKey="humidity" stroke="#00ff00" fill="#00ff00" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 20px; background: #020617; color: white; }
        .panel { padding: 20px; border-radius: 20px; background: rgba(255,255,255,0.05); margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .glass-card { padding: 20px; background: rgba(255,255,255,0.05); border-radius: 15px; }
      `}</style>
    </div>
  );
}

function GlassCard({ title, value }: { title: string; value: string }) {
  return <div className="glass-card"><h3>{title}</h3><div style={{fontSize: '24px', fontWeight: 'bold'}}>{value}</div></div>;
}