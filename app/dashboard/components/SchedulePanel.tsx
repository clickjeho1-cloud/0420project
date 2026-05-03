'use client';

import { useState } from 'react';

export default function SchedulePanel() {

  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');

  const send = async () => {

    const [sh, sm] = start.split(':');
    const [eh, em] = end.split(':');

    await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_hour: Number(sh),
        start_min: Number(sm),
        end_hour: Number(eh),
        end_min: Number(em)
      }),
    });
  };

  return (
    <div className="schedule">
      <h3>⏱ 스케줄</h3>

      <input type="time" value={start} onChange={e=>setStart(e.target.value)} />
      <input type="time" value={end} onChange={e=>setEnd(e.target.value)} />

      <button onClick={send}>저장</button>
    </div>
  );
}