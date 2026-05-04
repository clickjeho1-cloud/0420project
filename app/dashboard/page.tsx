'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 이 파일에 'dynamic'은 한 글자도 들어가지 않습니다.
export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [Recharts, setRecharts] = useState<any>(null);
  const [sensors, setSensors] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    // 런타임에만 로드
    import('recharts').then(setRecharts);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );

    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data.length > 0) setSensors(data[0]); });

    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (p: any) => setSensors(p.new))
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!mounted || !Recharts || !sensors) return <div style={{padding:'50px', color:'white'}}>데이터 연결 중...</div>;

  const { PieChart, Pie, Cell } = Recharts;

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜</h1>
      <section className="panel" style={{display: 'flex', gap: '20px', justifyContent: 'center'}}>
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="온도" value={sensors.temperature || 0} unit="°C" color="#f87171" />
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="습도" value={sensors.humidity || 0} unit="%" color="#60a5fa" />
      </section>
      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 30px; background: #020617; color: white; }
        .panel { background: rgba(30,41,59,0.5); padding: 20px; border-radius: 20px; }
      `}</style>
    </div>
  );
}

function Gauge({ PieChart, Pie, Cell, title, value, unit, color }: any) {
  return (
    <div style={{textAlign: 'center'}}>
      <h3>{title}</h3>
      <PieChart width={150} height={150}>
        <Pie data={[{value: value}, {value: Math.max(0, 100 - value)}]} startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value">
          <Cell fill={color} /><Cell fill="#1e293b" />
        </Pie>
      </PieChart>
      <div style={{marginTop: '-40px', fontWeight:'bold'}}>{value}{unit}</div>
    </div>
  );
}