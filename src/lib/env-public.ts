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
  if (t.startsWith("wss://") || t.startsWith("ws://")) {
    return t;
  }
  return `wss://${t}`;
}
