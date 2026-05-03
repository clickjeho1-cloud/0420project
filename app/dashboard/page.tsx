

'use client';

import { useEffect, useState } from 'react';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
};

type HistoryData = {
  time: string;
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
};

export default function DashboardPage() {

  const [time, setTime] =
    useState('');

  const [historyMode,
    setHistoryMode] =
    useState('1H');

  const [weather, setWeather] =
    useState({
      temp: '--',
      wind: '--',
      source:
        '기상청 제공',
    });

  const [sensors, setSensors] =
    useState<SensorData>({
      temperature: 24,
      humidity: 58,
      ec: 2.2,
      ph: 6.1,
      waterTemp: 21,
      lux: 32000,
    });

  const [history,
    setHistory] =
    useState<HistoryData[]>(
      []
    );

  // 시간

  useEffect(() => {

    const updateClock = () => {

      const now =
        new Date();

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

  // 날씨

  useEffect(() => {

    async function loadWeather() {

      try {

        const res =
          await fetch(
            '/api/weather',
            {
              cache:
                'no-store',
            }
          );

        const data =
          await res.json();

        setWeather({

          temp:
            `${data.temperature}°C`,

          wind:
            `${data.windspeed} km/h`,

          source:
            '기상청 제공',
        });

      } catch {

        setWeather({

          temp: '--',

          wind: '--',

          source:
            '기상청 연결 실패',
        });
      }
    }

    loadWeather();

    const interval =
      setInterval(
        loadWeather,
        60000
      );

    return () =>
      clearInterval(interval);

  }, []);

  // 센서

  useEffect(() => {

    const interval =
      setInterval(() => {

        const data = {

          temperature:
            Number(
              (
                20 +
                Math.random() * 7
              ).toFixed(1)
            ),

          humidity:
            Number(
              (
                45 +
                Math.random() * 25
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
              Math.random() *
                25000
            ),
        };

        setSensors(data);

        setHistory(prev => [

          ...prev.slice(-80),

          {
            time:
              new Date()
                .toLocaleTimeString()
                .slice(0, 8),

            ...data,
          },
        ]);

      }, 2000);

    return () =>
      clearInterval(interval);

  }, []);

  return (

    <div className="dashboard">

      <h1 className="title">
        Glovera 농장 스마트팜 대시보드
      </h1>

      <div className="clock">
        {time}
      </div>

      {/* 상황판 */}

      <section className="panel glass-blue">

        <h2>
          실시간 상황 계기판
        </h2>

        <div className="grid">

          <GlassCard
            title="외부온도"
            value={
              weather.temp
            }
          />

          <GlassCard
            title="풍속"
            value={
              weather.wind
            }
          />

          <GlassCard
            title="온도"
            value={`${sensors.temperature}°C`}
          />

          <GlassCard
            title="습도"
            value={`${sensors.humidity}%`}
          />

          <GlassCard
            title="EC"
            value={`${sensors.ec}`}
          />

          <GlassCard
            title="광량"
            value={`${sensors.lux}`}
          />

        </div>

        <div className="source">

          {weather.source}

        </div>

      </section>

      {/* 원형계기판 */}

      <section className="panel glass-dark">

        <h2>
          실시간 원형 분석 계기판
        </h2>

        <div className="gauge-grid">

          <Gauge
            title="TEMP"
            value={
              sensors.temperature
            }
            max={50}
            unit="°C"
          />

          <Gauge
            title="HUMIDITY"
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

        </div>

      </section>

      {/* 파형 */}

      <section className="panel glass-wave">

        <h2>
          실시간 업다운 파형 분석
        </h2>

        <ResponsiveContainer
          width="100%"
          height={400}
        >

          <AreaChart
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

            <Area
              type="monotone"
              dataKey="temperature"
              stroke="#ff0000"
              fill="#ff0000"
              fillOpacity={0.2}
            />

            <Area
              type="monotone"
              dataKey="humidity"
              stroke="#00ff00"
              fill="#00ff00"
              fillOpacity={0.2}
            />

            <Area
              type="monotone"
              dataKey="ec"
              stroke="#00ccff"
              fill="#00ccff"
              fillOpacity={0.2}
            />

            <Area
              type="monotone"
              dataKey="ph"
              stroke="#ffff00"
              fill="#ffff00"
              fillOpacity={0.2}
            />

          </AreaChart>

        </ResponsiveContainer>

      </section>

      {/* history */}

      <section className="panel glass-history">

        <div className="history-top">

          <h2>
            센서 History
          </h2>

          <div className="history-buttons">

            {[
              '1H',
              '12H',
              '24H',
              '7D',
            ].map(item => (

              <button
                key={item}
                onClick={() =>
                  setHistoryMode(
                    item
                  )
                }
              >

                {item}

              </button>

            ))}

          </div>

        </div>

        <div className="history-grid">

          <HistoryCard
            title="온도"
            value={`${sensors.temperature}°C`}
          />

          <HistoryCard
            title="습도"
            value={`${sensors.humidity}%`}
          />

          <HistoryCard
            title="EC"
            value={`${sensors.ec}`}
          />

          <HistoryCard
            title="PH"
            value={`${sensors.ph}`}
          />

        </div>

        <div className="log-box">

          현재 선택:
          {historyMode}

          로그 출력 영역

        </div>

      </section>

      {/* footer */}

      <footer className="footer">

        copyright@glovera
        orginated by jhk
        in 2026

      </footer>

      <style jsx>{`

        .dashboard {

          min-height: 100vh;

          padding: 20px;

          background:
            linear-gradient(
              180deg,
              #020617,
              #071226,
              #020617
            );

          color: white;
        }

        .title {

          font-size: 42px;

          color: #38bdf8;
        }

        .clock {

          margin-bottom: 30px;

          color: #94a3b8;
        }

        .panel {

          padding: 24px;

          border-radius: 24px;

          margin-bottom: 25px;

          backdrop-filter:
            blur(10px);
        }

        .glass-blue {

          background:
            linear-gradient(
              145deg,
              rgba(
                0,
                100,
                255,
                0.15
              ),
              rgba(
                15,
                23,
                42,
                0.95
              )
            );

          box-shadow:
            0 0 30px
            rgba(
              0,
              150,
              255,
              0.15
            );
        }

        .glass-dark {

          background:
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.9
              ),
              rgba(
                2,
                6,
                23,
                0.95
              )
            );
        }

        .glass-wave {

          background:
            linear-gradient(
              145deg,
              rgba(
                10,
                20,
                40,
                0.95
              ),
              rgba(
                0,
                0,
                0,
                0.95
              )
            );
        }

        .glass-history {

          background:
            linear-gradient(
              145deg,
              rgba(
                15,
                23,
                42,
                0.9
              ),
              rgba(
                30,
                41,
                59,
                0.9
              )
            );
        }

        .grid {

          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                220px,
                1fr
              )
            );

          gap: 20px;
        }

        .glass-card {

          padding: 22px;

          border-radius: 20px;

          background:
            rgba(
              255,
              255,
              255,
              0.05
            );

          border:
            1px solid
            rgba(
              255,
              255,
              255,
              0.06
            );
        }

        .glass-value {

          margin-top: 12px;

          font-size: 34px;

          color: #22d3ee;

          font-weight: bold;
        }

        .source {

          margin-top: 20px;

          color: #94a3b8;
        }

        .gauge-grid {

          display: grid;

          grid-template-columns:
            repeat(3,1fr);

          gap: 20px;
        }

        .gauge {

          background:
            rgba(
              255,
              255,
              255,
              0.04
            );

          border-radius: 24px;

          padding: 20px;

          text-align: center;
        }

        .ring {

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

        .inner {

          width: 170px;

          height: 170px;

          border-radius: 50%;

          background: #020617;

          display: flex;

          flex-direction:
            column;

          justify-content:
            center;

          align-items:
            center;
        }

        .gauge-value {

          font-size: 34px;

          font-weight: bold;
        }

        .history-top {

          display: flex;

          justify-content:
            space-between;

          align-items:
            center;

          margin-bottom: 20px;
        }

        .history-buttons {

          display: flex;

          gap: 10px;
        }

        .history-buttons button {

          background:
            #0f172a;

          border: none;

          color: white;

          padding: 10px 16px;

          border-radius: 12px;

          cursor: pointer;
        }

        .history-grid {

          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                220px,
                1fr
              )
            );

          gap: 20px;
        }

        .history-card {

          background:
            rgba(
              255,
              255,
              255,
              0.05
            );

          padding: 20px;

          border-radius: 20px;
        }

        .log-box {

          margin-top: 20px;

          background:
            rgba(
              0,
              0,
              0,
              0.4
            );

          padding: 20px;

          border-radius: 20px;

          color: #94a3b8;
        }

        .footer {

          text-align: center;

          margin-top: 40px;

          color: #64748b;

          padding-bottom: 30px;
        }

      `}</style>

    </div>

  );
}

function GlassCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {

  return (

    <div className="glass-card">

      <h3>{title}</h3>

      <div className="glass-value">
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

  return (

    <div className="gauge">

      <h3>{title}</h3>

      <div className="ring">

        <div className="inner">

          <div className="gauge-value">
            {value}
          </div>

          <div>
            {unit}
          </div>

        </div>

      </div>

    </div>

  );
}

function HistoryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {

  return (

    <div className="history-card">

      <h3>{title}</h3>

      <p>{value}</p>

    </div>

  );
}