#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===== WiFi =====
const char* ssid = "daesin_302";
const char* password = "ds123456";

// ===== MQTT TLS =====
const char* mqtt_server = "763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;
const char* mqtt_user = "jhk001";
const char* mqtt_pass = "Sinwonpark1!";

const char* topic_pub = "smartfarm/jeho123/data";
const char* topic_sub = "smartfarm/jeho123/control";

// ===== DHT =====
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ===== RS485 / EC =====
HardwareSerial RS485Serial(2);
#define RS485_RX 16
#define RS485_TX 17
#define RS485_DIR 18

float ecValue = 0.0;

// ===== 74HC595 RELAY =====
#define DATA_PIN   12
#define CLOCK_PIN  22
#define LATCH_PIN  23
#define OE_PIN     13

byte relayState = 0xFF; // all OFF (active LOW)

#define RELAY1_PUMP   0
#define RELAY2_RELAY1 1
#define RELAY3_LED    2
#define RELAY4_HEATER 3
#define RELAY5_FAN    4

bool fanState = false;
bool pumpState = false;
bool ledState = false;
bool heaterState = false;

bool pumpRunning = false;
unsigned long pumpStart = 0;
unsigned long pumpDuration = 0;

WiFiClientSecure espClient;
PubSubClient client(espClient);

void updateRelay() {
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, relayState);
  digitalWrite(LATCH_PIN, HIGH);

  Serial.print("74HC595 state: 0x");
  if (relayState < 0x10) Serial.print('0');
  Serial.println(relayState, HEX);
}

void setRelay(int relay, bool on) {
  if (on)
    bitClear(relayState, relay); // active LOW
  else
    bitSet(relayState, relay);

  updateRelay();
}

void relayStartupTest() {
  Serial.println("Relay startup test...");
  for (int i = 0; i < 8; i++) {
    Serial.print("Test relay ON : ");
    Serial.println(i + 1);
    setRelay(i, true);
    delay(200);
    setRelay(i, false);
    delay(100);
  }
  relayState = 0xFF;
  updateRelay();
  Serial.println("Relay startup test done");
}

float readEC() {
  uint8_t request[8] = {
    0x01,
    0x03,
    0x00,
    0x00,
    0x00,
    0x01,
    0x84,
    0x0A
  };

  digitalWrite(RS485_DIR, HIGH);
  delay(2);
  RS485Serial.write(request, 8);
  RS485Serial.flush();
  delay(2);

  digitalWrite(RS485_DIR, LOW);
  delay(100);

  uint8_t response[7];
  int idx = 0;

  while (RS485Serial.available() && idx < 7) {
    response[idx++] = RS485Serial.read();
  }

  if (idx >= 7) {
    int value = (response[3] << 8) | response[4];
    return value / 100.0;
  }

  return ecValue;
}

void handleDevices(JsonObject devices) {
  if (devices.containsKey("pump")) {
    bool on = devices["pump"]["on"] | false;
    int duration = devices["pump"]["duration_sec"] | 0;

    setRelay(RELAY1_PUMP, on);
    pumpState = on;

    if (on && duration > 0) {
      pumpRunning = true;
      pumpStart = millis();
      pumpDuration = duration * 1000UL;
    } else if (!on) {
      pumpRunning = false;
    }
  }

  if (devices.containsKey("relay1")) {
    bool on = devices["relay1"]["on"] | false;
    setRelay(RELAY2_RELAY1, on);
  }

  if (devices.containsKey("fan")) {
    bool on = devices["fan"]["on"] | false;
    setRelay(RELAY5_FAN, on);
    fanState = on;
  }

  if (devices.containsKey("led")) {
    bool on = devices["led"]["on"] | false;
    setRelay(RELAY3_LED, on);
    ledState = on;
  }

  if (devices.containsKey("heater")) {
    bool on = devices["heater"]["on"] | false;
    setRelay(RELAY4_HEATER, on);
    heaterState = on;
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);

  if (err) {
    Serial.println("JSON ERROR");
    return;
  }

  const char* cmd = doc["cmd_type"];
  if (cmd && strcmp(cmd, "manual") == 0) {
    JsonObject devices = doc["devices"];
    handleDevices(devices);
    Serial.println("COMMAND APPLIED");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("MQTT CONNECTING...");
    if (client.connect("esp32_client", mqtt_user, mqtt_pass)) {
      Serial.println("OK");
      client.subscribe(topic_sub);
    } else {
      Serial.print("FAILED : ");
      Serial.println(client.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);

  pinMode(DATA_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);
  pinMode(OE_PIN, OUTPUT);
  digitalWrite(OE_PIN, LOW);

  updateRelay();
  relayStartupTest();

  pinMode(RS485_DIR, OUTPUT);
  digitalWrite(RS485_DIR, LOW);
  RS485Serial.begin(9600, SERIAL_8N1, RS485_RX, RS485_TX);

  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWIFI CONNECTED");
  Serial.print("IP : ");
  Serial.println(WiFi.localIP());

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  if (pumpRunning && millis() - pumpStart > pumpDuration) {
    setRelay(RELAY1_PUMP, false);
    pumpRunning = false;
    pumpState = false;
  }

  ecValue = readEC();

  static unsigned long lastTime = 0;
  if (millis() - lastTime > 2000) {
    lastTime = millis();

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("DHT ERROR");
      return;
    }

    StaticJsonDocument<512> doc;
    doc["temperature"] = temp;
    doc["humidity"] = hum;
    doc["ec"] = ecValue;
    doc["fan"] = fanState;
    doc["pump"] = pumpState;
    doc["led"] = ledState;
    doc["heater"] = heaterState;

    char buffer[512];
    serializeJson(doc, buffer);
    client.publish(topic_pub, buffer);
    Serial.println(buffer);
  }
}
