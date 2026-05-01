'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { supabase } from '../../../lib/supabase';

export default function SmartFarmChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      if (!data || data.length === 0 || !canvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      chartRef.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.map((d) =>
            new Date(d.created_at).toLocaleTimeString()
          ),
          datasets: [
            {
              label: '온도 (°C)',
              data: data.map((d) => d.temperature),
              borderColor: '#ef4444',
              tension: 0.3,
            },
            {
              label: '습도 (%)',
              data: data.map((d) => d.humidity),
              borderColor: '#3b82f6',
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          animation: false,
          plugins: {
            legend: {
              labels: {
                color: 'white',
              },
            },
          },
          scales: {
            x: {
              ticks: {
                color: 'white',
              },
            },
            y: {
              ticks: {
                color: 'white',
              },
            },
          },
        },
      });
    } catch (err) {
      console.error('Chart load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <p style={{ color: 'white' }}>📡 그래프 로딩 중...</p>;
  }

  return <canvas ref={canvasRef} />;
}