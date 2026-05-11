"use client";

import { useEffect, useState } from 'react';
import mqtt from 'mqtt';

export default function Dashboard() {
  // 1. 센서 데이터를 담을 상태(State) 설정 (초기값 0)
  const [sensorData, setSensorData] = useState({
    temperature: 0,
    humidity: 0,
    ec: 0,
    ph: 0,
    ppfd: 0,
    nutrient_temp: 0
  });

  useEffect(() => {
    // 2. 브라우저용 웹소켓(wss) 연결 (8884 포트 필수)
    const client = mqtt.connect('wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt', {
      username: process.env.NEXT_PUBLIC_MQTT_USER || 'jhk001',
      password: process.env.NEXT_PUBLIC_MQTT_PASS || 'Sinwonpark1!',
      clientId: `web-dashboard-${Math.random().toString(16).slice(2)}`
    });

    client.on('connect', () => {
      console.log('✅ 대시보드 웹소켓 연결 성공!');
      // ESP32와 동일한 토픽 구독
      client.subscribe('smartfarm/jeho123/data');
    });

    // 3. 메시지를 받을 때마다 화면 상태(State) 업데이트
    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setSensorData(prev => ({
          ...prev,
          temperature: payload.temperature || payload.temp || prev.temperature,
          humidity: payload.humidity || payload.hum || prev.humidity,
          ec: payload.ec_value || payload.ec || prev.ec,
          ph: payload.ph_value || payload.ph || prev.ph,
          ppfd: payload.light_intensity || payload.ppfd || prev.ppfd,
          nutrient_temp: payload.nutrient_temp || payload.water_temp || prev.nutrient_temp,
        }));
      } catch (err) {
        console.error("데이터 파싱 에러:", err);
      }
    });

    // 컴포넌트가 언마운트될 때 연결 종료
    return () => {
      client.end();
    };
  }, []);

  // 4. 화면 UI 렌더링
  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>🌱 실시간 센서 모니터링</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
        
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>온도</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.temperature} °C</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>습도</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.humidity} %</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>EC</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.ec} mS/cm</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>pH</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.ph}</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>PPFD (광량)</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.ppfd} µmol</h3>
        </div>
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: 0 }}>양액온도</p>
          <h3 style={{ fontSize: '28px', margin: '10px 0 0 0' }}>{sensorData.nutrient_temp} °C</h3>
        </div>

      </div>
    </div>
  );
}