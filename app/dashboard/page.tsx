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
  const [now, setNow] = useState('');

  // ===== 현재 시간 =====
  useEffect(() => {

    const t = setInterval(() => {

      const d = new Date();

      const str =
        d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString();

      setNow(str);

    }, 1000);

    return () => clearInterval(t);

  }, []);

  // ===== 초기 데이터 =====
  useEffect(() => {

    if (!supabase) return;

    const load = async () => {

      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', {
          ascending: true
        })
        .limit(50);

      if (!data) return;

      setHistory(data);

      if (data.length > 0) {
        setLatest(data[data.length - 1]);
      }

    };

    load();

  }, []);

  // ===== 실시간 =====
  useEffect(() => {

    if (!supabase) return;

    const channel = supabase
      .channel('smartfarm-live')

      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
        },

        (payload) => {

          const row = payload.new;

          setLatest(row);

          setHistory(prev => [

            ...prev.slice(-49),

            row

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

      {/* ===== 상단 ===== */}

      <div className="header-row">

        <h1>
          🌱 SMART FARM SYSTEM
        </h1>

        <div className="clock-box">
          {now}
        </div>

      </div>

      {/* ===== 상태 카드 ===== */}

      <div className="top-grid">

        <Stat
          title="온실온도"
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
          value={latest?.temperature ?? 0}
          max={50}
        />

        <Gauge
          label="습도"
          value={latest?.humidity ?? 0}
          max={100}
        />

        <Gauge
          label="광량"
          value={latest?.light ?? 0}
          max={3000}
        />

        <Gauge
          label="EC"
          value={latest?.ec ?? 0}
          max={3}
        />

      </div>

      {/* ===== 경고 ===== */}

      <div className="alert-bar">

        {
          latest?.temperature > 30 &&
          <span>🔥 고온</span>
        }

        {
          latest?.humidity < 40 &&
          <span>💧 건조</span>
        }

        {
          latest?.ec < 1.2 &&
          <span>⚠️ EC 낮음</span>
        }

        {
          !latest &&
          <span>
            데이터 대기중...
          </span>
        }

      </div>

      {/* ===== 실시간 그래프 ===== */}

      <div className="chart-grid">

        <LiveChart

          label="온도"

          data={history.map(h => ({
            created_at: h.created_at,
            value: h.temperature
          }))}

        />

        <LiveChart

          label="습도"

          data={history.map(h => ({
            created_at: h.created_at,
            value: h.humidity
          }))}

        />

        <LiveChart

          label="EC"

          data={history.map(h => ({
            created_at: h.created_at,
            value: h.ec || 0
          }))}

        />

      </div>

      {/* ===== 양액 ===== */}

      <div className="nutrient-box">

        <h3>
          🧪 양액 시스템
        </h3>

        <div className="nutrient-grid">

          <div>
            EC :
            {latest?.ec ?? '--'}
          </div>

          <div>
            pH :
            {latest?.ph ?? '--'}
          </div>

          <div>
            수온 :
            {latest?.water_temp ?? 22}
          </div>

          <div>
            누적광량 :
            {latest?.light_sum ?? 0}
          </div>

        </div>

      </div>

      {/* ===== 그룹 상태 ===== */}

      <div className="device-status">

        <h3>
          ⚡ 장치 상태
        </h3>

        <div className="device-grid">

          <Device
            name="FAN"
            on={latest?.fan}
          />

          <Device
            name="PUMP"
            on={latest?.pump}
          />

          <Device
            name="LED"
            on={latest?.led}
          />

          <Device
            name="HEATER"
            on={latest?.heater}
          />

        </div>

      </div>

      {/* ===== 장치 제어 ===== */}

      <ControlPanel
        latest={latest}
      />

      {/* ===== 스케줄 ===== */}

      <SchedulePanel />

    </div>

  );
}

// ===== 카드 =====

function Stat({
  title,
  value,
  unit
}: any) {

  return (

    <div className="stat">

      <p>{title}</p>

      <h2>
        {value ?? '--'}
        {unit}
      </h2>

    </div>

  );
}

// ===== 게이지 =====

function Gauge({
  label,
  value,
  max
}: any) {

  const safe =
    Math.min(
      100,
      Math.max(
        0,
        (value / max) * 100
      )
    );

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

          strokeDasharray={`
            ${safe * 2.5},
            251
          `}

          transform="
            rotate(-90 50 50)
          "
        />

      </svg>

      <p>{label}</p>

      <h3>{value}</h3>

    </div>

  );
}

// ===== 장치 상태 =====

function Device({
  name,
  on
}: any) {

  return (

    <div
      className={
        on
          ? 'device on-state'
          : 'device off-state'
      }
    >

      {name}

    </div>

  );
}