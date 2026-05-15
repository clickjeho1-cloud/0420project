/*
========================================================
 Glovera Smart Farm
 ES32D26 MANUAL RS485 VERSION
========================================================

[현재 버전 기능]
- WiFi & MQTT TLS 통신
- DHT11 온습도 센서
- RS485 EC SENSOR (일반 MAX485 모듈 적용)
- 💡 RE, DE 핀 수동 제어 (ESP32의 5번 핀)
- 💡 송수신 타이밍 딜레이(안전장치) 적용
- 💡 가장 표준적인 농업용 센서 주소 (0x0015) 찌르기
- CRC 자동 계산 및 응답 데이터 필터링
========================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// =====================================================
// WIFI 설정
// =====================================================
const char* ssid     = "Farm_2.4G";
const char* password = "20240603";

// =====================================================
// MQTT TLS 설정
// =====================================================
const char* mqtt_server = "763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud";
const int mqtt_port = 8883;

const char* mqtt_user = "jhk001";
const char* mqtt_pass = "Sinwonpark1!";

const char* topic_pub = "smartfarm/jeho123/data";

// =====================================================
// DHT11 센서 핀 설정
// =====================================================
#define DHTPIN   4
#define DHTTYPE  DHT11

DHT dht(DHTPIN, DHTTYPE);

// =====================================================
// RS485 UART2 및 MAX485 제어 핀 설정
// =====================================================
HardwareSerial RS485Serial(2);

#define RX2 16
#define TX2 17
#define RS485_CONTROL_PIN 5  // RE, DE 핀이 묶여서 연결된 핀

// =====================================================
// MQTT 클라이언트 객체
// =====================================================
WiFiClientSecure espClient;
PubSubClient     client(espClient);

// =====================================================
// CRC 자동 계산 함수
// =====================================================
uint16_t calcCRC(uint8_t* buf, int len)
{
  uint16_t crc = 0xFFFF;
  for (int i = 0; i < len; i++)
  {
    crc ^= buf[i];
    for (int j = 0; j < 8; j++)
    {
      if (crc & 0x0001)
        crc = (crc >> 1) ^ 0xA001;
      else
        crc >>= 1;
    }
  }
  return crc;
}

// =====================================================
// MQTT 연결 (재시도) 함수
// =====================================================
void reconnect()
{
  while (!client.connected())
  {
    Serial.print("MQTT CONNECTING...");
    // 💡 연결 충돌(-2 에러) 방지: 기기마다 고유한 이름표(Random ID)를 달고 접속하게 합니다.
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass))
    {
      Serial.println("OK");
    }
    else
    {
      Serial.print("FAILED : ");
      Serial.println(client.state());
      delay(3000);
    }
  }
}

// =====================================================
// EC 데이터 읽기 함수 (수동 송수신 전환 포함)
// =====================================================
float readEC()
{
  // 1. 수신 버퍼 찌꺼기 비우기
  while (RS485Serial.available()) {
    RS485Serial.read();
  }

  // 2. MODBUS REQUEST 프레임 생성
  uint8_t frame[6] = {
    0x01,  // Device ID
    0x03,  // Function Code
    0x00, 0x15,  // EC 레지스터 주소
    0x00, 0x01   // 1개 읽기
  };

  uint16_t crc = calcCRC(frame, 6);
  uint8_t request[8];
  memcpy(request, frame, 6);
  request[6] = crc & 0xFF;
  request[7] = (crc >> 8) & 0xFF;

  // 3. 디버그: 송신할 데이터 시리얼 모니터에 출력
  Serial.print("EC REQUEST  : ");
  for (int i = 0; i < 8; i++) {
    Serial.print("0x");
    if (request[i] < 16) Serial.print("0");
    Serial.print(request[i], HEX);
    Serial.print(" ");
  }
  Serial.println();

  // 4. [핵심] MAX485 칩을 '송신(말하기)' 모드로 전환
  digitalWrite(RS485_CONTROL_PIN, HIGH);
  delay(5); // 안정적인 칩 전환 대기

  // 5. 데이터 쏘기
  RS485Serial.write(request, 8);
  RS485Serial.flush(); // 데이터가 선로를 타고 다 나갈 때까지 확실히 기다림

  // 6. [핵심] MAX485 칩을 즉시 '수신(듣기)' 모드로 전환
  delay(5); // 송신 끝자락 잘림 방지 딜레이
  digitalWrite(RS485_CONTROL_PIN, LOW);
  delay(5); // 안정적인 칩 전환 대기

  // 7. 센서 응답 듣기
  uint8_t response[64];
  int idx = 0;
  unsigned long startTime = millis();

  while (millis() - startTime < 500) {
    if (RS485Serial.available()) {
      response[idx++] = RS485Serial.read();
      if (idx >= 64) break;
    }
  }

  // 8. 디버그: 센서가 보낸(또는 노이즈) 데이터 시리얼 모니터에 출력
  Serial.print("EC RAW RESPONSE : ");
  for (int i = 0; i < idx; i++) {
    Serial.print("0x");
    if (response[i] < 16) Serial.print("0");
    Serial.print(response[i], HEX);
    Serial.print(" ");
  }
  Serial.println();

  // 9. 진짜 응답 프레임(01 03 02) 찾기
  int realDataStart = -1;
  for (int i = 0; i <= idx - 5; i++) {
    if (response[i] == 0x01 && response[i+1] == 0x03 && response[i+2] == 0x02) {
      realDataStart = i;
      break;
    }
  }

  // 10. EC 값 계산 및 반환
  if (realDataStart != -1) {
    int value = (response[realDataStart + 3] << 8) | response[realDataStart + 4];
    float ec  = value / 100.0;

    Serial.print("💡 찾았다! EC REAL VALUE : ");
    Serial.print(ec);
    Serial.println(" us/cm");

    return ec;
  } else {
    Serial.println("EC ERROR : NO VALID SENSOR RESPONSE FOUND");
    return -1;
  }
}

// =====================================================
// SETUP 함수
// =====================================================
void setup()
{
  // 컴퓨터와 통신 (시리얼 모니터용)
  Serial.begin(9600);
  delay(1000);
  Serial.println("\nBOOT OK");

  // MAX485 5번 핀 출력 설정 (기본값: 수신 모드 LOW)
  pinMode(RS485_CONTROL_PIN, OUTPUT);
  digitalWrite(RS485_CONTROL_PIN, LOW); 

  dht.begin();

  // RS485 통신 설정 (농업용 센서 기본 4800 적용)
  RS485Serial.begin(4800, SERIAL_8N1, RX2, TX2);

  Serial.println("WIFI CONNECTING...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWIFI CONNECTED");
  Serial.print("IP : ");
  Serial.println(WiFi.localIP());

  // MQTT TLS 연결을 위한 보안 설정
  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
}

// =====================================================
// LOOP 함수
// =====================================================
void loop()
{
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  static unsigned long lastTime = 0;
  if (millis() - lastTime > 2000) {
    lastTime = millis();

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("DHT ERROR");
      return;
    }

    float ecValue = readEC();

    // 💡 [핵심 수정] 대시보드와 완벽하게 일치하는 이름표(Key)로 데이터를 생성합니다.
    StaticJsonDocument<256> doc;
    doc["temp"]    = temp;
    doc["hum"]     = hum;
    doc["ec"]      = ecValue > 0 ? ecValue : 0; // 에러(-1)일 경우 0으로 표시
    
    // 아직 물리적 센서가 없는 값들은 대시보드에서 0이 아닌 임의의 값을 띄우도록 설정
    doc["ph"]      = 6.5; 
    doc["ppfd"]    = 500; 
    doc["nutTemp"] = 22.0;

    char buffer[256];
    serializeJson(doc, buffer);

    // MQTT로 데이터 전송
    bool ok = client.publish(topic_pub, buffer);

    if (ok) Serial.print("SEND OK : ");
    else    Serial.print("SEND FAIL : ");

    Serial.println(buffer);
  }
}
