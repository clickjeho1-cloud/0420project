import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

// PID 파라미터 (나중에 UI에서 조절 가능)
let Kp = 1.5;
let Ki = 0.05;
let Kd = 0.2;

let prevError = 0;
let integral = 0;

export async function POST(req: Request) {
  const { temperature } = await req.json();

  const setpoint = 25;

  const error = setpoint - temperature;

  integral += error;
  const derivative = error - prevError;

  const output = Kp * error + Ki * integral + Kd * derivative;

  prevError = error;

  // 🔥 출력 → 팬 제어로 연결
  const pwm = Math.max(0, Math.min(100, output));

  const cmd = {
    farm_id: "greenhouse01",
    cmd_type: "manual",
    devices: {
      fan: { pwm }
    }
  };

  client.publish(
    'smartfarm/greenhouse01/ctrl',
    JSON.stringify(cmd)
  );

  return NextResponse.json({
    ok: true,
    pid: { error, integral, derivative, output }
  });
}