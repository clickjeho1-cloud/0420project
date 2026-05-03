// app/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

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

type HistoryData = {
  time: string;
  temp: number;
  hum: number;
  ec: number;
};

export default function DashboardPage() {
  const [time, setTime] = useState('');

  const [historyRange, setHistoryRange] =
    useState('1H');

  const [weather, setWeather] = useState({
    city: '서울',
    sky: '연결중...',
    outsideTemp: 14.2,
    wind: 1.8,
    rain: '0mm',
  });

  const [sensors, setSensors] =
    useState<SensorData>({
      temperature: 23.5,
      humidity: 61,
      ec: 2.3,
      ph: 6.1,
      waterTemp: 21.4,
      lux: 28500,
    });

  const [devices, setDevices] =
    useState<DeviceState>({
      fan: false,
      pump: true,
      led: true,
      heater: false,
    });

  const [history, setHistory] = useState<
    HistoryData[]
  >([
    {
      time: '10:00',
      temp: 22,
      hum: 55,
      ec: 1.9,
    },
    {
      time: '11:00',
      temp: 23,
      hum: 57,
      ec: 2.0,
    },
    {
      time: '12:00',
      temp: 24,
      hum: 60,
      ec: 2.1,
    },
    {
      time: '13:00',
      temp: 24.5,
      hum: 61,
      ec: 2.2,
    },
  ]);

  // 시계
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      const days = [
        '일',
        '월',
        '화',
        '수',
        '목',
        '금',
        '토',
      ];

      setTime(
        `${now.getFullYear()}년 ${
          now.getMonth() + 1
        }월 ${now.getDate()}일 ${
          days[now.getDay()]
        }요일 ${String(
          now.getHours()
        ).padStart(2, '0')}시 ${String(
          now.getMinutes()
        ).padStart(2, '0')}분 ${String(
          now.getSeconds()
        ).padStart(2, '0')}초`
      );
    };

    updateClock();

    const timer = setInterval(
      updateClock,
      1000
    );

    return () =>
      clearInterval(timer);
  }, []);

  // GPS 위치
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setWeather({
          city: '서울',
          sky: '흐림',
          outsideTemp: 14.2,
          wind: 1.8,
          rain: '0mm',
        });
      }
    );
  }, []);

  // MQTT 실시간 데이터 자리
  useEffect(() => {
    const interval = setInterval(() => {
      const newSensor = {
        temperature: Number(
          (
            20 +
            Math.random() * 5
          ).toFixed(1)
        ),

        humidity: Number(
          (
            50 +
            Math.random() * 20
          ).toFixed(1)
        ),

        ec: Number(
          (
            1.5 +
            Math.random() * 1.5
          ).toFixed(1)
        ),

        ph: Number(
          (
            5.5 +
            Math.random()
          ).toFixed(1)
        ),

        waterTemp: Number(
          (
            18 +
            Math.random() * 5
          ).toFixed(1)
        ),

        lux: Math.floor(
          20000 +
            Math.random() * 10000
        ),
      };

      setSensors(newSensor);

      setHistory((prev) => [
        ...prev.slice(-30),

        {
          time: new Date()
            .toLocaleTimeString()
            .slice(0, 5),

          temp:
            newSensor.temperature,

          hum:
            newSensor.humidity,

          ec: newSensor.ec,
        },
      ]);
    }, 3000);

    return () =>
      clearInterval(interval);
  }, []);

  const toggleDevice = (
    key: keyof DeviceState,
    value: boolean
  ) => {
    setDevices((prev) => ({
      ...prev,
      [key]: value,
    }));

    console.log(
      'MQTT SEND:',
      key,
      value
    );
  };

  const avgTemp = (
    history.reduce(
      (a, b) => a + b.temp,
      0
    ) / history.length
  ).toFixed(1);

  return (
    <div className="dashboard">

      <h1 className="title">
        Glovera 농장 스마트팜
        대시보드
      </h1>

      <p className="clock">
        {time}
      </p>

      {/* 기상 정보 */}
      <section className="panel">

        <h2>
          서울 실시간 기상 정보
        </h2>

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

        <h2>
          실시간 센서 데이터
        </h2>

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

        <h2>
          실시간 계기판
        </h2>

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
            value={
              sensors.temperature
            }
            min={0}
            max={50}
            unit="°C"
            color="#ff0000"
          />

          <Gauge
            title="습도"
            value={
              sensors.humidity
            }
            min={0}
            max={100}
            unit="%"
            color="#00ff00"
          />

          <Gauge
            title="양액온도"
            value={
              sensors.waterTemp
            }
            min={0}
            max={40}
            unit="°C"
            color="#aa00ff"
          />

        </div>

      </section>

      {/* 히스토리 */}
      <section className="panel">

        <h2>
          센서 히스토리
        </h2>

        <div className="history-buttons">

          {[
            '1H',
            '8H',
            '24H',
            '7D',
          ].map((range) => (

            <button
              key={range}
              onClick={() =>
                setHistoryRange(
                  range
                )
              }
            >
              {range}
            </button>

          ))}

        </div>

        <div className="stats">

          <div className="stat-card">
            최소 온도

            <span>
              {
                Math.min(
                  ...history.map(
                    (h) =>
                      h.temp
                  )
                )
              }
              °C
            </span>
          </div>

          <div className="stat-card">
            최대 온도

            <span>
              {
                Math.max(
                  ...history.map(
                    (h) =>
                      h.temp
                  )
                )
              }
              °C
            </span>
          </div>

          <div className="stat-card">
            평균 온도

            <span>
              {avgTemp}°C
            </span>
          </div>

        </div>

        <div className="chart-wrap">

          <ResponsiveContainer
            width="100%"
            height={350}
          >

            <LineChart
              data={history}
            >

              <CartesianGrid
                stroke="#334155"
              />

              <XAxis
                dataKey="time"
              />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="temp"
                stroke="#ff0000"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="hum"
                stroke="#00ffff"
                strokeWidth={3}
              />

              <Line
                type="monotone"
                dataKey="ec"
                stroke="#00ff00"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </section>

      {/* 양액 시스템 */}
      <section className="panel">

        <h2>
          양액 시스템
        </h2>

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

        <h2>
          제어 시스템
        </h2>

        <div className="grid">

          {(
            [
              'fan',
              'pump',
              'led',
              'heater',
            ] as (
              | keyof DeviceState
            )[]
          ).map((key) => (

            <div
              key={key}
              className="device"
            >

              <h3>
                {key.toUpperCase()}
              </h3>

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
          background: #030712;
          color: white;
          min-height: 100vh;
          padding: 20px;
        }

        .title {
          font-size: 42px;
          color: #22d3ee;
        }

        .clock {
          color: #94a3b8;
          margin-bottom: 25px;
        }

        .panel {
          background: #111827;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 25px;
        }

        .grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                200px,
                1fr
              )
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

        .gauge-grid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

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

          border-radius: 50%;

          margin: auto;

          border: 10px solid;

          position: relative;

          background: black;
        }

        .needle {
          width: 4px;
          height: 90px;

          position: absolute;

          left: 50%;
          bottom: 50%;

          transform-origin:
            bottom;
        }

        .meter-center {
          position: absolute;

          width: 100px;
          height: 100px;

          background: #020617;

          border-radius: 50%;

          top: 50%;
          left: 50%;

          transform:
            translate(
              -50%,
              -50%
            );

          display: flex;

          flex-direction:
            column;

          justify-content:
            center;

          align-items:
            center;
        }

        .history-buttons {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }

        .history-buttons button {
          background: #1e293b;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
        }

        .stats {
          display: flex;
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: #0f172a;
          padding: 15px;
          border-radius: 12px;
          flex: 1;
        }

        .stat-card span {
          display: block;
          margin-top: 10px;
          font-size: 24px;
          color: #22d3ee;
        }

        .chart-wrap {
          width: 100%;
          height: 350px;
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
        }

        .on {
          background: green;
        }

        .off {
          background: red;
        }

        .status {
          font-size: 28px;
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
            transform:
              `rotate(${rotate}deg)`,

            background: color,
          }}
        />

        <div className="meter-center">

          <div>
            {value}
          </div>

          <small>
            {unit}
          </small>

        </div>

      </div>

    </div>

  );
}