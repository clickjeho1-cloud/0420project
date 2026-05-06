import { NextResponse } from 'next/server';

type SensorInput = {
  temp?: number;
  hum?: number;
  ec?: number;
  ph?: number;
  ppfd?: number;
  nutTemp?: number;
};

function suggestControl(sensor: SensorInput) {
  const { temp = 0, hum = 0, ec = 0, ph = 0, ppfd = 0 } = sensor;
  const suggestion: Record<string, string> = {};
  const reasons: string[] = [];

  if (temp >= 28) {
    suggestion.temp = '온도를 낮추세요 (냉방·팬 가동 권장)';
    suggestion.fan = 'ON';
    reasons.push('현재 온도가 높습니다.');
  } else if (temp <= 18) {
    suggestion.temp = '온도를 올리세요 (난방 또는 보온)';
    suggestion.fan = 'OFF';
    reasons.push('현재 온도가 낮습니다.');
  } else {
    suggestion.temp = '온도 양호';
    suggestion.fan = temp >= 24 ? 'ON' : 'OFF';
    if (temp >= 24) reasons.push('약간 높아서 환기가 필요할 수 있습니다.');
  }

  if (hum < 45) {
    suggestion.humidity = '습도를 올리세요';
    suggestion.pump = 'ON';
    reasons.push('습도가 낮습니다. 관수가 필요합니다.');
  } else if (hum > 80) {
    suggestion.humidity = '습도를 줄이세요';
    suggestion.pump = 'OFF';
    reasons.push('습도가 높아 곰팡이 위험이 있습니다.');
  } else {
    suggestion.humidity = '습도 적정';
    suggestion.pump = 'OFF';
  }

  if (ec < 1.5) {
    suggestion.ec = 'EC 보충 필요';
    reasons.push('영양염도가 낮습니다. 비료 보충을 검토하세요.');
  } else if (ec > 3.0) {
    suggestion.ec = 'EC 희석 필요';
    reasons.push('영양염도가 높아 희석이 필요합니다.');
  } else {
    suggestion.ec = 'EC 적정';
  }

  if (ppfd < 300) {
    suggestion.ppfd = '광량을 높이세요';
    suggestion.light = 'ON';
    reasons.push('광량이 낮습니다. 조명 증가가 필요합니다.');
  } else if (ppfd > 1200) {
    suggestion.ppfd = '광량을 줄이세요';
    suggestion.light = 'OFF';
    reasons.push('광량이 높아 잎이 스트레스 받을 수 있습니다.');
  } else {
    suggestion.ppfd = '광량 적정';
    suggestion.light = 'ON';
  }

  suggestion.note = reasons.length > 0 ? reasons.join(' ') : '현재 상태가 적정합니다.';
  if (!suggestion.fan) suggestion.fan = 'OFF';
  if (!suggestion.pump) suggestion.pump = 'OFF';
  if (!suggestion.light) suggestion.light = 'ON';

  return { suggestion, reasons };
}

export async function POST(req: Request) {
  const payload = await req.json();
  const { suggestion, reasons } = suggestControl(payload as SensorInput);

  return NextResponse.json({
    ok: true,
    suggestion,
    reasons,
  });
}
