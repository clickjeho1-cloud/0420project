import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud', {
  username: 'jhk001',
  password: 'Sinwonpark1!',
});

export async function POST(req: Request) {
  const body = await req.json();

  const topic = 'smartfarm/jeho123/control';

  // 🔥 그대로 MQTT로 전달
  client.publish(topic, JSON.stringify(body));

  console.log("MQTT SEND:", body);

  return NextResponse.json({
    ok: true,
    sent: body
  });
}