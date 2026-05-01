'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { supabase } from '../../../lib/supabase';

export default function ChartPanel() {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  const load = async () => {
    const { data } = await supabase
      .from('sensor_readings')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);

    if (!data || !ref.current) return;

    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map(d =>
          new Date(d.created_at).toLocaleTimeString()
        ),
        datasets: [
          {
            label: '온도 (원본)',
            data: data.map(d => d.temperature),
            borderColor: 'red',
          },
          {
            label: '온도 (보정)',
            data: data.map(d => d.temperature * 0.98),
            borderColor: 'orange',
          },
          {
            label: '습도',
            data: data.map(d => d.humidity),
            borderColor: 'blue',
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
      },
    });
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  return <canvas ref={ref} />;
}