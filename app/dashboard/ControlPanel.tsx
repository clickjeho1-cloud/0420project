'use client';

export default function ControlPanel() {
  const send = async (cmd: string) => {
    await fetch('/api/control', {
      method: 'POST',
      body: JSON.stringify({ cmd }),
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <button onClick={() => send('PUMP_ON')}>펌프 ON</button>
      <button onClick={() => send('PUMP_OFF')}>펌프 OFF</button>
      <button onClick={() => send('FAN_ON')}>팬 ON</button>
      <button onClick={() => send('FAN_OFF')}>팬 OFF</button>
    </div>
  );
}