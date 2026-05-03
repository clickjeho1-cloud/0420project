// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  waterLevel: number;
  lux: number;
};

type DeviceState = {
  fan: boolean;
  pump: boolean;
  led: boolean;
  heater: boolean;
};

export default function DashboardPage() {
  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    waterLevel: 0,
    lux: 0,
  });

  const [devices, setDevices] = useState<DeviceState>({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  // 실시간 데이터 시뮬레이션
  // 나중에 MQTT subscribe로 교체
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors({
        temperature: +(22 + Math.random() * 8).toFixed(1),
        humidity: +(50 + Math.random() * 30).toFixed(1),
        ec: +(1.5 + Math.random()).toFixed(2),
        ph: +(5.5 + Math.random()).toFixed(2),
        waterTemp: +(18 + Math.random() * 6).toFixed(1),
        waterLevel: +(40 + Math.random() * 60).toFixed(0),
        lux: Math.floor(10000 + Math.random() * 50000),
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const toggleDevice = (
    key: keyof DeviceState,
    value: boolean
  ) => {
    setDevices((prev) => ({
      ...prev,
      [key]: value,
    }));

    console.log('MQTT SEND:', {
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
    <div className="dashboard">
      <h1 className="main-title">
        스마트팜 양액 시스템
      </h1>

      {/* 센서 패널 */}
      <div className="sensor-grid">
        <Card title="온도" value={`${sensors.temperature} °C`} />
        <Card title="습도" value={`${sensors.humidity} %`} />
        <Card title="EC" value={`${sensors.ec} ds/m`} />
        <Card title="pH" value={`${sensors.ph}`} />
        <Card title="양액 온도" value={`${sensors.waterTemp} °C`} />
        <Card title="수위" value={`${sensors.waterLevel} %`} />
        <Card title="광량" value={`${sensors.lux} lux`} />
      </div>

      {/* 양액 상태 */}
      <div className="nutrient-panel">
        <h2>양액 시스템 상태</h2>

        <div className="status-grid">
          <StatusBox
            label="EC 상태"
            value={
              sensors.ec >= 1.8
                ? '정상'
                : '낮음'
            }
          />

          <StatusBox
            label="pH 상태"
            value={
              sensors.ph >= 5.5 &&
              sensors.ph <= 6.5
                ? '정상'
                : '주의'
            }
          />

          <StatusBox
            label="물탱크"
            value={
              sensors.waterLevel < 20
                ? '부족'
                : '정상'
            }
          />
        </div>
      </div>

      {/* 장치 제어 */}
      <div className="control-panel">
        <h2>장치 제어</h2>

        <div className="control-grid">
          {deviceKeys.map((key) => (
            <div
              key={key}
              className="control-card"
            >
              <h3>{key.toUpperCase()}</h3>

              <p
                className={
                  devices[key]
                    ? 'on-text'
                    : 'off-text'
                }
              >
                {devices[key]
                  ? 'ON'
                  : 'OFF'}
              </p>

              <div className="btn-group">
                <button
                  className="on-btn"
                  onClick={() =>
                    toggleDevice(key, true)
                  }
                >
                  ON
                </button>

                <button
                  className="off-btn"
                  onClick={() =>
                    toggleDevice(key, false)
                  }
                >
                  OFF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 자동 관수 */}
      <div className="auto-panel">
        <h2>자동 관수 시스템</h2>

        <div className="auto-grid">
          <AutoCard
            title="시간 관수"
            desc="설정 시간 자동 공급"
          />

          <AutoCard
            title="간격 관수"
            desc="주기적 반복 공급"
          />

          <AutoCard
            title="광량 관수"
            desc="광량 기준 자동 공급"
          />

          <AutoCard
            title="그룹 제어"
            desc="구역별 제어"
          />
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #0f172a;
          color: white;
          padding: 20px;
        }

        .main-title {
          font-size: 36px;
          font-weight: bold;
          margin-bottom: 24px;
        }

        .sensor-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(180px, 1fr)
          );
          gap: 16px;
          margin-bottom: 24px;
        }

        .control-grid,
        .auto-grid,
        .status-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(220px, 1fr)
          );
          gap: 16px;
        }

        .card,
        .control-card,
        .auto-card,
        .status-box,
        .nutrient-panel,
        .control-panel,
        .auto-panel {
          background: #1e293b;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #334155;
        }

        .value {
          font-size: 28px;
          font-weight: bold;
          margin-top: 10px;
          color: #38bdf8;
        }

        .btn-group {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }

        button {
          flex: 1;
          border: none;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: bold;
        }

        .on-btn {
          background: #16a34a;
          color: white;
        }

        .off-btn {
          background: #dc2626;
          color: white;
        }

        .on-text {
          color: #4ade80;
          font-size: 24px;
          font-weight: bold;
        }

        .off-text {
          color: #f87171;
          font-size: 24px;
          font-weight: bold;
        }

        h2 {
          margin-bottom: 20px;
          font-size: 24px;
        }
      `}</style>
    </div>
  );
}

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="value">{value}</div>
    </div>
  );
}

function StatusBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="status-box">
      <h3>{label}</h3>
      <div className="value">{value}</div>
    </div>
  );
}

function AutoCard({
  title,
  desc,
}: {
  title: string;
  desc: string;
}) {
  return (
    <div className="auto-card">
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}