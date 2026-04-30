'use client';

import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import { supabase } from '@/lib/supabase';

export default function SmartFarmChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          { label: 'Sensor', borderColor: 'blue', data: [] },
          { label: 'Error', borderColor: 'orange', data: [] },
          { label: 'Integral', borderColor: 'green', data: [] },
          { label: 'Derivative', borderColor: 'purple', data: [] },
          { label: 'Output', borderColor: 'red', borderDash: [5,5], data: [] },
        ]
      },
      options: { animation: false }
    });

    loadData();

    const interval = setInterval(loadData, 3000);

    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const { data } = await supabase
      .from('sensor_pid')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data || data.length === 0) return;

    const rows = data.reverse();

    const chart = chartRef.current;

    chart.data.labels = rows.map(() => '');

    chart.data.datasets[0].data = rows.map(r => Number(r.sensor));
    chart.data.datasets[1].data = rows.map(r => Number(r.error));
    chart.data.datasets[2].data = rows.map(r => Number(r.integral));
    chart.data.datasets[3].data = rows.map(r => Number(r.derivative));
    chart.data.datasets[4].data = rows.map(r => Number(r.output));

    chart.update();
  }

  return <canvas ref={canvasRef} style={{ height: 300 }} />;
}
