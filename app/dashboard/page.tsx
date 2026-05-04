'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

// 1. 빌드 타임 환경 변수 방어
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// 2. 컴포넌트를 분리하지 않고 파일 내에서 안전하게 로드
const ChartClient = dynamic(
  async () => {
    const mod = await import('recharts');
    return ({ data }: { data: any[] }) => (
      <mod.ResponsiveContainer width="100%" height={300}>
        <mod.AreaChart data={data}>
          <mod.CartesianGrid stroke="#334155" />
          <mod.XAxis dataKey="created_at" tickFormatter={(t: string) => t.slice(11, 16)} />
          <mod.YAxis />
          <mod.Tooltip contentStyle={{ background: '#0f172a', border: 'none' }} />
          <mod.Area type="monotone" dataKey="temperature" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
        </mod.AreaChart>
      </mod.ResponsiveContainer>
    );
  },
  { ssr: false, loading: () => <div style={{height: 300, display: 'flex', alignItems:'center', justifyContent:'center'}}>데이터 로딩 중...</div> }
);

export default function DashboardPage() {
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, ph: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 데이터 로직
    supabase.from('sensor_readings')
      .select('*').order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => data && setHistory(data.reverse()));

    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (p: any) => {
        setSensors(p.new);
        setHistory(prev => [...prev.slice(-29), p.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!mounted) return <div style={{background:'#020617', minHeight:'100vh', color:'white', padding:20}}>Initializing...</div>;

  return (
    <div style={{minHeight: '100vh', background: '#020617', color: 'white', padding: '20px'}}>
      <h1>Glovera 스마트팜</h1>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '20px'}}>
        <div style={{background: '#1e293b', padding: '20px', borderRadius: '16px'}}><h3>온도</h3><p>{sensors.temperature}°C</p></div>
        <div style={{background: '#1e293b', padding: '20px', borderRadius: '16px'}}><h3>습도</h3><p>{sensors.humidity}%</p></div>
      </div>
      <section style={{background: '#0f172a', padding: '20px', borderRadius: '20px'}}>
        <ChartClient data={history} />
      </section>
    </div>
  );
}