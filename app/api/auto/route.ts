import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

export async function POST(req: Request) {
  const body = await req.json();

  const { temperature, humidity } = body;

  let command: any = {
    farm_id: "greenhouse01",
    cmd_type: "manual",
    devices: {}
  };

  // 🔥 위험 판단
  if (temperature > 30) {
    command.devices.fan = { pwm: 80 };
  }

  if (temperature < 18) {
    command.devices.heater = { on: true };
  }

  if (humidity < 40) {
    command.devices.pump = { on: true, duration_sec: 30 };
  }

  // 🔥 MQTT 전송
  client.publish(
    'smartfarm/greenhouse01/control',
    JSON.stringify(command)
  );

  return NextResponse.json({
    ok: true,
    command
  });
}