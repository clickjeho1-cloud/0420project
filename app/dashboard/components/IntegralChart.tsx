'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function IntegralChart({ data }: any) {
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

    let Iacc = 0;
    const I = error.map(e => Iacc += e * 0.1);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(ref.current, {
      type: 'line',
      data: {
        labels: t,
        datasets: [
          { label: 'Integral', data: I, borderColor: 'green' },
        ],
      },
      options: { animation: { duration: 500 } }
    });

  }, [data]);

  return <canvas ref={ref} />;
}