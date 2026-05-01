'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function Dashboard() {
  return (
    <div style={container}>
      <h1 style={title}>🌱 스마트팜 대시보드</h1>

      <p style={desc}>
        시스템 연결 정상 / 라우팅 정상 확인 완료
      </p>

      <div style={cardWrap}>
        <div style={card}>
          <h3>온도</h3>
          <p style={value}>-- °C</p>
        </div>

        <div style={card}>
          <h3>습도</h3>
          <p style={value}>-- %</p>
        </div>

        <div style={card}>
          <h3>상태</h3>
          <p style={value}>READY</p>
        </div>
      </div>

      <div style={nav}>
        <Link href="/" style={btn}>
          ⬅ 홈으로
        </Link>
      </div>
    </div>
  );
}

// ===== 스타일 =====
const container = {
  padding: '40px',
  background: '#0f172a',
  minHeight: '100vh',
  color: 'white',
  fontFamily: 'sans-serif',
};

const title = {
  fontSize: '32px',
  marginBottom: '10px',
};

const desc = {
  marginBottom: '30px',
  color: '#94a3b8',
};

const cardWrap = {
  display: 'flex',
  gap: '16px',
  marginBottom: '30px',
};

const card = {
  flex: 1,
  background: '#1e293b',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center' as const,
};

const value = {
  fontSize: '28px',
  fontWeight: 'bold',
};

const nav = {
  marginTop: '20px',
};

const btn = {
  padding: '10px 18px',
  background: '#22c55e',
  borderRadius: '8px',
  color: 'white',
  textDecoration: 'none',
  fontWeight: 'bold',
};