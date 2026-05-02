'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { supabase } from '../../../lib/supabase';

export default function ChartPanel() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  const [data, setData] = useState<any[]>([]);

  // 🔥 초기 데이터 로드
  useEffect(() => {
    const load = async () => {
      if (!supabase) return; // ✅ 핵심

      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(30);

      setData(data || []);
    };

    load();
  }, []);

  // 🔥 실시간 구독
  useEffect(() => {
    if (!supabase) return; // ✅ 핵심

    const channel = supabase
      .channel('realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
        },
        (payload) => {
          setData(prev => [...prev.slice(-29), payload.new]);
        }
      )
      .subscribe();

    return () => {
      if (!supabase) return; // ✅ 핵심 (마지막 에러 해결)
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 그래프 렌더링
  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const t = data.map((_, i) => i);
    const pv = data.map(d => d.temperature);
    const setpoint = t.map(() => 25);

    const error = setpoint.map((s, i) => s - pv[i]);

    let Iacc = 0;
    const I = error.map(e => Iacc += e * 0.1);
    const D = error.map((e, i) => i === 0 ? 0 : e - error[i - 1]);

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: t,
        datasets: [
          { label: 'Setpoint', data: setpoint, borderColor: 'red' },
          { label: 'PV', data: pv, borderColor: 'blue' },
          { label: 'Error', data: error, borderColor: 'orange' },
          { label: 'Integral', data: I, borderColor: 'green' },
          { label: 'Derivative', data: D, borderColor: 'purple' },
        ],
      },
      options: {
        animation: { duration: 500 },
        responsive: true,
      },
    });

  }, [data]);

  return <canvas ref={ref} />;
}