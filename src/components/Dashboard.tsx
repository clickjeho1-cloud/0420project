import mqtt from "mqtt"; // ⭐ 반드시 추가

useEffect(() => {
  if (!effectiveMqttWsUrl || !user || !pass || !wsUrl) {
    setMqttStatus("설정없음");
    setMqttReady(false);
    setMqttError(null);
    return;
  }

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

      client.subscribe(
        [MQTT_TOPIC_TEMP, MQTT_TOPIC_HUMI, MQTT_TOPIC_STATUS],
        (err) => {
          if (err) console.error("subscribe error", err);
        }
      );
    });

    // 🔄 재연결
    client.on("reconnect", () => {
      console.log("🔄 reconnecting...");
      setMqttStatus("연결 중");
      setMqttReady(false);
    });

    // ❌ 오프라인
    client.on("offline", () => {
      console.log("❌ offline");
      setMqttStatus("끊김");
      setMqttReady(false);
    });

    // ❌ 에러
    client.on("error", (err) => {
      console.error("MQTT error", err);

      clearTimeout(timeout);

      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError(String(err?.message || err));
    });

    // 📥 메시지 수신
    client.on("message", (topic, payload) => {
      const msg = payload.toString();

      if (topic === MQTT_TOPIC_TEMP) {
        const v = parseFloat(msg);
        if (!Number.isNaN(v)) setTemp(v);

      } else if (topic === MQTT_TOPIC_HUMI) {
        const v = parseFloat(msg);
        if (!Number.isNaN(v)) setHumi(v);

      } else if (topic === MQTT_TOPIC_STATUS) {
        setLastStatus(msg);
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

}, [effectiveMqttWsUrl, wsUrl, user, pass]);
