'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

// Recharts를 SSR 없이 브라우저에서만 로드
const Chart = dynamic(() => import('recharts'), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [Recharts, setRecharts] = useState<any>(null);
  const [sensors, setSensors] = useState<any>({ temperature: 24, humidity: 58, ec: 2.2, ph: 6.1, lux: 32000 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    // 런타임에 로드
    import('recharts').then(setRecharts);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data.reverse()); });

    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (p: any) => {
        setSensors(p.new);
        setHistory(prev => [...prev.slice(-19), p.new]);
      }).subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!mounted || !Recharts) return <div style={{padding:'50px', color:'white'}}>로딩 중...</div>;
  
  const { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } = Recharts;

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      
      {/* 상황판 */}
      <section className="panel glass-blue">
        <div className="grid">
          <GlassCard title="온도" value={`${sensors.temperature}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity}%`} />
        </div>
      </section>

      {/* 파형 */}
      <section className="panel glass-wave">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={history}>
            <CartesianGrid stroke="#334155" />
            <XAxis dataKey="created_at" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="temperature" stroke="#ff0000" fill="#ff0000" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 20px; background: #020617; color: white; }
        .panel { padding: 20px; border-radius: 20px; background: rgba(255,255,255,0.05); margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .glass-card { padding: 20px; background: rgba(255,255,255,0.05); border-radius: 20px; }
      `}</style>
    </div>
  );
}

function GlassCard({ title, value }: any) {
  return <div className="glass-card"><h3>{title}</h3><div style={{fontSize:'34px'}}>{value}</div></div>;
}