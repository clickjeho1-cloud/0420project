'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [Recharts, setRecharts] = useState<any>(null);
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, lux: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // 1. 브라우저에서만 실행되도록 설정
    setMounted(true);
    
    // 2. 런타임에 동적으로 로드하여 빌드 시 타입 에러 원천 차단
    import('recharts').then(mod => setRecharts(mod));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    // 초기 데이터 및 구독
    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data.reverse()); });

    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload: any) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!mounted || !Recharts) return <div style={{padding:'50px', color:'white'}}>로딩 중...</div>;

  const { PieChart, Pie, Cell } = Recharts;

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      <section className="panel" style={{display:'flex', gap:'20px'}}>
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="온도" value={sensors.temperature || 0} unit="°C" color="#f87171" />
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="습도" value={sensors.humidity || 0} unit="%" color="#60a5fa" />
      </section>
      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 30px; background: #020617; color: white; }
        .panel { background: rgba(30,41,59,0.5); padding: 20px; border-radius: 20px; margin-bottom: 20px; }
      `}</style>
    </div>
  );
}

function Gauge({ PieChart, Pie, Cell, title, value, unit, color }: any) {
  return (
    <div>
      <h3>{title}</h3>
      <PieChart width={150} height={150}>
        <Pie data={[{value: value}, {value: Math.max(0, 100-value)}]} startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value">
          <Cell fill={color} /><Cell fill="#1e293b" />
        </Pie>
      </PieChart>
      <div>{value}{unit}</div>
    </div>
  );
}