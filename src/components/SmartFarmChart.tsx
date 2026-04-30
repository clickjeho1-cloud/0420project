'use client';

import { useEffect, useRef, useState } from 'react';
import { Chart } from 'chart.js/auto';
import { supabase } from '@/lib/supabase';

type Row = {
  temperature: number;
  humidity: number;
  created_at: string;
};

export function SmartFarmChart3() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  const [rows, setRows] = useState<Row[]>([]);

  // 🔥 최초 데이터 로드
  useEffect(() => {
    const fetchInitial = async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(60);

      if (!error && data) {
        setRows(data as Row[]);
      }
    };

    fetchInitial();
  }, []);

  // 🔥 실시간 INSERT 감지
  useEffect(() => {
    const channel = supabase
      .channel('sensor_readings_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
        },
        (payload) => {
          const newRow = payload.new as Row;

          setRows((prev) => {
            const updated = [...prev, newRow];
            return updated.slice(-60); // 최근 60개 유지
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 🔥 차트 생성 / 업데이트
  useEffect(() => {
    if (!canvasRef.current || rows.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // 기존 차트 제거
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: rows.map(() => ''),
        datasets: [
          {
            label: 'Temperature (°C)',
            borderColor: 'red',
            backgroundColor: 'rgba(255,0,0,0.1)',
            data: rows.map((r) => r.temperature),
            tension: 0.3,
          },
          {
            label: 'Humidity (%)',
            borderColor: 'blue',
            backgroundColor: 'rgba(0,0,255,0.1)',
            data: rows.map((r) => r.humidity),
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: false,
          },
          y: {
            beginAtZero: false,
          },
        },
        plugins: {
          legend: {
            labels: {
              color: 'white',
            },
          },
        },
      },
    });
  }, [rows]);

  return (
    <div
      style={{
        width: '100%',
        height: '320px',
        background: '#0f172a',
        borderRadius: '10px',
        padding: '10px',
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
