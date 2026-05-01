'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { supabase } from '../../../lib/supabase';

export function SmartFarmChart3() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (!data || !canvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      if (chartRef.current) chartRef.current.destroy();

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map(() => ''),
          datasets: [
            {
              label: '온도',
              borderColor: '#ef4444',
              data: data.map((d) => d.temperature),
            },
            {
              label: '습도',
              borderColor: '#3b82f6',
              data: data.map((d) => d.humidity),
            },
          ],
        },
        options: {
          responsive: true,
          animation: false,
        },
      });
    };

    load();
    const interval = setInterval(load, 3000);

    return () => clearInterval(interval);
  }, []);

  return <canvas ref={canvasRef} />;
}
