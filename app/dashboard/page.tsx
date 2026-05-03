'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

import ControlPanel from './components/ControlPanel';
import SchedulePanel from './components/SchedulePanel';
import LiveChart from './components/LiveChart';

export default function Dashboard() {

  const [latest, setLatest] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  // ===== 초기 데이터 =====
  useEffect(() => {

    if (!supabase) return;

    const load = async () => {

      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) {
        setHistory(data);

        if (data.length > 0) {
          setLatest(data[data.length - 1]);
        }
      }
    };

    load();

  }, []);

  // ===== 실시간 데이터 =====
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

          setHistory((prev) => [
            ...prev.slice(-49),
            payload.new
          ]);

        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

  }, []);

  return (
    <div className="dash">

      {/* ===== 상단 상태 ===== */}
      <div className="top-grid">

        <Stat
          title="온도"
          value={latest?.temperature}
          unit="°C"
        />

        <Stat
          title="습도"
          value={latest?.humidity}
          unit="%"
        />

        <Stat
          title="광량"
          value={latest?.light ?? 1800}
          unit="lux"
        />

        <Stat
          title="CO2"
          value={latest?.co2 ?? 500}
          unit="ppm"
        />

      </div>

      {/* ===== 원형 게이지 ===== */}
      <div className="gauge-grid">

        <Gauge
          label="온도"
          value={latest?.temperature ?? 25}
          max={50}
        />

        <Gauge
          label="습도"
          value={latest?.humidity ?? 60}
          max={100}
        />

        <Gauge
          label="광량"
          value={latest?.light ?? 1800}
          max={3000}
        />

        <Gauge
          label="EC"
          value={latest?.ec ?? 1.5}
          max={3}
        />

      </div>

      {/* ===== 경고 ===== */}
      <div className="alert-bar">

        {latest?.temperature > 30 &&
          <span>🔥 고온 경고</span>
        }

        {latest?.humidity < 40 &&
          <span>💧 습도 낮음</span>
        }

        {latest?.ec < 1.2 &&
          <span>⚠️ EC 부족</span>
        }

      </div>

      {/* ===== 실시간 그래프 ===== */}
      <div className="chart-grid">

        <LiveChart
          label="온도"
          data={history.map((h) => ({
            created_at: h.created_at,
            value: h.temperature
          }))}
        />

        <LiveChart
          label="습도"
          data={history.map((h) => ({
            created_at: h.created_at,
            value: h.humidity
          }))}
        />

        <LiveChart
          label="EC"
          data={history.map((h) => ({
            created_at: h.created_at,
            value: h.ec || 0
          }))}
        />

      </div>

      {/* ===== 양액 시스템 ===== */}
      <div className="nutrient-box">

        <h3>🧪 양액 시스템</h3>

        <p>EC : {latest?.ec}</p>
        <p>pH : {latest?.ph}</p>
        <p>수온 : {latest?.water_temp ?? 22}</p>

      </div>

      {/* ===== 장치 제어 ===== */}
      <ControlPanel latest={latest} />

      {/* ===== 스케줄 ===== */}
      <SchedulePanel />

    </div>
  );
}

// ===== 상태 카드 =====
function Stat({ title, value, unit }: any) {

  return (
    <div className="stat">

      <p>{title}</p>

      <h2>
        {value ?? '--'} {unit}
      </h2>

    </div>
  );
}

// ===== 원형 게이지 =====
function Gauge({ label, value, max }: any) {

  const percent = (value / max) * 100;

  return (
    <div className="gauge">

      <svg viewBox="0 0 100 100">

        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#222"
          strokeWidth="8"
          fill="none"
        />

        <circle
          cx="50"
          cy="50"
          r="40"
          stroke="#00e5ff"
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${percent * 2.5}, 251`}
          transform="rotate(-90 50 50)"
        />

      </svg>

      <p>{label}</p>

      <h3>{value}</h3>

    </div>
  );
}