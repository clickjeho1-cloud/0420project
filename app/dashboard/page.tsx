'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

import ChartPanel from './components/ChartPanel';
import AlertPanel from './components/AlertPanel';
import ControlPanel from './components/ControlPanel';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {
  const [latest, setLatest] = useState<any>(null);
  const [pidState, setPidState] = useState<any>(null);

  // 🔥 초기 데이터
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setLatest(data[0]);
      }
    };

    load();
  }, []);

  // 🔥 실시간 데이터
  useEffect(() => {
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
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 🔥 AI 자동제어 실행
  const runAI = async () => {
    if (!latest) return;

    const res = await fetch('/api/ai', {
      method: 'POST',
      body: JSON.stringify({
        temperature: latest.temperature,
      }),
    });

    const data = await res.json();
    setPidState(data.pid);
  };

  // 🔥 자동 반복 (AI 루프)
  useEffect(() => {
    const t = setInterval(() => {
      if (latest) runAI();
    }, 5000);

    return () => clearInterval(t);
  }, [latest]);

  return (
    <div className="container fade-in">

      <WeatherPanel />

      <h1>🌱 SMART FARM AI CONTROL</h1>

      {/* 상태 카드 */}
      <div className="card-wrap">
        <Card title="온도" value={latest ? `${latest.temperature} °C` : '--'} />
        <Card title="습도" value={latest ? `${latest.humidity} %` : '--'} />
        <Card title="상태" value={latest ? 'LIVE' : 'NO DATA'} />
      </div>

      {/* PID 그래프 */}
      <div className="section">
        <h2>📈 PID 그래프</h2>
        <ChartPanel />
      </div>

      {/* 경고 */}
      <div className="section">
        <AlertPanel data={latest} />
      </div>

      {/* 제어 */}
      <div className="section">
        <ControlPanel latest={latest} />

        <button onClick={runAI}>
          🧠 AI 자동제어 실행
        </button>
      </div>

      {/* AI 상태 */}
      {pidState && (
        <div className="section">
          <h3>🧠 AI PID 상태</h3>
          <p>Kp: {pidState.Kp.toFixed(2)}</p>
          <p>Ki: {pidState.Ki.toFixed(2)}</p>
          <p>Kd: {pidState.Kd.toFixed(2)}</p>
          <p>Error: {pidState.error.toFixed(2)}</p>
          <p>Output: {pidState.output.toFixed(2)}</p>
        </div>
      )}
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