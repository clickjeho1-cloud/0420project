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
    city: '위치 확인중...',
    sky: '로딩중...',
    outsideTemp: 0,
    wind: 0,
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

  // GPS 위치
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setWeather({
          city: '서울',
          sky: '맑음',
          outsideTemp: 26,
          wind: 2.3,
          rain: '0mm',
        });
      },
      () => {
        console.log('위치 권한 거부');
      }
    );
  }, []);

  // MQTT 자리
  useEffect(() => {
    // client.subscribe('farm/sensors');

    // client.on('message', (_, msg) => {
    //   const data = JSON.parse(msg.toString());

    //   setSensors({
    //     temperature: data.temperature,
    //     humidity: data.humidity,
    //     ec: data.ec,
    //     ph: data.ph,
    //     waterTemp: data.waterTemp,
    //     lux: data.lux,
    //   });
    // });
  }, []);

  const toggleDevice = (
    key: keyof DeviceState,
    value: boolean
  ) => {
    setDevices((prev) => ({
      ...prev,
      [key]: value,
    }));

    console.log('MQTT SEND', {
      device: key,
      value,
    });

    // client.publish(...)
  };

  const gaugeRotate = sensors.ec * 25;

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

      {/* 센서 */}
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

      {/* 속도계 */}
      <section className="panel">
        <h2>EC 속도계</h2>

        <div className="gauge-wrap">
          <div className="gauge">
            <div
              className="needle"
              style={{
                transform: `rotate(${gaugeRotate}deg)`,
              }}
            />

            <div className="center">
              {sensors.ec}
            </div>

            <span className="g1">1.0</span>
            <span className="g5">5.0</span>
            <span className="g10">10</span>
          </div>
        </div>
      </section>

      {/* 주파수 그래프 */}
      <section className="panel">
        <h2>EC 주파수 그래프</h2>

        <div className="freq">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="freq-bar"
              style={{
                height: `${sensors.ec * n * 10}px`,
              }}
            />
          ))}
        </div>
      </section>

      {/* 움직이는 그래프 */}
      <section className="panel">
        <h2>실시간 환경 그래프</h2>

        <div className="bars">
          <Bar
            label="온도"
            value={sensors.temperature}
          />

          <Bar
            label="습도"
            value={sensors.humidity}
          />

          <Bar
            label="광량"
            value={sensors.lux / 1000}
          />

          <Bar
            label="양액온도"
            value={sensors.waterTemp}
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

              <p>
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
          font-size: 40px;
          color: #38bdf8;
        }

        .clock {
          margin-bottom: 30px;
          color: #cbd5e1;
        }

        .panel {
          background: #111827;
          margin-bottom: 24px;
          padding: 20px;
          border-radius: 20px;
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
          color: #22d3ee;
          margin-top: 10px;
        }

        .gauge-wrap {
          display: flex;
          justify-content: center;
        }

        .gauge {
          width: 240px;
          height: 240px;
          border-radius: 50%;
          background: conic-gradient(
            red,
            green,
            blue
          );
          position: relative;
        }

        .needle {
          width: 4px;
          height: 100px;
          background: white;
          position: absolute;
          left: 50%;
          bottom: 50%;
          transform-origin: bottom;
        }

        .center {
          position: absolute;
          width: 120px;
          height: 120px;
          background: #000;
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: 30px;
        }

        .g1,
        .g5,
        .g10 {
          position: absolute;
          font-weight: bold;
        }

        .g1 {
          left: 20px;
          bottom: 30px;
        }

        .g5 {
          top: 10px;
          left: 50%;
          transform: translateX(-50%);
        }

        .g10 {
          right: 20px;
          bottom: 30px;
        }

        .freq {
          display: flex;
          align-items: end;
          gap: 10px;
          height: 180px;
        }

        .freq-bar {
          flex: 1;
          background: cyan;
        }

        .bars {
          display: flex;
          align-items: end;
          gap: 20px;
          height: 180px;
        }

        .bar-wrap {
          flex: 1;
          text-align: center;
        }

        .bar {
          width: 40px;
          margin: auto;
          background: linear-gradient(
            to top,
            #2563eb,
            #22d3ee
          );
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
          color: white;
          border-radius: 10px;
        }

        .on {
          background: green;
        }

        .off {
          background: red;
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

function Bar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bar-wrap">
      <div
        className="bar"
        style={{
          height: `${value}px`,
        }}
      />

      <p>{label}</p>

      <span>{value}</span>
    </div>
  );
}