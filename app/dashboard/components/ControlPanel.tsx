'use client';

type Props = {
  latest: any;
};

export default function ControlPanel({ latest }: Props) {

  const sendManual = async () => {
    if (!latest) return;

    await fetch('/api/control', {
      method: 'POST',
      body: JSON.stringify({
        cmd_type: 'manual',
        devices: {
          fan: { pwm: 50 },
        },
      }),
    });
  };

  return (
    <div>
      <h3>🎮 제어</h3>

      <button onClick={sendManual}>
        팬 50% 실행
      </button>
    </div>
  );
}