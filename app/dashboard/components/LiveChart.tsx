'use client';

import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js';

import { Line } from 'react-chartjs-2';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
);

export default function LiveChart({ data, label }: any) {

  const chartData = {

    labels: data.map((d: any) =>
      new Date(d.created_at)
        .toLocaleTimeString()
    ),

    datasets: [
      {
        label,

        data: data.map(
          (d: any) => d.value
        ),

        borderColor: '#00e5ff',

        backgroundColor:
          'rgba(0,229,255,0.2)',

        tension: 0.4,

        fill: true
      }
    ]
  };

  return (
    <div className="chart">

      <Line data={chartData} />

    </div>
  );
}