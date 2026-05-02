'use client';

import { useState } from 'react';

export default function SchedulePanel() {

  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");

  const sendSchedule = async () => {

    const [startH, startM] = start.split(":");
    const [endH, endM] = end.split(":");

    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_hour: Number(startH),
        start_min: Number(startM),
        end_hour: Number(endH),
        end_min: Number(endM)
      }),
    });
  };

  return (
    <div className="schedule-panel">

      <h3>⏱ 스케줄 제어</h3>

      <div>
        <label>시작 시간</label>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>

      <div>
        <label>종료 시간</label>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>

      <button onClick={sendSchedule}>
        스케줄 저장
      </button>

    </div>
  );
}