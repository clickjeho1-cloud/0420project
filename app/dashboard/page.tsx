// app/dashboard/page.tsx

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

type WeatherData = {
  city: string;
  condition: string;
  temp: string;
  humidity: string;
  wind: string;
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

  const [weather, setWeather] =
    useState<WeatherData>({
      city: '서울',
      condition: '연결중...',
      temp: '--',
      humidity: '--',
      wind: '--',
    });

  const [sensors, setSensors] =
    useState<SensorData>({
      temperature: 24,
      humidity: 58,
      ec: 2.3,
      ph: 6.1,
      waterTemp: 21,
      lux: 32000,
    });

  const [history, setHistory] =
    useState<HistoryData[]>([]);

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

  // 실시간 외부 기상 데이터

  useEffect(() => {

    async function fetchWeather() {

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

          city: '서울',

          condition:
            '실시간 외부 환경',

          temp:
            `${data.temperature}°C`,

          humidity:
            data.humidity
              ? `${data.humidity}%`
              : '--',

          wind:
            `${data.windspeed} km/h`,
        });

      } catch {

        setWeather({

          city: '서울',

          condition:
            '기상 오류',

          temp: '--',

          humidity: '--',

          wind: '--',
        });
      }
    }

    fetchWeather();

    const interval =
      setInterval(
        fetchWeather,
        60000
      );

    return () =>
      clearInterval(interval);

  }, []);

  // 센서 실시간 데이터

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
                1.5 +
                Math.random() * 2
              ).toFixed(1)
            ),

          ph:
            Number(
              (
                5.5 +
                Math.random() * 1
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
                20000
            ),
        };

        setSensors(data);

        setHistory(prev => [

          ...prev.slice(-40),

          {
            time:
              new Date()
                .toLocaleTimeString()
                .slice(3, 8),

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

      <p className="clock">
        {time}
      </p>

      {/* 실시간 상황 계기판 */}

      <section className="panel">

        <h2>
          실시간 상황 계기판
        </h2>

        <div className="status-grid">

          <GlassCard
            title="외부 온도"
            value={weather.temp}
          />

          <GlassCard
            title="풍속"
            value={weather.wind}
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

      </section>

      {/* 원형 계기판 */}

      <section className="panel">

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

          <Gauge
            title="PH"
            value={sensors.ph}
            max={14}
            unit="pH"
          />

          <Gauge
            title="LIGHT"
            value={
              sensors.lux
            }
            max={50000}
            unit="lux"
          />

          <Gauge
            title="WATER"
            value={
              sensors.waterTemp
            }
            max={40}
            unit="°C"
          />

        </div>

      </section>

      {/* 실시간 업다운 그래프 */}

      <section className="panel">

        <h2>
          실시간 업다운 분석 그래프
        </h2>

        <ResponsiveContainer
          width="100%"
          height={420}
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
              fillOpacity={0.15}
            />

            <Area
              type="monotone"
              dataKey="humidity"
              stroke="#00ff00"
              fill="#00ff00"
              fillOpacity={0.15}
            />

            <Area
              type="monotone"
              dataKey="ec"
              stroke="#00ccff"
              fill="#00ccff"
              fillOpacity={0.15}
            />

            <Area
              type="monotone"
              dataKey="ph"
              stroke="#ffff00"
              fill="#ffff00"
              fillOpacity={0.15}
            />

            <Area
              type="monotone"
              dataKey="waterTemp"
              stroke="#ff00ff"
              fill="#ff00ff"
              fillOpacity={0.15}
            />

          </AreaChart>

        </ResponsiveContainer>

      </section>

      {/* 센서 히스토리 */}

      <section className="panel">

        <h2>
          센서 히스토리
        </h2>

        <div className="history-grid">

          <div className="history-card">

            <h3>
              온도
            </h3>

            <p>
              최소 :
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
            </p>

            <p>
              최대 :
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
            </p>

            <p>
              평균 :
              {
                history.length > 0
                  ? (
                      history.reduce(
                        (
                          a,
                          b
                        ) =>
                          a +
                          b.temperature,
                        0
                      ) /
                      history.length
                    ).toFixed(1)
                  : 0
              }
              °C
            </p>

          </div>

          <div className="history-card">

            <h3>
              습도
            </h3>

            <p>
              최소 :
              {
                history.length > 0
                  ? Math.min(
                      ...history.map(
                        h =>
                          h.humidity
                      )
                    )
                  : 0
              }
              %
            </p>

            <p>
              최대 :
              {
                history.length > 0
                  ? Math.max(
                      ...history.map(
                        h =>
                          h.humidity
                      )
                    )
                  : 0
              }
              %
            </p>

            <p>
              평균 :
              {
                history.length > 0
                  ? (
                      history.reduce(
                        (
                          a,
                          b
                        ) =>
                          a +
                          b.humidity,
                        0
                      ) /
                      history.length
                    ).toFixed(1)
                  : 0
              }
              %
            </p>

          </div>

          <div className="history-card">

            <h3>
              EC
            </h3>

            <p>
              현재 :
              {
                sensors.ec
              }
            </p>

          </div>

          <div className="history-card">

            <h3>
              PH
            </h3>

            <p>
              현재 :
              {
                sensors.ph
              }
            </p>

          </div>

        </div>

      </section>

      {/* 제어 시스템 */}

      <section className="panel">

        <h2>
          제어 시스템
        </h2>

        <div className="control-grid">

          {[
            'FAN',
            'PUMP',
            'LED',
            'HEATER',
          ].map(device => (

            <div
              key={device}
              className="control-card"
            >

              <h3>
                {device}
              </h3>

              <div className="control-buttons">

                <button className="on">
                  ON
                </button>

                <button className="off">
                  OFF
                </button>

              </div>

            </div>

          ))}

        </div>

      </section>

      <style jsx>{`

        .dashboard {

          min-height: 100vh;

          background:
            linear-gradient(
              180deg,
              #020617,
              #0f172a
            );

          color: white;

          padding: 20px;
        }

        .title {

          font-size: 42px;

          color: #38bdf8;

          margin-bottom: 10px;
        }

        .clock {

          color: #94a3b8;

          margin-bottom: 30px;
        }

        .panel {

          background:
            rgba(
              15,
              23,
              42,
              0.82
            );

          backdrop-filter:
            blur(12px);

          border-radius: 24px;

          padding: 25px;

          margin-bottom: 25px;

          border:
            1px solid rgba(
              255,
              255,
              255,
              0.06
            );

          box-shadow:
            0 0 25px rgba(
              0,
              255,
              255,
              0.04
            );
        }

        .status-grid {

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

          background:
            linear-gradient(
              145deg,
              rgba(
                14,
                116,
                144,
                0.35
              ),
              rgba(
                15,
                23,
                42,
                0.92
              )
            );

          border-radius: 22px;

          padding: 24px;

          border:
            1px solid rgba(
              56,
              189,
              248,
              0.2
            );

          box-shadow:
            0 0 25px rgba(
              56,
              189,
              248,
              0.12
            );
        }

        .glass-value {

          font-size: 34px;

          margin-top: 14px;

          color: #22d3ee;

          font-weight: bold;
        }

        .gauge-grid {

          display: grid;

          grid-template-columns:
            repeat(3,1fr);

          gap: 24px;
        }

        .gauge-card {

          background:
            rgba(
              255,
              255,
              255,
              0.03
            );

          border-radius: 24px;

          padding: 24px;

          text-align: center;
        }

        .gauge-ring {

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

          box-shadow:
            0 0 30px rgba(
              0,
              255,
              255,
              0.25
            );
        }

        .gauge-inner {

          width: 175px;
          height: 175px;

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

        .gauge-unit {

          color: #94a3b8;
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
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.9
              ),
              rgba(
                15,
                23,
                42,
                0.9
              )
            );

          padding: 24px;

          border-radius: 20px;

          border:
            1px solid rgba(
              56,
              189,
              248,
              0.15
            );
        }

        .control-grid {

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

        .control-card {

          background:
            linear-gradient(
              145deg,
              rgba(
                15,
                23,
                42,
                0.95
              ),
              rgba(
                30,
                41,
                59,
                0.9
              )
            );

          border-radius: 20px;

          padding: 24px;
        }

        .control-buttons {

          display: flex;

          gap: 10px;

          margin-top: 15px;
        }

        .on {

          flex: 1;

          background: #16a34a;

          border: none;

          padding: 12px;

          border-radius: 12px;

          color: white;

          font-weight: bold;
        }

        .off {

          flex: 1;

          background: #dc2626;

          border: none;

          padding: 12px;

          border-radius: 12px;

          color: white;

          font-weight: bold;
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

  const percent =
    Math.min(
      (value / max) * 100,
      100
    );

  return (

    <div className="gauge-card">

      <h3>{title}</h3>

      <div
        className="gauge-ring"
        style={{
          filter:
            `brightness(${
              0.5 +
              percent / 100
            })`,
        }}
      >

        <div className="gauge-inner">

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