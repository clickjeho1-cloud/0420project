'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function ChartPanel() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: ['1','2','3','4','5'],
        datasets: [
          {
            label: '온도',
            data: [22,23,24,25,24],
            borderColor: 'red',
          },
          {
            label: '습도',
            data: [50,52,55,53,54],
            borderColor: 'blue',
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
      },
    });

    return () => chart.destroy();
  }, []);

  return <canvas ref={ref} />;
}