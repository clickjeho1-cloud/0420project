'use client';

import { useEffect, useState } from 'react';

export default function ControlPanel({ latest }: any) {

  const [state, setState] = useState({
    fan: false,
    pump: false,
    led: false,
    heater: false
  });

  useEffect(() => {
    if (!latest) return;
    setState({
      fan: latest.fan,
      pump: latest.pump,
      led: latest.led,
      heater: latest.heater
    });
  }, [latest]);

  const send = async (devices: any) => {
    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cmd_type: 'manual', devices }),
    });
  };

  return (
    <div className="control">

      <h3>🎮 장치 제어</h3>

      {['fan','pump','led','heater'].map((key) => (
        <div key={key} className="control-item">
          <p>{key.toUpperCase()} : {state[key] ? 'ON' : 'OFF'}</p>

          <button className="on"
            onClick={() => send({ [key]: key==='fan'||key==='led'
              ? { pwm:100 }
              : { on:true } })}>
            ON
          </button>

          <button className="off"
            onClick={() => send({ [key]: key==='fan'||key==='led'
              ? { pwm:0 }
              : { on:false } })}>
            OFF
          </button>
        </div>
      ))}

    </div>
  );
}