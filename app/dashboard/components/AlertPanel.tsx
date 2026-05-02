'use client';

import { useEffect, useRef } from 'react';

export default function AlertPanel({ data }: any) {
  const lastAlertTime = useRef<number>(0);

  useEffect(() => {
    if (!data) return;

    // 🔥 서버 실행 방지 (Next 빌드 보호)
    if (typeof window === 'undefined') return;

    // 🔥 알림 권한 요청 (최초 1회)
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
      return;
    }

    // 🔥 너무 자주 울리는 것 방지 (10초 제한)
    const now = Date.now();
    if (now - lastAlertTime.current < 10000) return;

    let message = '';

    if (data.temperature > 30) {
      message = '🔥 온도 위험';
    } else if (data.humidity < 40) {
      message = '💧 습도 낮음';
    } else if (data.co2 > 1500) {
      message = '🌫 CO2 위험';
    } else if (data.ec < 1.2) {
      message = '🧪 EC 부족';
    }

    if (message) {
      new Notification(message);
      lastAlertTime.current = now;
    }
  }, [data]);

  return null;
}