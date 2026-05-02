'use client';

type Props = {
  latest: any;
};

export default function ControlPanel({ latest }: Props) {

  const send = async (devices: any) => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }, // 🔥 중요
      body: JSON.stringify({
        cmd_type: 'manual',   // 🔥 반드시 포함
        devices
      }),
    });
  };

  return (
    <div>

      <h3>🎮 장치 제어</h3>

      <button onClick={() => send({ fan: { pwm: 80 } })}>
        🌀 팬 80%
      </button>

      <button onClick={() => send({ pump: { on: true, duration_sec: 30 } })}>
        💧 펌프 30초
      </button>

      <button onClick={() => send({ led: { pwm: 100 } })}>
        💡 LED ON
      </button>

      <button onClick={() => send({ heater: { on: true } })}>
        🔥 히터 ON
      </button>

    </div>
  );
}