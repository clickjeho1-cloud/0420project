import { NextResponse } from 'next/server';
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://broker.hivemq.com');

export async function POST(req: Request) {
  const body = await req.json();

  const topic = 'smartfarm/jeho123/control';

  const payload = {
    cmd_type: 'schedule',
    start_hour: body.start_hour,
    start_min: body.start_min,
    end_hour: body.end_hour,
    end_min: body.end_min
  };

  client.publish(topic, JSON.stringify(payload));

  return NextResponse.json({
    ok: true,
    sent: payload
  });
}