'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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
  nutTemp: number;
};

type HistoryItem = Sensor & { time: string };

type Suggestion = {
  temp: string;
  humidity: string;
  ec: string;
  ppfd: string;
  fan: string;
  pump: string;
  light: string;
  note: string;
};

const EMPTY: Sensor = { temp: 0, hum: 0, ec: 0, ph: 0, ppfd: 0, nutTemp: 0 };

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
  const [status, setStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('DISCONNECTED');
  const [timeRange, setTimeRange] = useState<'1h' | '8h' | '24h' | '7d'>('1h');
  const [control, setControl] = useState({ pump: false, fan: false, led: false });
  const [recommendation, setRecommendation] = useState<Suggestion | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);

  /* ================= MQTT ================= */
  useEffect(() => {
    setStatus('CONNECTING');
    const client = mqtt.connect(
      'wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt',
      {
        username: process.env.NEXT_PUBLIC_MQTT_USER || 'jhk001',
        password: process.env.NEXT_PUBLIC_MQTT_PASS || 'Sinwonpark1!',
        reconnectPeriod: 2000,
        connectTimeout: 5000,
      }
    );

    clientRef.current = client;

    client.on('connect', () => {
      setStatus('CONNECTED');
      client.subscribe('smartfarm/jeho123/data');
    });

    client.on('reconnect', () => setStatus('CONNECTING'));
    client.on('offline', () => setStatus('DISCONNECTED'));
    client.on('error', () => setStatus('DISCONNECTED'));

    client.on('message', (topic, payload) => {
      const lines = payload.toString().trim().split('\n');
      let lastValidData: Sensor | null = null;

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          lastValidData = normalize(JSON.parse(line));
        } catch { }
      }

      if (lastValidData) {
        const finalData = lastValidData;
        setSensor(finalData);
        setHistory((prev) => [
          ...prev.slice(-299),
          { time: new Date().toLocaleTimeString().slice(0, 8), ...finalData },
        ]);
      }
    });

    return () => {
      if (clientRef.current) clientRef.current.end();
    };
  }, []);

  /* ================= CONTROL ================= */
  const toggle = (key: keyof typeof control) => {
    setControl((prev) => {
      const next = !prev[key];
      if (clientRef.current && clientRef.current.connected) {
        clientRef.current.publish('smartfarm/jeho123/control', JSON.stringify({ device: key, state: next }));
      }
      return { ...prev, [key]: next };
    });
  };

  const v = sensor ?? EMPTY;
  const temps = history.map(h => h.temp).filter(t => t > 0);
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTemp = temps.length ? Math.max(...temps) : 0;
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : 0;

  useEffect(() => {
    async function fetchSuggestion() {
      if (!history.length) return;
      setRecommendationLoading(true);
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            temp: v.temp,
            hum: v.hum,
            ec: v.ec,
            ph: v.ph,
            ppfd: v.ppfd,
            nutTemp: v.nutTemp,
          }),
        });
        const result = await res.json();
        if (result.ok) {
          setRecommendation(result.suggestion);
        }
      } catch (error) {
        console.error('추천 정보 로드 실패:', error);
      } finally {
        setRecommendationLoading(false);
      }
    }

    fetchSuggestion();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, v.temp, v.hum, v.ec, v.ph, v.ppfd, v.nutTemp]);

  return (
    <div className="scada">
      <div className="header">
        <h1>Glovera Smart farm 대시보드</h1>
        <div className="nav-links">
          <Link href="/journal/list" className="nav-link">📖 영농일지</Link>
        </div>
        <div className={`status ${status}`}>MQTT: {status}</div>
        <Clock />
      </div>

      <WeatherWidget />

      <div className="recommendation-panel">
        <h2>추천 제어값</h2>
        {recommendationLoading ? (
          <p>추천값을 계산 중입니다...</p>
        ) : recommendation ? (
          <div className="recommendation-grid">
            <div className="recommendation-card">
              <strong>온도</strong>
              <p>{recommendation.temp}</p>
            </div>
            <div className="recommendation-card">
              <strong>습도</strong>
              <p>{recommendation.humidity}</p>
            </div>
            <div className="recommendation-card">
              <strong>EC</strong>
              <p>{recommendation.ec}</p>
            </div>
            <div className="recommendation-card">
              <strong>광량</strong>
              <p>{recommendation.ppfd}</p>
            </div>
            <div className="recommendation-card">
              <strong>팬</strong>
              <p>{recommendation.fan}</p>
            </div>
            <div className="recommendation-card">
              <strong>펌프</strong>
              <p>{recommendation.pump}</p>
            </div>
          </div>
        ) : (
          <p>데이터가 부족하여 추천 정보를 표시할 수 없습니다.</p>
        )}
        {recommendation?.note ? <p className="recommendation-note">{recommendation.note}</p> : null}
      </div>

      <div className="grid">
        <div className="gauge-box"><Gauge value={v.ec} min={0} max={5} label="EC" unit="mS/cm" color="#22c55e" /></div>
        <div className="gauge-box"><Gauge value={v.ph} min={0} max={14} label="pH" unit="" color="#a855f7" /></div>
        <div className="gauge-box"><Gauge value={v.ppfd} min={0} max={2000} label="PPFD" unit="µmol" color="#fb923c" /></div>
        <div className="gauge-box"><Gauge value={v.temp} min={-10} max={50} label="온도" unit="°C" color="#ff4d4d" /></div>
        <div className="gauge-box"><Gauge value={v.hum} min={0} max={100} label="습도" unit="%" color="#4da6ff" /></div>
        <div className="gauge-box"><Gauge value={v.nutTemp} min={0} max={50} label="양액온도" unit="°C" color="#38bdf8" /></div>
      </div>

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
          <AreaChart data={history.length ? history : [{ time: '--', temp: 0, hum: 0, ec: 0 }]}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Area isAnimationActive={false} type="monotone" dataKey="temp" stroke="#ff4d4d" fillOpacity={0.2} fill="#ff4d4d" name="온도" />
            <Area isAnimationActive={false} type="monotone" dataKey="hum" stroke="#4da6ff" fillOpacity={0.2} fill="#4da6ff" name="습도" />
            <Area isAnimationActive={false} type="monotone" dataKey="ec" stroke="#22c55e" fillOpacity={0.2} fill="#22c55e" name="EC" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="log-history">
        <h3>📋 실시간 로그 히스토리</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>시간</th><th>온도 (°C)</th><th>습도 (%)</th><th>EC (mS/cm)</th><th>pH</th><th>PPFD (µmol)</th><th>양액온도 (°C)</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((item, idx) => (
                <tr key={idx}>
                  <td>{item.time}</td><td>{item.temp}</td><td>{item.hum}</td><td>{item.ec}</td><td>{item.ph}</td><td>{item.ppfd}</td><td>{item.nutTemp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="control">
        <button onClick={() => toggle('pump')}>PUMP {control.pump ? 'ON' : 'OFF'}</button>
        <button onClick={() => toggle('fan')}>FAN {control.fan ? 'ON' : 'OFF'}</button>
        <button onClick={() => toggle('led')}>LED {control.led ? 'ON' : 'OFF'}</button>
      </div>

      <div className="footer">copyright @ originated jhk in 2026</div>

      <style jsx>{`
        .scada { background: #05070f; color: white; min-height: 100vh; padding: 24px; font-size: 18px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; margin-bottom: 16px; }
        .nav-links { display: flex; gap: 16px; }
        .nav-link { color: #2563eb; text-decoration: none; font-weight: bold; }
        .nav-link:hover { color: #1d4ed8; }
        .weather-panel { background: #0b1220; padding: 18px; border: 1px solid #1f2937; margin-bottom: 20px; border-radius: 12px; }
        .weather-panel-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 14px; }
        .weather-panel h3 { margin: 0; color: #e2e8f0; font-size: 18px; }
        .weather-coordinates { text-align: right; color: #94a3b8; font-size: 14px; line-height: 1.5; }
        .weather-details { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; background: #111827; padding: 16px; border-radius: 8px; }
        .weather-grid { display: grid; grid-template-columns: repeat(2, minmax(140px, 1fr)); gap: 12px; }
        .weather-card { background: #0f172a; padding: 14px; border: 1px solid #334155; border-radius: 10px; display: flex; flex-direction: column; justify-content: space-between; color: #cbd5e1; }
        .weather-card strong { color: #f8fafc; margin-bottom: 8px; font-size: 14px; }
        .weather-card span { font-size: 16px; font-weight: 700; }
        .weather-meta { color: #cbd5e1; display: flex; flex-direction: column; justify-content: space-between; }
        .weather-meta p { margin: 8px 0; font-size: 15px; }
        .weather-meta strong { color: #f8fafc; }
        .recommendation-panel { background: #0b1220; padding: 16px; border: 1px solid #1f2937; margin-bottom: 20px; border-radius: 12px; }
        .recommendation-panel h2 { margin-top: 0; color: #94a3b8; margin-bottom: 12px; }
        .recommendation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
        .recommendation-card { background: #111827; padding: 14px; border: 1px solid #334155; border-radius: 10px; color: #e2e8f0; }
        .recommendation-card strong { display: block; margin-bottom: 8px; color: #f8fafc; }
        .recommendation-note { color: #c7d2fe; margin-top: 16px; }
        .gauges { display: flex; justify-content: space-around; } 
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
        .chart { margin-top: 20px; background: #0b1220; padding: 16px; border: 1px solid #1f2937; }
        .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .stats { display: flex; gap: 16px; color: #94a3b8; }
        .stat-item b { color: #f8fafc; margin-left: 4px; }
        .time-filters { display: flex; gap: 4px; }
        .time-filters button { padding: 6px 12px; background: transparent; border: 1px solid #334155; color: #94a3b8; }
        .time-filters button.active { background: #1e293b; color: white; border-color: #64748b; }
        .log-history { margin-top: 20px; background: #0b1220; padding: 16px; border: 1px solid #1f2937; }
        .log-history h3 { margin-top: 0; color: #94a3b8; margin-bottom: 12px; }
        .table-wrapper { max-height: 250px; overflow-y: auto; }
        table { width: 100%; border-collapse: collapse; text-align: center; font-size: 14px; }
        th { position: sticky; top: 0; background: #1e293b; color: #f8fafc; padding: 10px; border-bottom: 2px solid #334155; }
        td { padding: 8px 10px; border-bottom: 1px solid #1f2937; color: #cbd5e1; }
        tr:hover td { background: #1e293b; }
        .control { margin-top: 20px; display: flex; gap: 10px; }
        button { padding: 12px; background: #0b1220; border: 1px solid #334155; color: white; cursor: pointer; }
        button:hover { background: #1e293b; }
        .footer { margin-top: 30px; text-align: center; color: #64748b; }
        .status.CONNECTED { color: #22c55e; }
        .status.CONNECTING { color: #facc15; }
        .status.DISCONNECTED { color: #ef4444; }
        .gauge-box { background: #0b1220; padding: 16px 8px; border: 1px solid #1f2937; display: flex; justify-content: center; }
      `}</style>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState<string>('');
  useEffect(() => {
    setTime(new Date().toLocaleString());
    const t = setInterval(() => setTime(new Date().toLocaleString()), 1000);
    return () => clearInterval(t);
  }, []);
  return <div>{time}</div>;
}

type GaugeProps = { value: number; min: number; max: number; label: string; unit: string; color: string; };
function Gauge({ value, min, max, label, unit, color }: GaugeProps) {
  const val = Math.min(Math.max(value, min), max);
  const percentage = (val - min) / (max - min);
  const data = [{ name: 'value', value: percentage }, { name: 'empty', value: 1 - percentage }];
  return (
    <div style={{ position: 'relative', width: '120px', height: '100px' }}>
      <ResponsiveContainer width="100%" height={80}>
        <PieChart>
          <Pie data={data} cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={30} outerRadius={45} dataKey="value" stroke="none" isAnimationActive={false}>
            <Cell fill={color} /><Cell fill="#1f2937" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', bottom: '-5px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc' }}>{value}<span style={{ fontSize: '14px', marginLeft: '2px' }}>{unit}</span></div>
        <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}

function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const formatCoordinate = (value: number | null | undefined, type: 'lat' | 'lon') => {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    const abs = Math.abs(value).toFixed(4);
    const direction = type === 'lat' ? (value >= 0 ? '북위' : '남위') : (value >= 0 ? '동경' : '서경');
    return `${direction} ${abs}°`;
  };

  const formatTime = (value: string | null | undefined) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    async function fetchWeatherByLocation() {
      try {
        // 사용자 위치 가져오기 (지오로케이션 API)
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lon: longitude });

            // 내 API 라우트로 위치 기반 날씨 가져오기
            const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            setWeather(data);
          },
          (error) => {
            console.warn('위치 접근 거부, 기본값 사용:', error);
            // 기본값: 서울 (역삼동 근처)
            fetch(`/api/weather?lat=37.4979&lon=127.0276`)
              .then(res => res.json())
              .then(data => {
                setLocation({ lat: 37.4979, lon: 127.0276, name: '역삼동' });
                setWeather(data);
              });
          }
        );
      } catch (e) {
        console.error('날씨 정보 로드 실패:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchWeatherByLocation();
    const t = setInterval(fetchWeatherByLocation, 600000); // 10분마다 업데이트
    return () => clearInterval(t);
  }, []);

  if (loading || !weather) {
    return <div className="weather-panel">📍 위치 기반 날씨 정보 불러오는 중...</div>;
  }

  return (
    <div className="weather-panel">
      <div className="weather-panel-header">
        <h3>📍 기상청 표시 ({weather.location})</h3>
        <div className="weather-coordinates">
          {weather.coordinates ? (
            <>
              <div>{formatCoordinate(weather.coordinates.lat, 'lat')}</div>
              <div>{formatCoordinate(weather.coordinates.lon, 'lon')}</div>
            </>
          ) : (
            <div>{location?.name ?? '위치 정보 없음'}</div>
          )}
        </div>
      </div>
      <div className="weather-details">
        <div className="weather-grid">
          <div className="weather-card"><strong>온도</strong><span>{weather.temperature ?? '-'}°C</span></div>
          <div className="weather-card"><strong>습도</strong><span>{weather.humidity ? `${weather.humidity}%` : '-'}</span></div>
          <div className="weather-card"><strong>자외선 지수</strong><span>{weather.uvIndex ?? '-'} </span></div>
          <div className="weather-card"><strong>미세먼지 PM10</strong><span>{weather.pm10 ? `${weather.pm10.toFixed(1)}` : '-'} μg/m³</span></div>
          <div className="weather-card"><strong>미세먼지 PM2.5</strong><span>{weather.pm2_5 ? `${weather.pm2_5.toFixed(1)}` : '-'} μg/m³</span></div>
          <div className="weather-card"><strong>일출</strong><span>{formatTime(weather.sunrise)}</span></div>
          <div className="weather-card"><strong>일몰</strong><span>{formatTime(weather.sunset)}</span></div>
          <div className="weather-card"><strong>구름</strong><span>{weather.cloudCover ? `${weather.cloudCover}%` : '-'}</span></div>
        </div>
        <div className="weather-meta">
          <p>☁️ 날씨: <strong>{weather.weatherDescription}</strong></p>
          <p>💨 풍속: <strong>{weather.windspeed ? `${weather.windspeed} m/s` : '-'}</strong></p>
          <p>🧭 풍향: <strong>{weather.windDirection ? `${weather.windDirection}°` : '-'}</strong></p>
          <p style={{ marginTop: 8, fontSize: 14, color: '#94a3b8' }}>
            업데이트: {weather.timestamp ? new Date(weather.timestamp).toLocaleTimeString('ko-KR') : '-'}
          </p>
          {weather.dataQuality && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
              <p>📊 데이터 신뢰도: 
                <span style={{ 
                  color: weather.dataQuality.overall === 'high' ? '#10b981' : 
                         weather.dataQuality.overall === 'medium' ? '#f59e0b' : '#ef4444',
                  fontWeight: 'bold'
                }}>
                  {weather.dataQuality.overall === 'high' ? ' 높음' : 
                   weather.dataQuality.overall === 'medium' ? ' 보통' : ' 낮음'}
                </span>
              </p>
              <p style={{ fontSize: 11, marginTop: 4 }}>
                출처: {weather.dataSource || 'Open-Meteo'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}