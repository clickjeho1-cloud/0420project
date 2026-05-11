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

  // 2. 기기 제어(릴레이) 상태
  const [deviceState, setDeviceState] = useState({
    fan: false,
    pump: false,
    led: false,
    heater: false
  });

  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);

  useEffect(() => {
    // 3. 브라우저용 웹소켓(wss) 연결
    const client = mqtt.connect('wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt', {
      username: process.env.NEXT_PUBLIC_MQTT_USER || 'jhk001',
      password: process.env.NEXT_PUBLIC_MQTT_PASS || 'Sinwonpark1!',
      clientId: `web-dashboard-${Math.random().toString(16).slice(2)}`
    });

    client.on('connect', () => {
      console.log('✅ 대시보드 웹소켓 연결 성공!');
      // ESP32와 동일한 토픽 구독
      client.subscribe('smartfarm/jeho123/data');
      setMqttClient(client);
    });

    // 4. 메시지를 받을 때마다 화면 업데이트
    client.on('message', (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        setSensorData(prev => ({
          ...prev,
          temperature: payload.temperature ?? payload.temp ?? prev.temperature,
          humidity: payload.humidity ?? payload.hum ?? prev.humidity,
          ec: payload.ec_value ?? payload.ec ?? prev.ec,
          ph: payload.ph_value ?? payload.ph ?? prev.ph,
          ppfd: payload.light_intensity ?? payload.ppfd ?? prev.ppfd,
          nutrient_temp: payload.nutrient_temp ?? payload.water_temp ?? prev.nutrient_temp,
        }));

        // ESP32가 보내는 장치 상태 업데이트
        setDeviceState(prev => ({
          ...prev,
          fan: payload.fan ?? prev.fan,
          pump: payload.pump ?? prev.pump,
          led: payload.led ?? prev.led,
          heater: payload.heater ?? prev.heater,
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

  // 5. 기기 제어 명령 전송
  const toggleDevice = (device: 'fan' | 'pump' | 'led' | 'heater', currentState: boolean) => {
    if (!mqttClient) {
      alert('서버와 연결 중입니다...');
      return;
    }
    const newState = !currentState;
    const command: any = { cmd_type: "manual", devices: { [device]: { on: newState } } };
    
    // 펌프는 안전을 위해 10초 뒤 자동 종료되도록 옵션 추가 (ESP32 소스와 연동)
    if (device === 'pump' && newState) {
      command.devices.pump.duration_sec = 10; 
    }

    mqttClient.publish('smartfarm/jeho123/control', JSON.stringify(command));
    setDeviceState(prev => ({ ...prev, [device]: newState }));
  };

  // 6. 화면 UI 렌더링
  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* 센서 데이터 섹션 */}
      <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        🌱 실시간 센서 모니터링
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '3rem' }}>
        
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

      {/* 스마트팜 기기 제어 섹션 */}
      <h2 style={{ marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        ⚙️ 기기 수동 제어
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
        
        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 15px 0' }}>환기 팬 (Fan)</p>
          <button 
            onClick={() => toggleDevice('fan', deviceState.fan)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%', background: deviceState.fan ? '#3b82f6' : '#475569', color: 'white' }}
          >
            {deviceState.fan ? 'ON (작동중)' : 'OFF'}
          </button>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 15px 0' }}>관수 펌프 (Pump)</p>
          <button 
            onClick={() => toggleDevice('pump', deviceState.pump)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%', background: deviceState.pump ? '#10b981' : '#475569', color: 'white' }}
          >
            {deviceState.pump ? 'ON (관수중)' : 'OFF'}
          </button>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 15px 0' }}>생장 LED</p>
          <button 
            onClick={() => toggleDevice('led', deviceState.led)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%', background: deviceState.led ? '#f59e0b' : '#475569', color: 'white' }}
          >
            {deviceState.led ? 'ON (점등됨)' : 'OFF'}
          </button>
        </div>

        <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', margin: '0 0 15px 0' }}>히터 (Heater)</p>
          <button 
            onClick={() => toggleDevice('heater', deviceState.heater)}
            style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%', background: deviceState.heater ? '#ef4444' : '#475569', color: 'white' }}
          >
            {deviceState.heater ? 'ON (가열중)' : 'OFF'}
          </button>
        </div>

      </div>
    </div>
  );
}