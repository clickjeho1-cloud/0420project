'use client';

import { useEffect, useState } from 'react';

export default function WeatherPanel() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetchWeather();
    const i = setInterval(fetchWeather, 600000);
    return () => clearInterval(i);
  }, []);

  async function fetchWeather() {
    const res = await fetch('/api/weather');
    const data = await res.json();
    setWeather(data);
  }

  if (!weather) return <div>Loading weather...</div>;

  return (
    <div style={{
      border: '1px solid #ccc',
      padding: 10,
      borderRadius: 8
    }}>
      <h3>🌤️ 외기 정보</h3>
      <p>온도: {weather.temp}℃</p>
      <p>풍속: {weather.wind} m/s</p>
    </div>
  );
}
