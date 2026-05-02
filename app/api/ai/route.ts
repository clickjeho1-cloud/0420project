import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

// 초기 PID
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

  // 🔥 AI 튜닝 로직
  if (Math.abs(error) > 3) {
    Kp += 0.1;
  }

  if (Math.abs(error) < 1) {
    Ki += 0.01;
  }

  if (derivative > 2) {
    Kd += 0.05;
  }

  const output = Kp * error + Ki * integral + Kd * derivative;

  prevError = error;

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
    pid: { Kp, Ki, Kd, error, output }
  });
}