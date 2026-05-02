'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

import PIDChart from './components/PIDChart';
import IntegralChart from './components/IntegralChart';
import OutputChart from './components/OutputChart';

import AlertPanel from './components/AlertPanel';
import ControlPanel from './components/ControlPanel';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {
  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [autoStatus, setAutoStatus] = useState<any>(null);

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

  // 🔥 자동제어 함수 (핵심)
  const runAuto = async () => {
    if (!latest) return;

    try {
      const res = await fetch('/api/auto', {
        method: 'POST',
        body: JSON.stringify({
          temperature: latest.temperature,
          humidity: latest.humidity,
        }),
      });

      const data = await res.json();
      setAutoStatus(data.command);
    } catch (e) {
      console.error('auto error', e);
    }
  };

  // 🔥 자동 루프 (완전 자동 시스템)
  useEffect(() => {
    const t = setInterval(() => {
      if (latest) runAuto();
    }, 5000);

    return () => clearInterval(t);
  }, [latest]);

  return (
    <div className="container fade-in">

      <WeatherPanel />

      <h1>🌱 SMART FARM AUTO CONTROL</h1>

      {/* 상태 카드 */}
      <div className="card-wrap">
        <Card title="온도" value={latest ? `${latest.temperature} °C` : '--'} />
        <Card title="습도" value={latest ? `${latest.humidity} %` : '--'} />
        <Card title="상태" value={latest ? 'AUTO RUNNING' : 'NO DATA'} />
      </div>

      {/* 🔥 그래프 3개 */}
      <div className="section">
        <h2>📊 PID 분석</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <h3>🎯 PID 상태</h3>
            <PIDChart data={history} />
          </div>

          <div>
            <h3>📈 적분 (I)</h3>
            <IntegralChart data={history} />
          </div>

          <div>
            <h3>⚡ 출력 & 변화</h3>
            <OutputChart data={history} />
          </div>
        </div>
      </div>

      {/* 경고 */}
      <div className="section">
        <AlertPanel data={latest} />
      </div>

      {/* 제어 */}
      <div className="section">
        <ControlPanel latest={latest} />

        <button onClick={runAuto}>
          ⚙️ 수동 자동제어 실행
        </button>
      </div>

      {/* 🔥 자동제어 상태 */}
      {autoStatus && (
        <div className="section">
          <h3>🤖 자동제어 실행 결과</h3>
          <pre>{JSON.stringify(autoStatus, null, 2)}</pre>
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