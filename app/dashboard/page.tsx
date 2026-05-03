
'use client';

import { useEffect, useState } from 'react';

interface SensorData {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
}

interface DeviceState {
  fan: boolean;
  pump: boolean;
  led: boolean;
  heater: boolean;
}

export default function DashboardPage() {
  const [time, setTime] = useState('');

  const [sensors, setSensors] = useState<SensorData>({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    waterTemp: 0,
    lux: 0,
  });

  const [devices, setDevices] = useState<DeviceState>({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  const [speedValue, setSpeedValue] = useState(0);
  const [freqData, setFreqData] = useState<number[]>([]);
  const [barData, setBarData] = useState<number[]>([]);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const weekdays = [
        '일요일',
        '월요일',
        '화요일',
        '수요일',
        '목요일',
        '금요일',
        '토요일',
      ];

      const formatted = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${weekdays[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}시 ${String(now.getMinutes()).padStart(2, '0')}분`;

      setTime(formatted);
    };

    updateClock();

    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors({
        temperature: +(22 + Math.random() * 8).toFixed(1),
        humidity: +(50 + Math.random() * 25).toFixed(1),
        ec: +(1.5 + Math.random()).toFixed(2),
        ph: +(5.5 + Math.random()).toFixed(2),
        waterTemp: +(18 + Math.random() * 5).toFixed(1),
        lux: Math.floor(10000 + Math.random() * 50000),
      });

      setSpeedValue(Math.floor(20 + Math.random() * 80));

      setFreqData(
        Array.from({ length: 20 }, () =>
          Math.floor(Math.random() * 100)
        )
      );

      setBarData(
        Array.from({ length: 12 }, () =>
          Math.floor(Math.random() * 100)
        )
      );
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

    // MQTT 연결 시 사용
    // client.publish(
    //   'farm/control',
    //   JSON.stringify({
    //     device: key,
    //     value,
    //   })
    // );
  };

  const weather = {
    city: '서울',
    sky: '맑음',
    outsideTemp: 26,
    wind: 2.4,
    rain: '0mm',
  };

  return (
    <div className="dashboard">
      <div className="top-header">
        <h1>Glovera 농장 스마트팜 대시보드</h1>
        <p className="clock">{time}</p>
      </div>

      <div className="weather-box">
        <h2>실시간 기상청 정보</h2>

        <div className="weather-grid">
          <div className="weather-card">
            <h3>지역</h3>
            <p>{weather.city}</p>
          </div>

          <div className="weather-card">
            <h3>날씨</h3>
            <p>{weather.sky}</p>
          </div>

          <div className="weather-card">
            <h3>외부 온도</h3>
            <p>{weather.outsideTemp}°C</p>
          </div>

          <div className="weather-card">
            <h3>풍속</h3>
            <p>{weather.wind}m/s</p>
          </div>

          <div className="weather-card">
            <h3>강수량</h3>
            <p>{weather.rain}</p>
          </div>
        </div>
      </div>

      <div className="sensor-grid">
        <SensorCard title="온도" value={`${sensors.temperature} °C`} />
        <SensorCard title="습도" value={`${sensors.humidity} %`} />
        <SensorCard title="EC" value={`${sensors.ec} ds/m`} />
        <SensorCard title="pH" value={`${sensors.ph}`} />
        <SensorCard title="양액 온도" value={`${sensors.waterTemp} °C`} />
        <SensorCard title="광량" value={`${sensors.lux} lux`} />
      </div>

      <div className="graph-section">
        <div className="graph-box">
          <h2>3색 스피드 속도계 그래프</h2>

          <div className="gauge-wrapper">
            <div className="gauge">
              <div
                className="gauge-fill"
                style={{
                  transform: `rotate(${speedValue * 1.8}deg)`,
                }}
              />

              <div className="gauge-center">
                {speedValue}
              </div>
            </div>
          </div>
        </div>

        <div className="graph-box">
          <h2>주파수 그래프</h2>

          <div className="frequency-graph">
            {freqData.map((value, index) => (
              <div
                key={index}
                className="freq-bar"
                style={{ height: `${value}%` }}
              />
            ))}
          </div>
        </div>

        <div className="graph-box">
          <h2>실시간 움직이는 막대 그래프</h2>

          <div className="moving-bars">
            {barData.map((value, index) => (
              <div key={index} className="moving-item">
                <div
                  className="moving-bar"
                  style={{ height: `${value}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="nutrient-panel">
        <h2>양액 시스템 상태</h2>

        <div className="nutrient-grid">
          <StatusCard
            title="EC 상태"
            value={sensors.ec > 1.7 ? '정상' : '낮음'}
          />

          <StatusCard
            title="pH 상태"
            value={
              sensors.ph >= 5.5 && sensors.ph <= 6.5
                ? '정상'
                : '주의'
            }
          />

          <StatusCard
            title="배지 상태"
            value={'안정'}
          />

          <StatusCard
            title="양액 순환"
            value={devices.pump ? '동작중' : '정지'}
          />
        </div>
      </div>

      <div className="control-panel">
        <h2>제어 시스템</h2>

        <div className="control-grid">
          {(
            ['fan', 'pump', 'led', 'heater'] as (keyof DeviceState)[]
          ).map((key) => (
            <div key={key} className="control-card">
              <h3>{key.toUpperCase()}</h3>

              <p
                className={
                  devices[key]
                    ? 'status-on'
                    : 'status-off'
                }
              >
                {devices[key] ? 'ON' : 'OFF'}
              </p>

              <div className="button-group">
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

      <div className="auto-section">
        <h2>자동 관수 / 양액 시스템</h2>

        <div className="auto-grid">
          <AutoCard
            title="시간 관수"
            desc="설정된 시간 자동 관수"
          />

          <AutoCard
            title="간격 관수"
            desc="주기적 반복 공급"
          />

          <AutoCard
            title="광량 관수"
            desc="광량 기준 자동 제어"
          />

          <AutoCard
            title="그룹 제어"
            desc="구역별 제어 가능"
          />
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #07111f;
          color: white;
          padding: 20px;
        }

        .top-header {
          margin-bottom: 30px;
        }

        h1 {
          font-size: 42px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #38bdf8;
        }

        .clock {
          font-size: 20px;
          color: #cbd5e1;
        }

        .weather-box,
        .graph-box,
        .nutrient-panel,
        .control-panel,
        .auto-section {
          background: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .weather-grid,
        .sensor-grid,
        .nutrient-grid,
        .control-grid,
        .auto-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .weather-card,
        .sensor-card,
        .status-card,
        .control-card,
        .auto-card {
          background: #111827;
          padding: 18px;
          border-radius: 16px;
          border: 1px solid #334155;
        }

        .sensor-value {
          font-size: 28px;
          font-weight: bold;
          color: #22d3ee;
          margin-top: 10px;
        }

        .graph-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .gauge-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }

        .gauge {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: conic-gradient(
            #22c55e 0deg 120deg,
            #facc15 120deg 240deg,
            #ef4444 240deg 360deg
          );
          position: relative;
        }

        .gauge-fill {
          width: 4px;
          height: 90px;
          background: white;
          position: absolute;
          left: 50%;
          bottom: 50%;
          transform-origin: bottom center;
        }

        .gauge-center {
          position: absolute;
          width: 110px;
          height: 110px;
          background: #020617;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 34px;
          font-weight: bold;
        }

        .frequency-graph {
          height: 220px;
          display: flex;
          align-items: end;
          gap: 4px;
        }

        .freq-bar {
          flex: 1;
          background: #06b6d4;
          border-radius: 4px 4px 0 0;
          animation: pulse 1s infinite alternate;
        }

        .moving-bars {
          height: 220px;
          display: flex;
          align-items: end;
          gap: 10px;
        }

        .moving-item {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: end;
        }

        .moving-bar {
          width: 100%;
          background: linear-gradient(
            to top,
            #2563eb,
            #22d3ee
          );
          border-radius: 8px 8px 0 0;
          transition: height 0.8s ease;
        }

        .button-group {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        button {
          flex: 1;
          border: none;
          padding: 12px;
          border-radius: 10px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        }

        .on-btn {
          background: #16a34a;
        }

        .off-btn {
          background: #dc2626;
        }

        .status-on {
          color: #4ade80;
          font-size: 26px;
          font-weight: bold;
        }

        .status-off {
          color: #f87171;
          font-size: 26px;
          font-weight: bold;
        }

        @keyframes pulse {
          from {
            opacity: 0.6;
          }

          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function SensorCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="sensor-card">
      <h3>{title}</h3>
      <div className="sensor-value">{value}</div>
    </div>
  );
}

function StatusCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="status-card">
      <h3>{title}</h3>
      <div className="sensor-value">{value}</div>
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
