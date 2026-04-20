/** 브라우저에 노출되는 환경 변수 이름 (Vercel / .env.local 과 동일해야 함) */
export const MQTT_ENV_KEYS = [
  "NEXT_PUBLIC_MQTT_WS_URL",
  "NEXT_PUBLIC_MQTT_USER",
  "NEXT_PUBLIC_MQTT_PASSWORD",
] as const;

export const SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function isSet(v: string | undefined): boolean {
  return Boolean(v && String(v).trim().length > 0);
}

export function getMissingMqttEnvKeys(): string[] {
  return MQTT_ENV_KEYS.filter((k) => !isSet(process.env[k]));
}

export function getMissingSupabaseEnvKeys(): string[] {
  return SUPABASE_ENV_KEYS.filter((k) => !isSet(process.env[k]));
}

/**
 * HiveMQ 콘솔에 호스트만 적힌 경우 대비: wss:// 없으면 붙임
 */
export function normalizeMqttWsUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let t = raw.trim();
  if (t.startsWith("https://")) {
    t = `wss://${t.slice("https://".length)}`;
  } else if (t.startsWith("http://")) {
    t = `ws://${t.slice("http://".length)}`;
  }
  if (!(t.startsWith("wss://") || t.startsWith("ws://"))) {
    t = `wss://${t}`;
  }

  // HiveMQ Cloud WebSocket는 보통 /mqtt 경로를 사용함.
  // 사용자가 호스트/포트만 입력한 경우(또는 / 만 있는 경우) /mqtt를 자동 보정.
  try {
    const u = new URL(t);
    const host = u.hostname.toLowerCase();
    const path = u.pathname || "/";
    if (host.endsWith("hivemq.cloud") && (path === "/" || path === "")) {
      u.pathname = "/mqtt";
      return u.toString();
    }
  } catch {
    // URL 파싱 실패 시 원본 유지
  }

  return t;
}
