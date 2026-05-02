'use client';

import { useEffect, useState } from 'react';

export default function WeatherPanel() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=37.57&longitude=126.98&current_weather=true'
        );
        const data = await res.json();
        setWeather(data.current_weather);
      } catch (e) {
        console.error('weather error', e);
      }
    };

    load();
    const t = setInterval(load, 600000); // 10분 갱신

    return () => clearInterval(t);
  }, []);

  return (
    <div className="weather-box">
      <h4>🌦 외부 날씨</h4>

      {weather ? (
        <>
          <p>{weather.temperature}°C</p>
          <p>풍속 {weather.windspeed} km/h</p>
        </>
      ) : (
        <p>불러오는 중...</p>
      )}
    </div>
  );
}