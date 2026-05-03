// app/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
};

type DeviceState = {
  fan: boolean;
  pump: boolean;
  led: boolean;
  heater: boolean;
};

export default function DashboardPage() {
  const [time, setTime] = useState('');

  const [weather, setWeather] = useState({
    city: '서울',
    sky: '맑음',
    outsideTemp: 26,
    wind: 2.3,
    rain: '0mm',
  });

  const [sensors, setSensors] = useState<SensorData>({
    temperature: 24,
    humidity: 62,
    ec: 2.1,
    ph: 6.2,
    waterTemp: 21,
    lux: 32000,
  });

  const [devices, setDevices] = useState<DeviceState>({
    fan: false,
    pump: true,
    led: true,
    heater: false,
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const days = [
        '일요일',
        '월요일',
        '화요일',
        '수요일',
        '목요일',
        '금요일',
        '토요일',
      ];

      setTime(
        `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]} ${String(now.getHours()).padStart(2, '0')}시 ${String(now.getMinutes()).padStart(2, '0')}분`
      );
    };

    updateClock();

    const timer = setInterval(updateClock, 1000);

    return () => clearInterval(timer);
  }, []);

  // 실시간 센서 테스트
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors({
        temperature: +(20 + Math.random() * 10).toFixed(1),
        humidity: +(40 + Math.random() * 40).toFixed(1),
        ec: +(1 + Math.random() * 4).toFixed(1),
        ph: +(5 + Math.random() * 2).toFixed(1),
        waterTemp: +(18 + Math.random() * 8).toFixed(1),
        lux: Math.floor(
          10000 + Math.random() * 40000
        ),
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
  };

  return (
    <div className="dashboard">
      <h1 className="title">
        Glovera 농장 스마트팜 대시보드
      </h1>

      <p className="clock">{time}</p>

      {/* 기상청 */}
      <section className="panel">
        <h2>실시간 기상청 정보</h2>

        <div className="grid">
          <InfoCard
            title="지역"
            value={weather.city}
          />

          <InfoCard
            title="날씨"
            value={weather.sky}
          />

          <InfoCard
            title="외부온도"
            value={`${weather.outsideTemp}°C`}
          />

          <InfoCard
            title="풍속"
            value={`${weather.wind}m/s`}
          />

          <InfoCard
            title="강수량"
            value={weather.rain}
          />
        </div>
      </section>

      {/* 실시간 센서 */}
      <section className="panel">
        <h2>실시간 센서 데이터</h2>

        <div className="grid">
          <InfoCard
            title="온도"
            value={`${sensors.temperature}°C`}
          />

          <InfoCard
            title="습도"
            value={`${sensors.humidity}%`}
          />

          <InfoCard
            title="EC"
            value={`${sensors.ec}`}
          />

          <InfoCard
            title="pH"
            value={`${sensors.ph}`}
          />

          <InfoCard
            title="양액온도"
            value={`${sensors.waterTemp}°C`}
          />

          <InfoCard
            title="광량"
            value={`${sensors.lux} lux`}
          />
        </div>
      </section>

      {/* 계기판 */}
      <section className="panel">
        <h2>실시간 계측 그래프</h2>

        <div className="gauge-grid">
          <Gauge
            title="EC"
            value={sensors.ec}
            min={0}
            max={10}
            unit="ds/m"
            color="#00ffff"
          />

          <Gauge
            title="pH"
            value={sensors.ph}
            min={0}
            max={14}
            unit="pH"
            color="#ffff00"
          />

          <Gauge
            title="광량"
            value={sensors.lux}
            min={0}
            max={50000}
            unit="lux"
            color="#ff8800"
          />

          <Gauge
            title="온도"
            value={sensors.temperature}
            min={0}
            max={50}
            unit="°C"
            color="#ff0000"
          />

          <Gauge
            title="습도"
            value={sensors.humidity}
            min={0}
            max={100}
            unit="%"
            color="#00ff00"
          />

          <Gauge
            title="양액온도"
            value={sensors.waterTemp}
            min={0}
            max={40}
            unit="°C"
            color="#aa00ff"
          />
        </div>
      </section>

      {/* 양액 시스템 */}
      <section className="panel">
        <h2>양액 시스템</h2>

        <div className="grid">
          <InfoCard
            title="EC 상태"
            value={`${sensors.ec} ds/m`}
          />

          <InfoCard
            title="pH 상태"
            value={`${sensors.ph}`}
          />

          <InfoCard
            title="양액온도"
            value={`${sensors.waterTemp}°C`}
          />

          <InfoCard
            title="순환상태"
            value={
              devices.pump
                ? '순환중'
                : '정지'
            }
          />
        </div>
      </section>

      {/* 제어 */}
      <section className="panel">
        <h2>제어 시스템</h2>

        <div className="grid">
          {(
            [
              'fan',
              'pump',
              'led',
              'heater',
            ] as (keyof DeviceState)[]
          ).map((key) => (
            <div
              key={key}
              className="device"
            >
              <h3>{key.toUpperCase()}</h3>

              <p className="status">
                {devices[key]
                  ? 'ON'
                  : 'OFF'}
              </p>

              <div className="btns">
                <button
                  className="on"
                  onClick={() =>
                    toggleDevice(
                      key,
                      true
                    )
                  }
                >
                  ON
                </button>

                <button
                  className="off"
                  onClick={() =>
                    toggleDevice(
                      key,
                      false
                    )
                  }
                >
                  OFF
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .dashboard {
          background: #07111f;
          color: white;
          min-height: 100vh;
          padding: 20px;
        }

        .title {
          font-size: 42px;
          color: #38bdf8;
          margin-bottom: 10px;
        }

        .clock {
          margin-bottom: 30px;
          color: #cbd5e1;
        }

        .panel {
          background: #111827;
          padding: 20px;
          border-radius: 20px;
          margin-bottom: 25px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fit,
            minmax(200px, 1fr)
          );
          gap: 15px;
        }

        .card,
        .device {
          background: #1e293b;
          padding: 20px;
          border-radius: 16px;
        }

        .value {
          font-size: 28px;
          margin-top: 10px;
          color: #22d3ee;
        }

        .gauge-grid {
          display: grid;
          grid-template-columns: repeat(
            3,
            1fr
          );
          gap: 20px;
        }

        .gauge-card {
          background: #0f172a;
          padding: 20px;
          border-radius: 20px;
          text-align: center;
        }

        .meter {
          width: 220px;
          height: 220px;
          margin: auto;
          border-radius: 50%;
          border: 10px solid;
          position: relative;
          background: #020617;
        }

        .needle {
          width: 4px;
          height: 90px;
          position: absolute;
          bottom: 50%;
          left: 50%;
          transform-origin: bottom;
        }

        .meter-center {
          position: absolute;
          width: 110px;
          height: 110px;
          background: black;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(
            -50%,
            -50%
          );

          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;

          font-size: 24px;
          font-weight: bold;
        }

        .btns {
          display: flex;
          gap: 10px;
          margin-top: 10px;
        }

        button {
          flex: 1;
          border: none;
          padding: 10px;
          border-radius: 10px;
          color: white;
          cursor: pointer;
        }

        .on {
          background: green;
        }

        .off {
          background: red;
        }

        .status {
          font-size: 26px;
          font-weight: bold;
        }

        @media (
          max-width: 1000px
        ) {
          .gauge-grid {
            grid-template-columns: repeat(
              2,
              1fr
            );
          }
        }

        @media (
          max-width: 700px
        ) {
          .gauge-grid {
            grid-template-columns: 1fr;
          }

          .meter {
            width: 180px;
            height: 180px;
          }
        }
      `}</style>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>

      <div className="value">
        {value}
      </div>
    </div>
  );
}

function Gauge({
  title,
  value,
  min,
  max,
  unit,
  color,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  const rotate =
    ((value - min) /
      (max - min)) *
      180 -
    90;

  return (
    <div className="gauge-card">
      <h3>{title}</h3>

      <div
        className="meter"
        style={{
          borderColor: color,
        }}
      >
        <div
          className="needle"
          style={{
            transform: `rotate(${rotate}deg)`,
            background: color,
          }}
        />

        <div className="meter-center">
          <div>{value}</div>

          <small>{unit}</small>
        </div>
      </div>
    </div>
  );
}