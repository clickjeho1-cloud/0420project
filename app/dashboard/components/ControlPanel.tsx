'use client';

import { useState } from 'react';

export default function ControlPanel() {

  const [state, setState] = useState({
    fan: false,
    pump: false,
    led: false,
    heater: false
  });

  const send = async (devices: any, key: string, value: boolean) => {

    await fetch('/api/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cmd_type: 'manual',
        devices
      }),
    });

    // 🔥 UI 상태 업데이트
    setState(prev => ({ ...prev, [key]: value }));
  };

  const btnStyle = (on: boolean) => ({
    padding: '10px 15px',
    margin: '5px',
    borderRadius: '8px',
    border: 'none',
    color: '#fff',
    fontWeight: 'bold',
    cursor: 'pointer',
    backgroundColor: on ? '#2196f3' : '#f44336', // 🔵 / 🔴
  });

  return (
    <div className="control-panel">

      <h3>🎮 장치 제어</h3>

      {/* FAN */}
      <div>
        <p>🌀 팬 상태: {state.fan ? 'ON' : 'OFF'}</p>
        <button
          style={btnStyle(true)}
          onClick={() => send({ fan: { pwm: 80 } }, 'fan', true)}
        >
          ON
        </button>

        <button
          style={btnStyle(false)}
          onClick={() => send({ fan: { pwm: 0 } }, 'fan', false)}
        >
          OFF
        </button>
      </div>

      {/* PUMP */}
      <div>
        <p>💧 펌프 상태: {state.pump ? 'ON' : 'OFF'}</p>
        <button
          style={btnStyle(true)}
          onClick={() => send({ pump: { on: true, duration_sec: 30 } }, 'pump', true)}
        >
          ON
        </button>

        <button
          style={btnStyle(false)}
          onClick={() => send({ pump: { on: false } }, 'pump', false)}
        >
          OFF
        </button>
      </div>

      {/* LED */}
      <div>
        <p>💡 LED 상태: {state.led ? 'ON' : 'OFF'}</p>
        <button
          style={btnStyle(true)}
          onClick={() => send({ led: { pwm: 100 } }, 'led', true)}
        >
          ON
        </button>

        <button
          style={btnStyle(false)}
          onClick={() => send({ led: { pwm: 0 } }, 'led', false)}
        >
          OFF
        </button>
      </div>

      {/* HEATER */}
      <div>
        <p>🔥 히터 상태: {state.heater ? 'ON' : 'OFF'}</p>
        <button
          style={btnStyle(true)}
          onClick={() => send({ heater: { on: true } }, 'heater', true)}
        >
          ON
        </button>

        <button
          style={btnStyle(false)}
          onClick={() => send({ heater: { on: false } }, 'heater', false)}
        >
          OFF
        </button>
      </div>

    </div>
  );
}