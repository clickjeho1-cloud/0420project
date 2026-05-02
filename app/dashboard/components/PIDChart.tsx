'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import annotationPlugin from 'chartjs-plugin-annotation';

Chart.register(annotationPlugin);

export default function PIDChart({ data }: any) {
  const ref = useRef<any>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!ref.current) return;

    const t = Array.from({ length: 30 }, (_, i) => i);

    const pv = data?.length
      ? data.map((d: any) => d.temperature)
      : t.map(i => 20 + Math.sin(i / 3) * 3);

    const setpoint = t.map(() => 25);
    const error = setpoint.map((s, i) => s - pv[i]);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: t,
        datasets: [
          { label: 'Setpoint', data: setpoint, borderColor: 'red' },
          { label: 'PV', data: pv, borderColor: 'blue' },
          { label: 'Error', data: error, borderColor: 'orange' },
        ],
      },
      options: {
        animation: { duration: 500 },
        plugins: {
          annotation: {
            annotations: {
              dangerZone: {
                type: 'box',
                yMin: 30,
                yMax: 50,
                backgroundColor: 'rgba(255,0,0,0.1)'
              },
              warningLine: {
                type: 'line',
                yMin: 30,
                yMax: 30,
                borderColor: 'red',
                borderWidth: 2,
                label: {
                  display: true,
                  content: '온도 위험선',
                  position: 'end'
                }
              },
              targetLine: {
                type: 'line',
                yMin: 25,
                yMax: 25,
                borderColor: 'green',
                borderWidth: 1,
                label: {
                  display: true,
                  content: '목표값'
                }
              }
            }
          }
        }
      }
    });

  }, [data]);

  return <canvas ref={ref} />;
}