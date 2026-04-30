'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { supabase } from '../../../lib/supabase';

export function SmartFarmChart3() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(60);

      setRows(data || []);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || rows.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rows.map(() => ''),
        datasets: [
          {
            label: 'Temperature',
            borderColor: 'red',
            data: rows.map((r) => r.temperature),
          },
          {
            label: 'Humidity',
            borderColor: 'blue',
            data: rows.map((r) => r.humidity),
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
      },
    });
  }, [rows]);

  return <canvas ref={canvasRef} />;
}
