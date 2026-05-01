'use client';

import { useEffect, useState } from 'react';

export default function WeatherPanel() {
  const [w, setW] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=37.57&longitude=126.98&current_weather=true'
      );
      const json = await res.json();
      setW(json.current_weather);
    };
    load();
  }, []);

  return (
    <div style={{ marginBottom: 20 }}>
      <h3>🌦 외부 날씨</h3>
      <p>온도: {w?.temperature}</p>
      <p>풍속: {w?.windspeed}</p>
    </div>
  );
}