'use client';

import { useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

type Row = {
  id?: number;
  created_at?: string;
  temperature?: number | null;
  humidity?: number | null;
  ec?: number | null;
  ph?: number | null;
  waterTemp?: number | null;
  lux?: number | null;
  fan?: boolean | null;
  pump?: boolean | null;
  led?: boolean | null;
  heater?: boolean | null;
};

export default function DashboardPage() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [time, setTime] = useState('');
  const [historyMode, setHistoryMode] = useState('1H');
  const [weather, setWeather] = useState({ temp: '--', wind: '--', source: '기상청 제공' });
  const [controls, setControls] = useState({ fan: false, pump: false, led: false, heater: false });
  const [sensors, setSensors] = useState<Row>({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    lux: 0,
  });
  const [history, setHistory] = useState<Row[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('Missing Supabase env vars');
      return;
    }

    const client = createClient(url, key);
    setSupabase(client);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      setTime(
        `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일 ${String(now.getHours()).padStart(2, '0')}시 ${String(now.getMinutes()).padStart(2, '0')}분 ${String(now.getSeconds()).padStart(2, '0')}초`
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) {
        console.error(error);
        return;
      }

      const rows = (data || []) as Row[];
      if (rows.length > 0) {
        setSensors(rows[0]);
        setHistory(rows.reverse());
      }
    };

    load();

    const channel = supabase
      .channel('sensor_readings_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings' },
        (payload) => {
          const row = payload.new as Row;
          setSensors(row);
          setHistory((prev) => [...prev.slice(-79), row]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const toggleControl = (key: keyof typeof controls) => {
    setControls((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!mounted) return null;

  return (
    <div className="dashboard">
      <h1 className="title">Glovera 농장 스마트팜 대시보드</h1>
      <div className="clock">{time}</div>

      <section className="panel glass-blue">
        <h2>실시간 상황 계기판</h2>
        <div className="grid">
          <GlassCard title="외부온도" value={weather.temp} />
          <GlassCard title="풍속" value={weather.wind} />
          <GlassCard title="온도" value={`${sensors.temperature ?? 0}°C`} />
          <GlassCard title="습도" value={`${sensors.humidity ?? 0}%`} />
          <GlassCard title="EC" value={`${sensors.ec ?? 0}`} />
          <GlassCard title="광량" value={`${sensors.lux ?? 0}`} />
        </div>
        <div className="source">{weather.source}</div>
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
            <Area type="monotone" dataKey="ec" stroke="#00ccff" fill="#00ccff" fillOpacity={0.2} />
            <Area type="monotone" dataKey="ph" stroke="#ffff00" fill="#ffff00" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      <section className="panel glass-history">
        <div className="history-top">
          <h2>센서 History</h2>
          <div className="history-buttons">
            {['1H', '12H', '24H', '7D'].map((item) => (
              <button key={item} onClick={() => setHistoryMode(item)}>{item}</button>
            ))}
          </div>
        </div>
        <div className="history-grid">
          <HistoryCard title="온도" value={`${sensors.temperature ?? 0}°C`} />
          <HistoryCard title="습도" value={`${sensors.humidity ?? 0}%`} />
          <HistoryCard title="EC" value={`${sensors.ec ?? 0}`} />
          <HistoryCard title="PH" value={`${sensors.ph ?? 0}`} />
        </div>
        <div className="log-box">현재 선택: {historyMode} 로그 출력 영역</div>
      </section>

      <section className="panel glass-control">
        <h2>제어 시스템</h2>
        <div className="control-grid">
          {(Object.keys(controls) as Array<keyof typeof controls>).map((key) => (
            <div key={key} className="control-card">
              <h3>{key.toUpperCase()}</h3>
              <div className="status">상태 : {controls[key] ? ' ON' : ' OFF'}</div>
              <button
                className={controls[key] ? 'btn-on' : 'btn-off'}
                onClick={() => toggleControl(key)}
              >
                {controls[key] ? 'TURN OFF' : 'TURN ON'}
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer className="footer">copyright@glovera orginated by jhk in 2026</footer>

      <style jsx>{`
        .dashboard { min-height: 100vh; padding: 20px; background: linear-gradient(180deg, #020617, #071226, #020617); color: white; }
        .title { font-size: 42px; color: #38bdf8; }
        .clock { margin-bottom: 30px; color: #94a3b8; }
        .panel { padding: 24px; border-radius: 24px; margin-bottom: 25px; backdrop-filter: blur(10px); }
        .glass-blue { background: linear-gradient(145deg, rgba(0,100,255,0.15), rgba(15,23,42,0.95)); }
        .glass-wave { background: linear-gradient(145deg, rgba(10,20,40,0.95), rgba(0,0,0,0.95)); }
        .glass-history { background: linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9)); }
        .glass-control { background: linear-gradient(145deg, rgba(20,40,60,0.95), rgba(5,10,25,0.95)); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .glass-card { padding: 22px; border-radius: 20px; background: rgba(255,255,255,0.05); }
        .glass-value { margin-top: 12px; font-size: 34px; color: #22d3ee; font-weight: bold; }
        .source { margin-top: 20px; color: #94a3b8; }
        .history-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .history-buttons { display: flex; gap: 10px; }
        .history-buttons button { background: #0f172a; border: none; color: white; padding: 10px 16px; border-radius: 12px; }
        .history-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
        .history-card { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; }
        .log-box { margin-top: 20px; background: rgba(0,0,0,0.4); padding: 20px; border-radius: 20px; color: #94a3b8; }
        .control-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; }
        .control-card { background: rgba(255,255,255,0.05); padding: 24px; border-radius: 20px; }
        .status { margin: 15px 0; }
        .btn-on, .btn-off { width: 100%; border: none; padding: 14px; border-radius: 14px; color: white; font-weight: bold; cursor: pointer; }
        .btn-on { background: #dc2626; }
        .btn-off { background: #16a34a; }
        .footer { text-align: center; margin-top: 40px; color: #64748b; padding-bottom: 30px; }
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

function HistoryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="history-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}