'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function Dashboard() {

  const [latest, setLatest] = useState<any>(null);

  // 🔥 데이터 로딩
  useEffect(() => {
    const load = async () => {
      if (!supabase) return;

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

  // 🔥 실시간 수신
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
        }
      )
      .subscribe();

    return () => {
      if (!supabase) return;
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 자동제어 (AI)
  const runAuto = async () => {
    if (!latest) return;

    await fetch('/api/auto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latest),
    });
  };

  // 🔥 자동 루프 (5초마다)
  useEffect(() => {
    const t = setInterval(() => {
      if (latest) runAuto();
    }, 5000);

    return () => clearInterval(t);
  }, [latest]);

  // 🔥 스케줄 실행 (예: 오전 8시~9시)
  const runSchedule = async () => {
    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_hour: 8,
        start_min: 0,
        end_hour: 9,
        end_min: 0
      }),
    });
  };

  return (
    <div style={{ padding: 20 }}>

      <h1>🌱 SMART FARM SYSTEM</h1>

      <p>온도: {latest?.temperature ?? '--'}</p>
      <p>습도: {latest?.humidity ?? '--'}</p>
      <p>EC: {latest?.ec ?? '--'}</p>
      <p>pH: {latest?.ph ?? '--'}</p>

      <hr />

      <button onClick={runAuto}>
        🤖 자동제어 실행
      </button>

      <button onClick={runSchedule}>
        ⏱ 스케줄 실행
      </button>

    </div>
  );
}