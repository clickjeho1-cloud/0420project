'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ChartClient = dynamic(
  async () => {
    const { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } = await import('recharts');
    return ({ data }: { data: any[] }) => (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid stroke="#334155" />
          <XAxis dataKey="created_at" tickFormatter={(t) => t.slice(11, 16)} />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#0f172a', border: 'none' }} />
          <Area type="monotone" dataKey="temperature" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    );
  },
  { ssr: false }
);

export default function DashboardPage() {
  const [sensors, setSensors] = useState({ temperature: 0, humidity: 0, ec: 0, ph: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // 1. 초기 데이터 가져오기 (마지막 30개)
    supabase.from('sensor_readings')
      .select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => data && setHistory(data.reverse()));

    // 2. 실시간 구독
    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (p) => {
        setSensors(p.new);
        setHistory(prev => [...prev.slice(-29), p.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="layout">
      <header><h1>Glovera 스마트팜 모니터링</h1></header>
      
      <div className="grid">
        <div className="card"><h3>온도</h3><p>{sensors.temperature}°C</p></div>
        <div className="card"><h3>습도</h3><p>{sensors.humidity}%</p></div>
        <div className="card"><h3>EC</h3><p>{sensors.ec} ds/m</p></div>
        <div className="card"><h3>PH</h3><p>{sensors.ph}</p></div>
      </div>

      <section className="chart-area">
        <ChartClient data={history} />
      </section>

      <style jsx>{`
        .layout { min-height: 100vh; background: #020617; color: white; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .card { background: #1e293b; padding: 20px; border-radius: 16px; text-align: center; }
        .card h3 { color: #94a3b8; font-size: 0.9rem; }
        .card p { font-size: 1.5rem; font-weight: bold; margin-top: 10px; color: #38bdf8; }
        .chart-area { background: #0f172a; padding: 20px; border-radius: 20px; }
      `}</style>
    </div>
  );
}