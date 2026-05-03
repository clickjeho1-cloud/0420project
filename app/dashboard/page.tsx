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
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
};

export default function DashboardPage() {
  const [time, setTime] =
    useState('');

  const [historyRange, setHistoryRange] =
    useState('1H');

  const [weather, setWeather] =
    useState({
      city: 'GPS 확인중...',
      condition: '연결중...',
      temp: '--',
      wind: '--',
      rain: '--',
    });

  const [sensors, setSensors] =
    useState<SensorData>({
      temperature: 23,
      humidity: 61,
      ec: 2.2,
      ph: 6.1,
      waterTemp: 21,
      lux: 28000,
    });

  const [devices, setDevices] =
    useState<DeviceState>({
      fan: false,
      pump: true,
      led: true,
      heater: false,
    });

  const [history, setHistory] =
    useState<HistoryData[]>([]);

  // 실시간 시계
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

    const timer =
      setInterval(
        updateClock,
        1000
      );

    return () =>
      clearInterval(timer);

  }, []);

  // 실제 위치 기반 날씨
  useEffect(() => {

    navigator.geolocation.getCurrentPosition(
      () => {

        // 실제 API 연결 자리
        // 기상청 API / OpenWeather API 연결 가능

        setWeather({
          city: '서울',
          condition: '구름 많음',
          temp: '14.2°C',
          wind: '1.8m/s',
          rain: '0mm',
        });
      }
    );

  }, []);

  // 실시간 센서 데이터
  useEffect(() => {

    const interval =
      setInterval(() => {

        const data = {

          temperature:
            Number(
              (
                20 +
                Math.random() * 8
              ).toFixed(1)
            ),

          humidity:
            Number(
              (
                45 +
                Math.random() * 30
              ).toFixed(1)
            ),

          ec:
            Number(
              (
                1.2 +
                Math.random() * 2
              ).toFixed(1)
            ),

          ph:
            Number(
              (
                5.5 +
                Math.random() * 1.5
              ).toFixed(1)
            ),

          waterTemp:
            Number(
              (
                18 +
                Math.random() * 6
              ).toFixed(1)
            ),

          lux:
            Math.floor(
              20000 +
              Math.random() * 25000
            ),
        };

        setSensors(data);

        setHistory(prev => [

          ...prev.slice(-40),

          {
            time:
              new Date()
                .toLocaleTimeString()
                .slice(0, 8),

            temperature:
              data.temperature,

            humidity:
              data.humidity,

            ec:
              data.ec,

            ph:
              data.ph,

            waterTemp:
              data.waterTemp,

            lux:
              data.lux,
          },
        ]);

      }, 2000);

    return () =>
      clearInterval(interval);

  }, []);

  const toggleDevice = (
    key: keyof DeviceState,
    value: boolean
  ) => {

    setDevices(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const avgTemp =
    history.length > 0
      ? (
          history.reduce(
            (a, b) =>
              a +
              b.temperature,
            0
          ) /
          history.length
        ).toFixed(1)
      : 0;

  return (

    <div className="dashboard">

      <h1 className="title">
        Glovera 농장 스마트팜 대시보드
      </h1>

      <p className="clock">
        {time}
      </p>

      {/* 실시간 환경 정보 */}

      <section className="panel">

        <h2>
          실시간 환경 정보
        </h2>

        <div className="grid">

          <InfoCard
            title="지역"
            value={weather.city}
          />

          <InfoCard
            title="날씨"
            value={
              weather.condition
            }
          />

          <InfoCard
            title="외부온도"
            value={weather.temp}
          />

          <InfoCard
            title="풍속"
            value={weather.wind}
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
            title="PH"
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

      {/* 원형 계기판 */}

      <section className="panel">

        <h2>
          실시간 상황 계기판
        </h2>

        <div className="gauge-grid">

          <Gauge
            title="Temperature"
            value={
              sensors.temperature
            }
            max={50}
            unit="°C"
          />

          <Gauge
            title="Humidity"
            value={
              sensors.humidity
            }
            max={100}
            unit="%"
          />

          <Gauge
            title="EC"
            value={sensors.ec}
            max={10}
            unit="ds/m"
          />

          <Gauge
            title="PH"
            value={sensors.ph}
            max={14}
            unit="pH"
          />

          <Gauge
            title="Water Temp"
            value={
              sensors.waterTemp
            }
            max={40}
            unit="°C"
          />

          <Gauge
            title="Light"
            value={
              sensors.lux
            }
            max={50000}
            unit="lux"
          />

        </div>

      </section>

      {/* 파형 분석 */}

      <section className="panel">

        <h2>
          실시간 파형 분석 그래프
        </h2>

        <ResponsiveContainer
          width="100%"
          height={420}
        >

          <LineChart
            data={history}
          >

            <CartesianGrid
              stroke="#1e293b"
            />

            <XAxis
              dataKey="time"
            />

            <YAxis />

            <Tooltip />

            <Line
              type="monotone"
              dataKey="temperature"
              stroke="#ff0000"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="humidity"
              stroke="#00ff00"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="ec"
              stroke="#00ccff"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="ph"
              stroke="#ffff00"
              strokeWidth={3}
              dot={false}
            />

            <Line
              type="monotone"
              dataKey="waterTemp"
              stroke="#ff00ff"
              strokeWidth={3}
              dot={false}
            />

          </LineChart>

        </ResponsiveContainer>

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
          ].map(range => (

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
                history.length > 0
                  ? Math.min(
                      ...history.map(
                        h =>
                          h.temperature
                      )
                    )
                  : 0
              }

              °C

            </span>

          </div>

          <div className="stat-card">

            최대 온도

            <span>

              {
                history.length > 0
                  ? Math.max(
                      ...history.map(
                        h =>
                          h.temperature
                      )
                    )
                  : 0
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
              keyof DeviceState
            )[]
          ).map(key => (

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
          background: #020617;
          color: white;
          min-height: 100vh;
          padding: 20px;
        }

        .title {
          font-size: 42px;
          color: #38bdf8;
        }

        .clock {
          color: #94a3b8;
          margin-bottom: 30px;
        }

        .panel {
          background: #111827;
          padding: 20px;
          border-radius: 20px;
          margin-bottom: 25px;
        }

        .grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(200px,1fr)
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

          grid-template-columns:
            repeat(3,1fr);

          gap: 20px;
        }

        .gauge-card {
          background: #0f172a;
          padding: 20px;
          border-radius: 20px;
          text-align: center;
        }

        .gauge-wrap {

          width: 220px;
          height: 220px;

          margin: auto;

          border-radius: 50%;

          background:
            conic-gradient(
              red,
              orange,
              yellow,
              lime,
              cyan,
              blue,
              violet,
              red
            );

          display: flex;

          justify-content:
            center;

          align-items:
            center;
        }

        .gauge-inner {

          width: 180px;
          height: 180px;

          background: #020617;

          border-radius: 50%;

          display: flex;

          flex-direction:
            column;

          justify-content:
            center;

          align-items:
            center;
        }

        .gauge-value {

          font-size: 32px;

          font-weight: bold;
        }

        .gauge-unit {
          color: #94a3b8;
        }

        .history-buttons {

          display: flex;

          gap: 10px;

          margin-bottom: 20px;
        }

        .history-buttons button {

          background: #1e293b;

          border: none;

          color: white;

          padding: 10px 20px;

          border-radius: 10px;
        }

        .stats {

          display: flex;

          gap: 20px;

          margin-bottom: 20px;
        }

        .stat-card {

          flex: 1;

          background: #0f172a;

          padding: 20px;

          border-radius: 14px;
        }

        .stat-card span {

          display: block;

          margin-top: 10px;

          font-size: 26px;

          color: #22d3ee;
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
          font-size: 26px;
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
  max,
  unit,
}: {
  title: string;
  value: number;
  max: number;
  unit: string;
}) {

  const percent =
    (value / max) * 100;

  return (

    <div className="gauge-card">

      <h3>{title}</h3>

      <div className="gauge-wrap">

        <div
          className="gauge-inner"
          style={{
            boxShadow:
              `0 0 ${
                percent / 2
              }px cyan`,
          }}
        >

          <div className="gauge-value">
            {value}
          </div>

          <div className="gauge-unit">
            {unit}
          </div>

        </div>

      </div>

    </div>

  );
}