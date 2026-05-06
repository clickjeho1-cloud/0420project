'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

/* ================= TYPES ================= */

type SensorData = {
  temperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterTemp: number;
  lux: number;
};

/* ================= PAGE ================= */

export default function DashboardPage() {

  const [time, setTime] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const [controls, setControls] = useState({
    fan: false,
    pump: false,
    led: false,
    heater: false,
  });

  const [sensors, setSensors] = useState<SensorData>({
    temperature: 24,
    humidity: 58,
    ec: 2.2,
    ph: 6.1,
    waterTemp: 21,
    lux: 32000,
  });

  /* ================= CLOCK ================= */
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(t);
  }, []);

  /* ================= SIM DATA ================= */
  useEffect(() => {
    const t = setInterval(() => {
      const data: SensorData = {
        temperature: 20 + Math.random() * 7,
        humidity: 45 + Math.random() * 25,
        ec: 1.2 + Math.random() * 2,
        ph: 5.5 + Math.random(),
        waterTemp: 18 + Math.random() * 5,
        lux: 20000 + Math.random() * 25000,
      };

      setSensors(data);

      setHistory(prev => [
        ...prev.slice(-80),
        {
          time: new Date().toLocaleTimeString().slice(0, 8),
          ...data,
        },
      ]);

    }, 2000);

    return () => clearInterval(t);
  }, []);

  const toggleControl = (key: keyof typeof controls) => {
    setControls(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  /* ================= STATUS COLORS (SCADA STANDARD) ================= */

  const ecStatus =
    sensors.ec < 1.5
      ? 'ok'
      : sensors.ec < 3
      ? 'warn'
      : 'danger';

  const phStatus =
    sensors.ph >= 5.8 && sensors.ph <= 7.2
      ? 'ok'
      : sensors.ph >= 5.5 && sensors.ph <= 7.5
      ? 'warn'
      : 'danger';

  return (
    <div className="dashboard">

      {/* HEADER BAR */}
      <div className="topbar">
        <div className="title">SCADA CONTROL SYSTEM</div>
        <div className="clock">{time}</div>
      </div>

      {/* MAIN GRID (균형 구조 핵심) */}
      <div className="grid-layout">

        {/* LEFT PANEL - STATUS */}
        <div className="panel">

          <h2>PROCESS STATUS</h2>

          <div className="status-grid">

            <StatusBox label="TEMP" value={sensors.temperature.toFixed(1)} unit="°C" />
            <StatusBox label="HUM" value={sensors.humidity.toFixed(1)} unit="%" />

            <StatusBox label="EC" value={sensors.ec.toFixed(2)} status={ecStatus} />
            <StatusBox label="PH" value={sensors.ph.toFixed(2)} status={phStatus} />

            <StatusBox label="WATER" value={sensors.waterTemp.toFixed(1)} unit="°C" />
            <StatusBox label="LUX" value={Math.floor(sensors.lux)} />

          </div>

        </div>

        {/* CENTER PANEL - WAVEFORM */}
        <div className="panel wide">

          <h2>REALTIME WAVEFORM</h2>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={history}>
              <CartesianGrid stroke="#1f2937" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />

              <Area dataKey="temperature" stroke="#ff4d4d" fillOpacity={0.1} />
              <Area dataKey="humidity" stroke="#4dff88" fillOpacity={0.1} />
              <Area dataKey="ec" stroke="#4da6ff" fillOpacity={0.1} />
              <Area dataKey="ph" stroke="#ffd24d" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>

        </div>

        {/* RIGHT PANEL - CONTROL */}
        <div className="panel">

          <h2>CONTROL SYSTEM</h2>

          <div className="control-grid">

            {(Object.keys(controls) as (keyof typeof controls)[]).map(k => {

              const active = controls[k];

              return (
                <button
                  key={k}
                  onClick={() => toggleControl(k)}
                  className={`control-btn ${
                    active ? 'on' : 'off'
                  }`}
                >
                  <div>{k.toUpperCase()}</div>
                  <div className="state">
                    {active ? 'ACTIVE' : 'OFF'}
                  </div>
                </button>
              );
            })}

          </div>

        </div>

      </div>

      {/* FOOTER */}
      <div className="footer">
        Glovera SCADA System © 2026
      </div>

      {/* ================= STYLE ================= */}
      <style jsx>{`

        .dashboard {
          min-height: 100vh;
          background: #05070f;
          color: white;
          padding: 16px;
          font-family: monospace;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #1f2937;
        }

        .title {
          color: #38bdf8;
          font-weight: bold;
        }

        .clock {
          color: #94a3b8;
          font-size: 12px;
        }

        /* 핵심: 3분할 SCADA 구조 */
        .grid-layout {
          display: grid;
          grid-template-columns: 1fr 2fr 1fr;
          gap: 12px;
          margin-top: 16px;
        }

        .panel {
          background: #0b1220;
          border: 1px solid #1f2937;
          padding: 12px;
          border-radius: 10px;
        }

        .panel.wide {
          display: flex;
          flex-direction: column;
        }

        h2 {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 10px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .box {
          background: #0f172a;
          padding: 8px;
          border-radius: 6px;
          text-align: center;
        }

        .ok { color: #22c55e; }
        .warn { color: #facc15; }
        .danger { color: #ef4444; }

        .control-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-btn {
          padding: 10px;
          border: 1px solid #334155;
          background: #0f172a;
          color: white;
          cursor: pointer;
          text-align: left;
        }

        .control-btn.on {
          border-color: #22c55e;
          color: #22c55e;
        }

        .control-btn.off {
          border-color: #ef4444;
          color: #ef4444;
        }

        .state {
          font-size: 10px;
          opacity: 0.7;
        }

        .footer {
          margin-top: 16px;
          text-align: center;
          font-size: 11px;
          color: #64748b;
        }

      `}</style>

    </div>
  );
}

/* ================= STATUS BOX ================= */

function StatusBox({
  label,
  value,
  unit,
  status,
}: {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'ok' | 'warn' | 'danger';
}) {
  return (
    <div className={`box ${status || ''}`}>
      <div style={{ fontSize: 10, opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 'bold' }}>
        {value}{unit}
      </div>
    </div>
  );
}