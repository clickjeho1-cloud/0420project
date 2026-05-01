import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

export async function POST(req: Request) {
  const body = await req.json();

  const { cmd } = body;

  console.log('SEND:', cmd);

  // 🔥 MQTT 전송
  client.publish('smartfarm/control', cmd);

  return NextResponse.json({ ok: true });
}