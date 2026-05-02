import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

export async function POST(req: Request) {
  const body = await req.json();

  const { temperature, humidity, ec, ph } = body;

  let devices: any = {};

  if (temperature > 30) devices.fan = { pwm: 80 };
  if (temperature < 18) devices.heater = { on: true };

  if (humidity < 40) devices.pump = { on: true };

  if (ec < 1.2) devices.pump = { on: true };
  if (ph > 7.0) devices.pump = { on: true };

  client.publish('smartfarm/jeho123/control',
    JSON.stringify({
      cmd_type: 'auto',
      devices
    })
  );

  return NextResponse.json({ ok: true, devices });
}