export default function Home() {
  return (
    <div style={container}>
      <h1 style={title}>🌱 스마트팜 시스템</h1>

      <p style={desc}>
        센서 데이터 모니터링 및 제어 시스템
      </p>

      <a href="/dashboard" style={button}>
        👉 대시보드 바로가기
      </a>
    </div>
  );
}

// ===== 스타일 =====
const container = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column' as const,
  justifyContent: 'center',
  alignItems: 'center',
  background: '#0f172a',
  color: 'white',
  fontFamily: 'sans-serif',
};

const title = {
  fontSize: '32px',
  marginBottom: '10px',
};

const desc = {
  marginBottom: '20px',
  color: '#94a3b8',
};

const button = {
  padding: '12px 20px',
  background: '#22c55e',
  borderRadius: '8px',
  color: 'white',
  textDecoration: 'none',
  fontWeight: 'bold',
};
