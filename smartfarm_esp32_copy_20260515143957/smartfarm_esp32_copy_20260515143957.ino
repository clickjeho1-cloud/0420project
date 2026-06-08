#include <Arduino.h>
#include <EEPROM.h>
#include <WiFiS3.h>
#include <ArduinoMqttClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Wire.h>
#include <DHT.h>

// ===== 네트워크 설정 =====
const char* ssid     = "Farm_2.4G";
const char* password = "20240603";

// HiveMQ Cloud 설정 (포트 8883은 SSL 필수)
const char* mqtt_server = "763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud";
const int   mqtt_port   = 8883;
const char* mqtt_user   = "jhk001";
const char* mqtt_pass   = "Sinwonpark1!";

const char* topic_pub = "smartfarm/jeho123/data";
const char* topic_sub = "smartfarm/jeho123/control";

// ===== 하드웨어 핀 설정 =====
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

#define FAN_PIN    3    // 릴레이 1
#define PUMP_PIN   5    // 릴레이 2
#define LED_PIN    6    // 릴레이 3
#define HEATER_PIN 9    // 릴레이 4

#define RELAY_ON   LOW
#define RELAY_OFF  HIGH

// ===== 글로벌 객체 및 변수 =====
WiFiSSLClient sslClient;
MqttClient    mqttClient(sslClient);

unsigned long lastFanMs    = 0;
unsigned long lastPumpMs   = 0;
unsigned long lastLedMs    = 0;
unsigned long s_lcdNextMs  = 0;
unsigned long lastMqttMs   = 0;

bool fanState    = true;
bool pumpState   = true;
bool ledState    = true;

const unsigned long TIME_1_MIN   = 60000UL;
const unsigned long TIME_5_MIN   = 300000UL;
const unsigned long TIME_30_MIN  = 1800000UL;
const unsigned long LCD_PERIOD_MS = 2000UL;
const unsigned long MQTT_PERIOD_MS = 10000UL; // 10초마다 서버 전송

// ===== LCD 제어 (라이브러리 미사용) =====
static uint8_t g_lcdAddr = 0x27;
static bool    g_lcdOk   = false;
#define LCD_BACKLIGHT 0x08
#define LCD_ENABLE    0x04
#define LCD_REG_SEL   0x01

void pcf8574Write(uint8_t data) {
    Wire.beginTransmission(g_lcdAddr);
    Wire.write(data | LCD_BACKLIGHT);
    Wire.endTransmission();
}

void lcdPulseEnable(uint8_t data) {
    pcf8574Write(data | LCD_ENABLE);
    delayMicroseconds(1);
    pcf8574Write(data & ~LCD_ENABLE);
    delayMicroseconds(50);
}

void lcdWrite4Bits(uint8_t value) {
    pcf8574Write(value);
    lcdPulseEnable(value);
}

void lcdSend(uint8_t value, uint8_t mode) {
    uint8_t high = value & 0xF0;
    uint8_t low  = (value << 4) & 0xF0;
    lcdWrite4Bits(high | mode);
    lcdWrite4Bits(low | mode);
}

void lcdCommand(uint8_t val) { lcdSend(val, 0); }
void lcdWriteChar(uint8_t val) { lcdSend(val, LCD_REG_SEL); }
void lcdClear() { lcdCommand(0x01); delay(2); }
void lcdSetCursor(uint8_t col, uint8_t row) {
    int offsets[] = {0x00, 0x40, 0x14, 0x54};
    lcdCommand(0x80 | (col + offsets[row]));
}
void lcdPrintStr(const char* s) { while (*s) lcdWriteChar(*s++); }

bool lcdInitDirect() {
    Wire.beginTransmission(g_lcdAddr);
    if (Wire.endTransmission() != 0) return false;
    delay(50);
    lcdWrite4Bits(0x03 << 4); delay(5);
    lcdWrite4Bits(0x03 << 4); delay(5);
    lcdWrite4Bits(0x03 << 4); delay(1);
    lcdWrite4Bits(0x02 << 4);
    lcdCommand(0x28); lcdCommand(0x0C); lcdCommand(0x06); lcdClear();
    lcdSetCursor(0, 0); lcdPrintStr("Smart Farm Start");
    g_lcdOk = true; return true;
}

// ===== 네트워크 연결 함수 =====
void connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    Serial.print("WiFi Connecting to: "); Serial.println(ssid);
    while (WiFi.begin(ssid, password) != WL_CONNECTED) {
        Serial.print("."); delay(1000);
    }
    Serial.println("\nWiFi Connected!");
}

void connectMQTT() {
    if (mqttClient.connected()) return;
    Serial.println("Connecting to HiveMQ...");
    mqttClient.setUsernamePassword(mqtt_user, mqtt_pass);
    if (!mqttClient.connect(mqtt_server, mqtt_port)) {
        Serial.print("MQTT Connection failed! Error: ");
        Serial.println(mqttClient.connectError());
        return;
    }
    Serial.println("MQTT Connected to HiveMQ Cloud!");
    mqttClient.subscribe(topic_sub);
}

void setup() {
    Serial.begin(115200);
    while (!Serial); 
    Serial.println("System Initializing...");

    Wire.begin();
    dht.begin();
    
    pinMode(FAN_PIN, OUTPUT);
    pinMode(PUMP_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);
    pinMode(HEATER_PIN, OUTPUT);
    
    // 초기 상태: ON
    fanState = true;
    pumpState = true;
    ledState = true;
    digitalWrite(FAN_PIN, RELAY_ON);
    digitalWrite(PUMP_PIN, RELAY_ON);
    digitalWrite(LED_PIN, RELAY_ON);
    digitalWrite(HEATER_PIN, RELAY_OFF);
    
    lastFanMs = lastPumpMs = lastLedMs = millis();

    lcdInitDirect();
    connectWiFi();
    connectMQTT();
}

void loop() {
    // 네트워크 상태 유지
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
    if (!mqttClient.connected()) connectMQTT();
    mqttClient.poll();

    unsigned long currentMs = millis();

    // 1. 팬 제어 (1분 가동 / 1분 정지)
    if (currentMs - lastFanMs >= TIME_1_MIN) {
        fanState = !fanState;
        digitalWrite(FAN_PIN, fanState ? RELAY_ON : RELAY_OFF);
        lastFanMs = currentMs;
        Serial.print("Fan Toggled: "); Serial.println(fanState ? "ON" : "OFF");
    }

    // 2. 펌프 제어 (5분 가동 / 30분 정지)
    if (pumpState && (currentMs - lastPumpMs >= TIME_5_MIN)) {
        pumpState = false;
        digitalWrite(PUMP_PIN, RELAY_OFF);
        lastPumpMs = currentMs;
        Serial.println("Pump Status: OFF");
    } else if (!pumpState && (currentMs - lastPumpMs >= TIME_30_MIN)) {
        pumpState = true;
        digitalWrite(PUMP_PIN, RELAY_ON);
        lastPumpMs = currentMs;
        Serial.println("Pump Status: ON");
    }

    // 3. LED 제어 (5분 가동 / 30분 정지)
    if (ledState && (currentMs - lastLedMs >= TIME_5_MIN)) {
        ledState = false;
        digitalWrite(LED_PIN, RELAY_OFF);
        lastLedMs = currentMs;
        Serial.println("LED Status: OFF");
    } else if (!ledState && (currentMs - lastLedMs >= TIME_30_MIN)) {
        ledState = true;
        digitalWrite(LED_PIN, RELAY_ON);
        lastLedMs = currentMs;
        Serial.println("LED Status: ON");
    }

    // 4. 온습도 처리 및 데이터 전송
    if (currentMs - s_lcdNextMs >= LCD_PERIOD_MS) {
        s_lcdNextMs = currentMs;

        float h = dht.readHumidity();
        float t = dht.readTemperature();

        // 시리얼 출력
        Serial.print("Temp: "); Serial.print(t);
        Serial.print("C, Humi: "); Serial.print(h); Serial.println("%");

        // MQTT 전송 (주기에 따라)
        if (currentMs - lastMqttMs >= MQTT_PERIOD_MS && !isnan(t)) {
            mqttClient.beginMessage(topic_pub);
            mqttClient.print("{\"temp\":"); mqttClient.print(t);
            mqttClient.print(",\"humi\":"); mqttClient.print(h);
            mqttClient.print(",\"fan\":"); mqttClient.print(fanState ? 1 : 0);
            mqttClient.print("}");
            mqttClient.endMessage();
            lastMqttMs = currentMs;
        }

        if (g_lcdOk) {
            lcdSetCursor(0, 1); 
            if (isnan(h) || isnan(t)) {
                lcdPrintStr("Sensor Error   ");
            } else {
                char buf[17];
                snprintf(buf, sizeof(buf), "T:%.1fC  H:%.1f%% ", t, h);
                lcdPrintStr(buf);
            }
        } else {
            lcdInitDirect();
        }
    }
}
