'use client';

export const dynamic = 'force-dynamic';

import ChartPanel from './components/ChartPanel';

export default function Dashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>🌱 스마트팜 대시보드</h1>

      <div style={{ marginTop: 20 }}>
        <ChartPanel />
      </div>
    </div>
  );
}