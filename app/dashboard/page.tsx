'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import dynamic from 'next/dynamic';

// 1. Recharts 전체를 하나의 모듈로 가져와서 필요한 컴포넌트만 추출
const Recharts = dynamic(() => import('recharts'), { ssr: false });

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, lux: 0 });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!url || !key) return;

    const supabase = createClient(url, key);
    
    // 데이터 로드
    supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setHistory(data.reverse()); });

    const channel = supabase.channel('realtime_sensor')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload: any) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-19), payload.new]);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!mounted) return <div style={{padding:'50px', color:'white'}}>로딩 중...</div>;

  // 2. 렌더링 내부에서 Recharts 컴포넌트 접근
  const { PieChart, Pie, Cell } = (Recharts as any);

  return (
    <div className="dashboard">
      <h1>Glovera 농장 스마트팜 대시보드</h1>
      <section className="panel" style={{display: 'flex', gap: '20px'}}>
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="온도" value={sensors.temperature || 0} unit="°C" color="#f87171" />
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="습도" value={sensors.humidity || 0} unit="%" color="#60a5fa" />
        <Gauge PieChart={PieChart} Pie={Pie} Cell={Cell} title="광량" value={Math.min((sensors.lux || 0)/500, 100)} unit="%" color="#fbbf24" />
      </section>
      {/* 스타일은 동일 */}
    </div>
  );
}

// 3. Gauge 컴포넌트가 위에서 전달받은 컴포넌트를 사용하도록 수정
function Gauge({ PieChart, Pie, Cell, title, value, unit, color }: any) {
  return (
    <div>
      <h3>{title}</h3>
      <PieChart width={150} height={150}>
        <Pie data={[{value: value}, {value: Math.max(0, 100-value)}]} startAngle={180} endAngle={0} innerRadius={50} outerRadius={70} dataKey="value">
          <Cell fill={color} /><Cell fill="#1e293b" />
        </Pie>
      </PieChart>
      <div style={{marginTop: '-40px', fontWeight:'bold'}}>{value}{unit}</div>
    </div>
  );
}