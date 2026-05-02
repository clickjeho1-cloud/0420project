'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

import PIDChart from './components/PIDChart';
import IntegralChart from './components/IntegralChart';
import OutputChart from './components/OutputChart';

import AlertPanel from './components/AlertPanel';
import ControlPanel from './components/ControlPanel';
import SchedulePanel from './components/SchedulePanel';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {

  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // 🔥 초기 데이터
  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(30);

      if (data) {
        setHistory(data);
        setLatest(data[data.length - 1]);
      }
    };

    load();
  }, []);

  // 🔥 실시간 데이터
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
        },
        (payload) => {
          setLatest(payload.new);
          setHistory(prev => [...prev.slice(-29), payload.new]);
        }
      )
      .subscribe();

    return () => {
      if (!supabase) return;
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container fade-in">

      <WeatherPanel />

      <h1>🌱 SMART FARM SYSTEM</h1>

      {/* 🔥 상태 카드 */}
      <div className="card-wrap">
        <Card title="온도" value={latest ? `${latest.temperature} °C` : '--'} />
        <Card title="습도" value={latest ? `${latest.humidity} %` : '--'} />
        <Card title="EC" value={latest?.ec ?? '--'} />
        <Card title="pH" value={latest?.ph ?? '--'} />
      </div>

      {/* 🔥 그래프 */}
      <div className="section">
        <h2>📊 PID 분석</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px'
        }}>
          <PIDChart data={history} />
          <IntegralChart data={history} />
          <OutputChart data={history} />
        </div>
      </div>

      {/* 🔥 경고 */}
      <div className="section">
        <AlertPanel data={latest} />
      </div>

      {/* 🔥 수동 제어 */}
      <div className="section">
        <ControlPanel />
      </div>

      {/* 🔥 스케줄 UI */}
      <div className="section">
        <SchedulePanel />
      </div>

    </div>
  );
}

// 카드 컴포넌트
function Card({ title, value }: any) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <p className="card-value">{value}</p>
    </div>
  );
}