import mqtt from "mqtt";
import { createClient } from "@supabase/supabase-js";

useEffect(() => {
  if (!effectiveMqttWsUrl || !user || !pass || !wsUrl) {
    setMqttStatus("설정없음");
    setMqttReady(false);
    setMqttError(null);
    return;
  }

  // ✅ Supabase client 생성
  const sb = createClient(effectiveSupabaseUrl, effectiveSupabaseAnon);

  let cancelled = false;

  setMqttStatus("연결 중");
  setMqttReady(false);
  setMqttError(null);

  const timeout = setTimeout(() => {
    if (cancelled) return;
    setMqttStatus("끊김");
    setMqttReady(false);
    setMqttError("연결 시간 초과 (8초)");
  }, 8000);

  try {
    const client = mqtt.connect(wsUrl, {
      username: user,
      password: pass,
      clientId: `web-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 4000,
      connectTimeout: 10000,
      clean: true,
    });

    clientRef.current = client;

    // ✅ 연결 성공
    client.on("connect", () => {
      if (cancelled) return;

      clearTimeout(timeout);

      setMqttStatus("연결됨");
      setMqttReady(true);
      setMqttError(null);

      console.log("✅ MQTT connected");

      client.subscribe([
        MQTT_TOPIC_TEMP,
        MQTT_TOPIC_HUMI,
        MQTT_TOPIC_STATUS,
      ]);
    });

    client.on("reconnect", () => {
      setMqttStatus("연결 중");
      setMqttReady(false);
    });

    client.on("offline", () => {
      setMqttStatus("끊김");
      setMqttReady(false);
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError(String(err?.message || err));
    });

    // 🔥 MQTT 수신 + Supabase 저장
    client.on("message", async (topic, payload) => {
      const msg = payload.toString();

      let t = temp;
      let h = humi;

      if (topic === MQTT_TOPIC_TEMP) {
        const v = parseFloat(msg);
        if (!Number.isNaN(v)) {
          setTemp(v);
          t = v;
        }

      } else if (topic === MQTT_TOPIC_HUMI) {
        const v = parseFloat(msg);
        if (!Number.isNaN(v)) {
          setHumi(v);
          h = v;
        }

      } else if (topic === MQTT_TOPIC_STATUS) {
        setLastStatus(msg);
      }

      // ✅ 온도+습도 둘 다 있을 때만 DB 저장
      if (t != null && h != null) {
        try {
          await sb.from("sensor_data").insert({
            temperature: t,
            humidity: h,
          });
          console.log("📦 Supabase 저장 완료", t, h);
        } catch (e) {
          console.error("❌ Supabase 저장 실패", e);
        }
      }
    });

  } catch (e) {
    clearTimeout(timeout);
    setMqttStatus("끊김");
    setMqttReady(false);
    setMqttError(`mqtt 초기화 실패: ${String(e)}`);
  }

  return () => {
    cancelled = true;
    clearTimeout(timeout);

    if (clientRef.current) {
      try {
        clientRef.current.end(true);
      } catch {}
      clientRef.current = null;
    }
  };
}, [effectiveMqttWsUrl, wsUrl, user, pass, effectiveSupabaseUrl, effectiveSupabaseAnon]);
