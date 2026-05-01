'use client';

import ChartPanel from './components/ChartPanel';
import WeatherPanel from './components/WeatherPanel';
import ControlPanel from './components/ControlPanel';

export default function Dashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>🌱 스마트팜 통합 대시보드</h1>

      <div style={{ marginBottom: 30 }}>
        <WeatherPanel />
      </div>

      <div style={{ marginBottom: 30 }}>
        <ChartPanel />
      </div>

      <div>
        <ControlPanel />
      </div>
    </div>
  );
}