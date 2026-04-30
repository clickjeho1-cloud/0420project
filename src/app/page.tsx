
'use client';

import SmartFarmChart from './components/SmartFarmChart3';
import WeatherPanel from './components/WeatherPanel';

export default function Dashboard() {
  return (
    <div style={{ padding: 20 }}>

      <h1>스마트팜 통합 대시보드</h1>

      {/* 기상청 */}
      <WeatherPanel />

      {/* PID 그래프 */}
      <div style={{ marginTop: 20 }}>
        <h2>PID 제어 그래프</h2>
        <SmartFarmChart />
      </div>

      {/* 제어 UI */}
      <div style={{ marginTop: 20 }}>
        <h2>제어</h2>
        <button>펌프 ON</button>
        <button>팬 ON</button>
      </div>

    </div>
  );
}
