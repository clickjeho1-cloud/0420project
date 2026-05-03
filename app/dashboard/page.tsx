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

  const [time, setTime] =
    useState('');

  const [historyRange, setHistoryRange] =
    useState('1H');

  const [weather] = useState({
    city: '서울',
    sky: '흐림',
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

  const [history, setHistory] =
    useState<HistoryData[]>([
      {
        time: '10:00',
        temp: 22,
        hum: 55,
        ec: 1.8,
      },
      {
        time: '11:00',
        temp: 23,
        hum: 58,
        ec: 2.0,
      },
      {
        time: '12:00',
        temp: 24,
        hum: 60,
        ec: 2.2,
      },
      {
        time: '13:00',
        temp: 25,
        hum: 63,
        ec: 2.4,
      },
    ]);

  // 실시간 시간
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

  // 실시간 센서 업데이트
  useEffect(() => {

    const interval =
      setInterval(() => {

        const data = {

          temperature:
            Number(
              (
                20 +
                Math.random() * 6
              ).toFixed(1)
            ),

          humidity:
            Number(
              (
                50 +
                Math.random() * 20
              ).toFixed(1)
            ),

          ec:
            Number(
              (
                1.5 +
                Math.random() * 2
              ).toFixed(1)
            ),

          ph:
            Number(
              (
                5.5 +
                Math.random()
              ).toFixed(1)
            ),

          waterTemp:
            Number(
              (
                18 +
                Math.random() * 5
              ).toFixed(1)
            ),

          lux:
            Math.floor(
              20000 +
              Math.random() * 10000
            ),
        };

        setSensors(data);

        setHistory(prev => [

          ...prev.slice(-20),

          {
            time:
              new Date()
                .toLocaleTimeString()
                .slice(0, 5),

            temp:
              data.temperature,

            hum:
              data.humidity,

            ec:
              data.ec,
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

    setDevices(prev => ({
      ...prev,
      [key]: value,
    }));

    console.log(
      'MQTT:',
      key,
      value
    );
  };

  const avgTemp =
    (
      history.reduce(
        (a, b) =>
          a + b.temp,
        0
      ) / history.length
    ).toFixed(1);

  return (

    <div className="dashboard">

      <h1 className="title">
        Glovera 농장 스마트팜 대시보드
      </h1>

      <p className="clock">
        {time}
      </p>

      {/* 날씨 */}

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

        {/* 자동차 계기판 */}

        <div className="speed-grid">

          <SpeedMeter
            title="온도 속도계"
            value={sensors.temperature}
            min={0}
            max={50}
            unit="°C"
            color="#ff5500"
          />

          <SpeedMeter
            title="습도 속도계"
            value={sensors.humidity}
            min={0}
            max={100}
            unit="%"
            color="#00ccff"
          />

        </div>

        {/* 파형 그래프 */}

        <div className="wave-panel">

          <h3>
            EC / 습도 파형 분석
          </h3>

          <ResponsiveContainer
            width="100%"
            height={260}
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
                dataKey="ec"
                stroke="#00ff88"
                strokeWidth={4}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="hum"
                stroke="#00ccff"
                strokeWidth={3}
                dot={false}
              />

            </LineChart>

          </ResponsiveContainer>

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
                    h => h.temp
                  )
                )
              }°C
            </span>
          </div>

          <div className="stat-card">
            최대 온도
            <span>
              {
                Math.max(
                  ...history.map(
                    h => h.temp
                  )
                )
              }°C
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
          color: #22d3ee;
          margin-top: 10px;
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

        .meter {

          width: 220px;
          height: 220px;

          border-radius: 50%;

          border: 10px solid;

          margin: auto;

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

          flex-direction: column;

          justify-content: center;

          align-items: center;
        }

        .speed-grid {

          display: grid;

          grid-template-columns:
            repeat(2,1fr);

          gap: 20px;

          margin-top: 30px;
        }

        .speed-card {

          background: #020617;

          padding: 20px;

          border-radius: 20px;

          text-align: center;
        }

        .speed-meter {

          width: 320px;
          height: 160px;

          margin: auto;

          border-top-left-radius:
            320px;

          border-top-right-radius:
            320px;

          border:
            12px solid #1e293b;

          border-bottom: none;

          position: relative;

          overflow: hidden;
        }

        .speed-needle {

          width: 5px;
          height: 120px;

          position: absolute;

          bottom: 0;
          left: 50%;

          transform-origin:
            bottom;
        }

        .speed-center {

          position: absolute;

          bottom: 10px;
          left: 50%;

          transform:
            translateX(-50%);

          font-size: 28px;

          font-weight: bold;
        }

        .wave-panel {

          margin-top: 30px;

          background: #020617;

          padding: 20px;

          border-radius: 20px;
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

          color: #22d3ee;

          font-size: 24px;
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

function SpeedMeter({
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

  const rotation =
    ((value - min) /
      (max - min)) *
      180 -
    90;

  return (

    <div className="speed-card">

      <h3>{title}</h3>

      <div className="speed-meter">

        <div
          className="speed-needle"
          style={{
            transform:
              `rotate(${rotation}deg)`,

            background: color,
          }}
        />

        <div className="speed-center">

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