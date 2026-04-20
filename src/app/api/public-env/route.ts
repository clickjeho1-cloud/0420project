import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 클라이언트에서 필요한 공개 설정을 런타임에 내려줌.
 * (MQTT는 브라우저에서 접속하므로 사용자/비밀번호를 숨길 수 없습니다)
 */
export function GET() {
  const mqttWsUrl = process.env.NEXT_PUBLIC_MQTT_WS_URL ?? "";
  const mqttUser = process.env.NEXT_PUBLIC_MQTT_USER ?? "";
  const mqttPassword = process.env.NEXT_PUBLIC_MQTT_PASSWORD ?? "";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const missingMqttKeys = [
    ["NEXT_PUBLIC_MQTT_WS_URL", mqttWsUrl],
    ["NEXT_PUBLIC_MQTT_USER", mqttUser],
    ["NEXT_PUBLIC_MQTT_PASSWORD", mqttPassword],
  ]
    .filter(([, v]) => !String(v || "").trim())
    .map(([k]) => k);

  const missingSupabaseKeys = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
  ]
    .filter(([, v]) => !String(v || "").trim())
    .map(([k]) => k);

  return NextResponse.json({
    ok: true,
    mqtt: {
      wsUrl: mqttWsUrl,
      user: mqttUser,
      password: mqttPassword,
      missingKeys: missingMqttKeys,
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      missingKeys: missingSupabaseKeys,
    },
    ts: new Date().toISOString(),
  });
}

