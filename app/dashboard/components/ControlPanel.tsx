// app/dashboard/components/ControlPanel.tsx
'use client';

import { useState } from 'react';

type DeviceState = {
  fan: boolean;
  pump: boolean;
  led: boolean;
  heater: boolean;
};

export default function ControlPanel() {
  const [state, setState] = useState<DeviceState>({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  const send = (
    key: keyof DeviceState,
    value: boolean
  ) => {
    setState((prev) => ({
      ...prev,
      [key]: value,
    }));

    console.log('SEND MQTT:', {
      device: key,
      value,
    });

    // MQTT publish 예시
    // client.publish(
    //   'farm/control',
    //   JSON.stringify({
    //     device: key,
    //     value,
    //   })
    // );
  };

  const deviceKeys: (keyof DeviceState)[] = [
    'fan',
    'pump',
    'led',
    'heater',
  ];

  return (
    <div className="control-panel">
      <h2 className="title">
        장치 제어 패널
      </h2>

      <div className="control-grid">
        {deviceKeys.map((key) => (
          <div
            key={key}
            className="control-item"
          >
            <p className="device-name">
              {key.toUpperCase()} :{' '}
              {state[key] ? 'ON' : 'OFF'}
            </p>

            <div className="button-group">
              <button
                className="on"
                onClick={() =>
                  send(key, true)
                }
              >
                ON
              </button>

              <button
                className="off"
                onClick={() =>
                  send(key, false)
                }
              >
                OFF
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .control-panel {
          width: 100%;
          padding: 20px;
          background: #111827;
          border-radius: 16px;
          color: white;
        }

        .title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
        }

        .control-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 16px;
        }

        .control-item {
          background: #1f2937;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #374151;
        }

        .device-name {
          font-size: 18px;
          margin-bottom: 12px;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
        }

        .on {
          background: #16a34a;
          color: white;
        }

        .off {
          background: #dc2626;
          color: white;
        }
      `}</style>
    </div>
  );
}