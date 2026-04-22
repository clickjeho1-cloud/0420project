useEffect(() => {
  if (!effectiveMqttWsUrl || !user || !pass || !wsUrl) {
    setMqttStatus("설정없음");
    setMqttReady(false);
    setMqttError(null);
    return;
  }

  let cancelled = false;
  setMqttError(null);
  setMqttStatus("연결 중");
  setMqttReady(false);

  const timeout = window.setTimeout(() => {
    if (cancelled) return;
    setMqttStatus("끊김");
    setMqttReady(false);
    setMqttError("연결 시간 초과(8초) — WebSocket 확인");
  }, 8000);

  try {
    const client = mqtt.connect(wsUrl, {
      username: user,
      password: pass,
      clientId: `web-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 4000,
      clean: true,
    });

    clientRef.current = client;

    client.on("connect", () => {
      if (cancelled) return;
      clearTimeout(timeout);

      setMqttStatus("연결됨");
      setMqttReady(true);
      setMqttError(null);

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

    client.on("error", (e) => {
      console.error("MQTT", e);
      clearTimeout(timeout);
      setMqttStatus("끊김");
      setMqttReady(false);
      setMqttError(String((e as any)?.message || e));
    });

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
