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
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 그래프 렌더
  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const t = data.map((_: any, i: number) => i);
    const pv = data.map(d => d.temperature);
    const setpoint = t.map(() => 25);

    const error = setpoint.map((s, i) => s - pv[i]);

    let Iacc = 0;
    const I = error.map(e => Iacc += e * 0.1);
    const D = error.map((e, i) => i === 0 ? 0 : e - error[i - 1]);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: t,
        datasets: [
          { label: 'Setpoint', data: setpoint, borderColor: 'red' },
          { label: 'PV', data: pv, borderColor: 'blue' },
          { label: 'Error', data: error, borderColor: 'orange' },
          { label: 'I', data: I, borderColor: 'green' },
          { label: 'D', data: D, borderColor: 'purple' },
        ],
      },
      options: {
        animation: {
          duration: 500,
        }
      }
    });

  }, [data]);

  return <canvas ref={ref} />;
}