'use client';

export default function ControlPanel() {

  const send = async (devices: any) => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd_type: 'manual',
        devices
      }),
    });
  };

  return (
    <div className="control-panel">

      <h3>🎮 수동 제어</h3>

      <div className="control-grid">

        {/* 팬 */}
        <div>
          <p>🌀 팬</p>
          <button onClick={() => send({ fan: { pwm: 80 } })}>ON</button>
          <button onClick={() => send({ fan: { pwm: 0 } })}>OFF</button>
        </div>

        {/* 펌프 */}
        <div>
          <p>💧 펌프</p>
          <button onClick={() => send({ pump: { on: true, duration_sec: 30 } })}>ON</button>
          <button onClick={() => send({ pump: { on: false } })}>OFF</button>
        </div>

        {/* LED */}
        <div>
          <p>💡 LED</p>
          <button onClick={() => send({ led: { pwm: 100 } })}>ON</button>
          <button onClick={() => send({ led: { pwm: 0 } })}>OFF</button>
        </div>

        {/* 히터 */}
        <div>
          <p>🔥 히터</p>
          <button onClick={() => send({ heater: { on: true } })}>ON</button>
          <button onClick={() => send({ heater: { on: false } })}>OFF</button>
        </div>

      </div>

      <hr />

      <h3>🤖 자동 제어</h3>
      <button
        onClick={() => {
          fetch('/api/auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        }}
      >
        자동제어 실행
      </button>

    </div>
  );
}