'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [time, setTime] = useState('');
  const [historyMode, setHistoryMode] = useState('1H');
  const [sensors, setSensors] = useState<any>({ temperature: 0, humidity: 0, ec: 0, ph: 0, waterTemp: 0, lux: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [controls, setControls] = useState({ fan: false, pump: false, led: false, heater: false });

  // 1. 실시간 데이터 구독 및 초기화
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('sensor_readings').select('*').order('created_at', { ascending: false }).limit(80);
      if (data) {
        setSensors(data[0] || {});
        setHistory(data.reverse());
      }
    };
    fetchData();

    const channel = supabase
      .channel('sensor_readings_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sensor_readings' }, (payload) => {
        setSensors(payload.new);
        setHistory(prev => [...prev.slice(-79), payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 2. 시계 및 나머지 UI 로직 유지
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(`${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}시 ${String(now.getMinutes()).padStart(2, '0')}분 ${String(now.getSeconds()).padStart(2, '0')}초`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleControl = async (key: keyof typeof controls) => {
    const newState = !controls[key];
    setControls(prev => ({ ...prev, [key]: newState }));
    // DB 업데이트가 필요하다면 여기에 supabase.from('sensor_readings').insert(...) 등을 추가
    console.log('MQTT SEND', key, newState);
  };

  return (
    <div className="dashboard">
      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      <section className="panel glass-blue">
        <h2>실시간 상황 계기판</h2>
        <div className="grid">
          <GlassCard title="온도" value={`${sensors.temperature || 0}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity || 0}%`} />
          <GlassCard title="EC" value={`${sensors.ec || 0}`} />
          <GlassCard title="광량" value={`${sensors.lux || 0}`} />
        </div>
      </section>

      <section className="panel glass-wave">
        <h2>실시간 업다운 파형 분석</h2>
        <ResponsiveContainer width="100%" height={400}>
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

      <section className="panel glass-control">
        <h2>제어 시스템</h2>
        <div className="control-grid">
          {(Object.keys(controls) as Array<keyof typeof controls>).map(key => (
            <div key={key} className="control-card">
              <h3>{key.toUpperCase()}</h3>
              <button className={controls[key] ? 'btn-on' : 'btn-off'} onClick={() => toggleControl(key)}>
                {controls[key] ? 'TURN OFF' : 'TURN ON'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 20px; background: linear-gradient(180deg, #020617, #071226); color: white; }
        .panel { padding: 24px; border-radius: 24px; margin-bottom: 25px; background: rgba(255,255,255,0.05); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .glass-card { padding: 22px; border-radius: 20px; background: rgba(255,255,255,0.05); }
        .glass-value { margin-top: 12px; font-size: 34px; color: #22d3ee; font-weight: bold; }
        .btn-on { width: 100%; border: none; padding: 14px; border-radius: 14px; color: white; font-weight: bold; cursor: pointer; background: #dc2626; }
        .btn-off { width: 100%; border: none; padding: 14px; border-radius: 14px; color: white; font-weight: bold; cursor: pointer; background: #16a34a; }
      `}</style>
    </div>
  );
}

function GlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="glass-card">
      <h3>{title}</h3>
      <div className="glass-value">{value}</div>
    </div>
  );
}