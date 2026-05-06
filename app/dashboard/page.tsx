'use client';

import { useEffect, useRef, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/* ================= TYPES ================= */

type Sensor = {
  temp: number;
  hum: number;
  ec: number;
  ph: number;
  ppfd: number;
  nutTemp: number; // 양액온도 추가
};

type HistoryItem = Sensor & {
  time: string;
};

const EMPTY: Sensor = {
  temp: 0,
  hum: 0,
  ec: 0,
  ph: 0,
  ppfd: 0,
  nutTemp: 0,
};

/* ================= HELPERS ================= */

const normalize = (msg: any): Sensor => ({
  temp: msg?.values?.temp ?? msg?.temp ?? 0,
  hum: msg?.values?.hum ?? msg?.hum ?? 0,
  ec: msg?.values?.ec ?? 0,
  ph: msg?.values?.ph ?? 0,
  ppfd: msg?.values?.ppfd ?? 0,
  nutTemp: msg?.values?.nutTemp ?? 0,
});

/* ================= PAGE ================= */

export default function Page() {
  const clientRef = useRef<MqttClient | null>(null);

  const [sensor, setSensor] = useState<Sensor>(EMPTY);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [status, setStatus] =
    useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');

  const [timeRange, setTimeRange] = useState<'1h' | '8h' | '24h' | '7d'>('1h');

  const [control, setControl] = useState({
    pump: false,
    fan: false,
    led: false,
  });

  /* ================= MQTT ================= */
  useEffect(() => {
    setStatus('CONNECTING');

    const client = mqtt.connect(
      'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
      {
        username: process.env.NEXT_PUBLIC_MQTT_USER || '',
        password: process.env.NEXT_PUBLIC_MQTT_PASS || '',
        reconnectPeriod: 2000,
        connectTimeout: 5000,
      }
    );

    clientRef.current = client;

    client.on('connect', () => {
      setStatus('CONNECTED');
      client.subscribe('smartfarm/jeho123/data');
    });

    client.on('reconnect', () => {
      setStatus('CONNECTING');
    });

    client.on('offline', () => {
      setStatus('DISCONNECTED');
    });

    client.on('error', (err) => {
      console.error('MQTT Error: ', err);
      setStatus('DISCONNECTED');
    });

    client.on('message', (topic, payload) => {
      const payloadStr = payload.toString().trim();
      const lines = payloadStr.split('\n'); // 여러 줄의 JSON 로그가 한 번에 들어올 경우 분리
      let lastValidData: Sensor | null = null;

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          lastValidData = normalize(msg);
        } catch {
          // 개별 줄 파싱 실패 시 무시
        }
      }

      if (lastValidData) {
        const finalData = lastValidData;
        setSensor(finalData);
        setHistory((prev) => [
          ...prev.slice(-299), // 더 많은 데이터를 보관하도록 증가
          {
            time: new Date().toLocaleTimeString().slice(0, 8),
            ...finalData,
          },
        ]);
      }
    });

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof control) => {
    setControl((prev) => {
      const next = !prev[key];

      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.publish(
          'smartfarm/jeho123/control',
          JSON.stringify({ device: key, state: next })
        );
      }

      return { ...prev, [key]: next };
    });
  };

  const v = sensor ?? EMPTY;

  /* ================= STATS (통계) ================= */
  const temps = history.map(h => h.temp).filter(t => t > 0);
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 0;
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;

  /* ================= UI ================= */
  return (
    <div className="scada">

      {/* HEADER */}
      <div className="header">

        <h1>Glovera Smart farm 대시보드</h1>

        <div className={`status ${status}`}>
          MQTT: {status}
        </div>

        <Clock />

      </div>

      {/* WEATHER WIDGET */}
      <WeatherWidget />

      {/* SENSOR GRID */}
      <div className="grid">

        <div className="gauge-box"><Gauge value={v.ec} min={0} max={5} label="EC" unit="mS/cm" color="#22c55e" /></div>
        <div className="gauge-box"><Gauge value={v.ph} min={0} max={14} label="pH" unit="" color="#a855f7" /></div>
        <div className="gauge-box"><Gauge value={v.ppfd} min={0} max={2000} label="PPFD" unit="µmol" color="#fb923c" /></div>
        <div className="gauge-box"><Gauge value={v.temp} min={-10} max={50} label="온도" unit="°C" color="#ff4d4d" /></div>
        <div className="gauge-box"><Gauge value={v.hum} min={0} max={100} label="습도" unit="%" color="#4da6ff" /></div>
        <div className="gauge-box"><Gauge value={v.nutTemp} min={0} max={50} label="양액온도" unit="°C" color="#38bdf8" /></div>

      </div>

      {/* CHART */}
      <div className="chart">

        <div className="chart-header">
          <div className="stats">
            <span>🌡️ 히스토리 통계:</span>
            <span className="stat-item">최소온도 <b>{minTemp}°C</b></span>
            <span className="stat-item">최대온도 <b>{maxTemp}°C</b></span>
            <span className="stat-item">평균온도 <b>{avgTemp}°C</b></span>
          </div>

          <div className="time-filters">
            <button className={timeRange === '1h' ? 'active' : ''} onClick={() => setTimeRange('1h')}>1H</button>
            <button className={timeRange === '8h' ? 'active' : ''} onClick={() => setTimeRange('8h')}>8H</button>
            <button className={timeRange === '24h' ? 'active' : ''} onClick={() => setTimeRange('24h')}>24H</button>
            <button className={timeRange === '7d' ? 'active' : ''} onClick={() => setTimeRange('7d')}>7일</button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>

          <AreaChart
            data={
              history.length
                ? history
                : [{ time: '--', temp: 0, hum: 0, ec: 0 }]
            }
          >

            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />

            {/* 3가지 색상 적용 (온도:빨강, 습도:청색, EC:녹색) */}
            <Area isAnimationActive={false} type="monotone" dataKey="temp" stroke="#ff4d4d" fillOpacity={0.2} fill="#ff4d4d" name="온도" />
            <Area isAnimationActive={false} type="monotone" dataKey="hum" stroke="#4da6ff" fillOpacity={0.2} fill="#4da6ff" name="습도" />
            <Area isAnimationActive={false} type="monotone" dataKey="ec" stroke="#22c55e" fillOpacity={0.2} fill="#22c55e" name="EC" />

          </AreaChart>

        </ResponsiveContainer>

      </div>

      {/* CONTROL */}
      <div className="control">

        <button onClick={() => toggle('pump')}>
          PUMP {control.pump ? 'ON' : 'OFF'}
        </button>

        <button onClick={() => toggle('fan')}>
          FAN {control.fan ? 'ON' : 'OFF'}
        </button>

        <button onClick={() => toggle('led')}>
          LED {control.led ? 'ON' : 'OFF'}
        </button>

      </div>

      {/* FOOTER */}
      <div className="footer">
        copyright @ originated jhk in 2026
      </div>

      {/* STYLE */}
      <style jsx>{`

        .scada {
          background: #05070f;
          color: white;
          min-height: 100vh;
          padding: 24px;
          font-size: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #1f2937;
          margin-bottom: 16px;
        }

        .weather-panel {
          background: #0b1220;
          padding: 16px;
          border: 1px solid #1f2937;
          margin-bottom: 20px;
        }

        .weather-panel h3 {
          margin-top: 0;
          color: #94a3b8;
        }

        .gauges {
          display: flex;
          justify-content: space-around;
        }

        h1 {
          font-size: 26px;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .chart {
          margin-top: 20px;
          background: #0b1220;
          padding: 16px;
          border: 1px solid #1f2937;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .stats {
          display: flex;
          gap: 16px;
          color: #94a3b8;
        }

        .stat-item b {
          color: #f8fafc;
          margin-left: 4px;
        }

        .time-filters {
          display: flex;
          gap: 4px;
        }

        .time-filters button {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid #334155;
          color: #94a3b8;
        }

        .time-filters button.active {
          background: #1e293b;
          color: white;
          border-color: #64748b;
        }

        .control {
          margin-top: 20px;
          display: flex;
          gap: 10px;
        }

        button {
          padding: 12px;
          background: #0b1220;
          border: 1px solid #334155;
          color: white;
          cursor: pointer;
        }

        button:hover {
          background: #1e293b;
        }

        .footer {
          margin-top: 30px;
          text-align: center;
          color: #64748b;
        }

        .status.CONNECTED {
          color: #22c55e;
        }
        .status.CONNECTING {
          color: #facc15;
        }
        .status.DISCONNECTED {
          color: #ef4444;
        }

        .gauge-box {
          background: #0b1220;
          padding: 16px 8px;
          border: 1px solid #1f2937;
          display: flex;
          justify-content: center;
        }

      `}</style>

    </div>
  );
}

/* ================= GAUGE (속도계) ================= */

type GaugeProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
};

function Gauge({ value, min, max, label, unit, color }: GaugeProps) {
  const val = Math.min(Math.max(value, min), max);
  const percentage = (val - min) / (max - min);
  const data = [
    { name: 'value', value: percentage },
    { name: 'empty', value: 1 - percentage },
  ];

  return (
    <div style={{ position: 'relative', width: '120px', height: '100px' }}>
      <ResponsiveContainer width="100%" height={80}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={30}
            outerRadius={45}
            dataKey="value"
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} />
            <Cell fill="#1f2937" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', bottom: '-5px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>
          {value}
          <span style={{ fontSize: '14px', marginLeft: '2px' }}>{unit}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

/* ================= WEATHER WIDGET ================= */

function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.566&longitude=126.978&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_direction_10m&hourly=precipitation_probability&timezone=auto'
        );
        const data = await res.json();
        setWeather({
          temp: data.current.temperature_2m,
          hum: data.current.relative_humidity_2m,
          cloud: data.current.cloud_cover,
          windDir: data.current.wind_direction_10m,
          rainProb: data.hourly.precipitation_probability[0],
        });
      } catch (e) {
        console.error('Weather fetch error', e);
      }
    }
    fetchWeather();
    const t = setInterval(fetchWeather, 600000); // 10분마다 갱신
    return () => clearInterval(t);
  }, []);

  if (!weather) return <div className="weather-panel">날씨 정보 불러오는 중...</div>;

  return (
    <div className="weather-panel">
      <h3>📍 서울 날씨 (풍향: {weather.windDir}° / 강수확률: {weather.rainProb}%)</h3>
      <div className="gauges">
        <Gauge value={weather.temp} min={-15} max={40} label="온도" unit="°C" color="#ff4d4d" />
        <Gauge value={weather.hum} min={0} max={100} label="습도" unit="%" color="#4dff88" />
        <Gauge value={weather.cloud} min={0} max={100} label="구름" unit="%" color="#a855f7" />
      </div>
    </div>
  );
}

/* ================= CLOCK ================= */

function Clock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    setTime(new Date().toLocaleString());
    const t = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return <div>{time}</div>;
}