// 아래 3가지를 기존 page.tsx에 추가/교체

/* =========================================================
1. 계기판 section 내부 추가
기존 <div className="gauge-grid">...</div>
바로 아래 추가
========================================================= */

<div className="speed-grid">

  <SpeedMeter
    title="온도 속도계"
    value={sensors.temperature}
    min={0}
    max={50}
    unit="°C"
    color="#ff5500"
  />

  <SpeedMeter
    title="습도 속도계"
    value={sensors.humidity}
    min={0}
    max={100}
    unit="%"
    color="#00ccff"
  />

</div>

<div className="wave-panel">

  <h3>EC / 습도 파형 분석</h3>

  <ResponsiveContainer
    width="100%"
    height={240}
  >

    <LineChart data={history}>

      <CartesianGrid stroke="#1e293b" />

      <XAxis dataKey="time" />

      <YAxis />

      <Tooltip />

      <Line
        type="monotone"
        dataKey="ec"
        stroke="#00ff88"
        strokeWidth={4}
        dot={false}
      />

      <Line
        type="monotone"
        dataKey="hum"
        stroke="#00ccff"
        strokeWidth={3}
        dot={false}
      />

    </LineChart>

  </ResponsiveContainer>

</div>


/* =========================================================
2. 파일 맨 아래 추가
Gauge() 함수 아래 추가
========================================================= */

function SpeedMeter({
  title,
  value,
  min,
  max,
  unit,
  color,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  color: string;
}) {

  const rotation =
    ((value - min) /
      (max - min)) *
      180 -
    90;

  return (

    <div className="speed-card">

      <h3>{title}</h3>

      <div className="speed-meter">

        <div
          className="speed-needle"
          style={{
            transform:
              `rotate(${rotation}deg)`,

            background: color,
          }}
        />

        <div className="speed-center">

          <div>
            {value}
          </div>

          <small>
            {unit}
          </small>

        </div>

      </div>

    </div>

  );
}


/* =========================================================
3. style jsx 안에 추가
========================================================= */

.speed-grid {

  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 20px;

  margin-top: 30px;
}

.speed-card {

  background: #020617;

  padding: 20px;

  border-radius: 20px;

  text-align: center;
}

.speed-meter {

  width: 320px;
  height: 160px;

  margin: auto;

  border-top-left-radius: 320px;
  border-top-right-radius: 320px;

  border: 12px solid #1e293b;

  border-bottom: none;

  position: relative;

  overflow: hidden;

  background:
    radial-gradient(
      circle at bottom,
      #111827,
      #020617
    );
}

.speed-needle {

  width: 5px;
  height: 120px;

  position: absolute;

  bottom: 0;
  left: 50%;

  transform-origin: bottom;
}

.speed-center {

  position: absolute;

  bottom: 10px;
  left: 50%;

  transform: translateX(-50%);

  font-size: 28px;

  font-weight: bold;

  color: white;
}

.wave-panel {

  margin-top: 30px;

  background: #020617;

  padding: 20px;

  border-radius: 20px;
}