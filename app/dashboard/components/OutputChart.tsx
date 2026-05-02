'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function OutputChart({ data }: any) {
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

    const D = error.map((e, i) => i === 0 ? 0 : e - error[i - 1]);

    let Iacc = 0;
    const I = error.map(e => Iacc += e * 0.1);

    const output = error.map((e, i) => {
      const kp = 1.5, ki = 0.05, kd = 0.2;
      return kp * e + ki * I[i] + kd * D[i];
    });

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: t,
        datasets: [
          { label: 'Derivative', data: D, borderColor: 'purple' },
          {
            label: 'Output',
            data: output,
            borderColor: 'red',
            borderDash: [5, 5]
          },
        ],
      },
      options: { animation: { duration: 500 } }
    });

  }, [data]);

  return <canvas ref={ref} />;
}