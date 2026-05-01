'use client';

export const dynamic = 'force-dynamic';

export default function Dashboard() {
  return (
    <div style={{ padding: 40 }}>
      <h1>🌱 스마트팜 대시보드</h1>

      <div>
        <p>온도: --</p>
        <p>습도: --</p>
        <p>상태: NO DATA</p>
      </div>
    </div>
  );
}