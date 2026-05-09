const fs = require('fs');
const dotenv = require('dotenv');

// 1. 환경 변수 파일 로드 (.env.local 우선)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
  console.log('✅ .env.local 파일을 로드했습니다.');
} else {
  dotenv.config();
  console.log('✅ 기본 .env 파일을 로드했습니다.');
}

const mqtt = require('mqtt');
const { createClient } = require('@supabase/supabase-js');

// 2. 환경변수에서 연결 정보 불러오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

// 🚨 디버깅: 불러온 환경변수 값 확인 (비밀번호/키는 보안상 출력하지 않음)
console.log("🔗 연결할 Supabase URL:", supabaseUrl);
console.log("☁️ 연결할 HiveMQ 호스트:", process.env.HIVEMQ_HOST);

// 안전장치: 호스트 주소가 없으면 로컬(127.0.0.1)로 잘못 연결되는 것을 방지
if (!process.env.HIVEMQ_HOST) {
  console.error("❌ 에러: HIVEMQ_HOST 환경 변수가 비어있습니다. .env.local 파일 설정 및 저장 여부를 다시 확인해 주세요.");
  process.exit(1); 
}

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 에러: Supabase 환경 변수(URL 또는 KEY)가 누락되었습니다.");
  process.exit(1);
}

// 3. 클라이언트 초기화
const supabase = createClient(supabaseUrl, supabaseKey);

const hivemqOptions = {
  host: process.env.HIVEMQ_HOST,
  port: 8883,
  protocol: 'mqtts',
  username: process.env.HIVEMQ_USERNAME,
  password: process.env.HIVEMQ_PASSWORD,
  clientId: `smartfarm-server-${Math.random().toString(16).slice(2, 10)}`,
};

// 4. MQTT 연결
const client = mqtt.connect(hivemqOptions);

client.on('connect', () => {
  console.log('✅ HiveMQ 클라우드에 성공적으로 연결되었습니다.');
  
  // 대시보드 및 아두이노와 동일한 토픽으로 변경
  const topic = 'smartfarm/jeho123/data';
  client.subscribe(topic, (err) => {
    if (!err) {
      console.log(`📡 토픽 구독 중: ${topic}`);
    } else {
      console.error('❌ 구독 실패:', err);
    }
  });
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    console.log(`\n📥 [${topic}] 수신된 데이터:`, payload);

    // Supabase DB 저장 로직
    const { data, error } = await supabase
      .from('sensor_data')
      .insert([
        {
          device_id: payload.device_id || 'smartfarm-zone-1',
          // 아두이노가 보내는 짧은 변수명(temp, hum 등)도 함께 인식하도록 수정
          temperature: payload.temperature || payload.temp,
          humidity: payload.humidity || payload.hum,
          ec_value: payload.ec_value || payload.ec,
          light_intensity: payload.light_intensity || payload.ppfd,
          red_purple_ratio: payload.red_purple_ratio,
          moisture_status: payload.moisture_status,
          pest_disease_severity: payload.pest_disease_severity,
          leaf_wilting: payload.leaf_wilting
        }
      ]);

    if (error) {
      console.error('❌ Supabase 저장 에러:', error.message);
    } else {
      console.log('💾 Supabase에 데이터가 성공적으로 저장되었습니다.');
    }
  } catch (parseError) {
    console.error('❌ 데이터 파싱 에러 (JSON 형식이 아닐 수 있습니다):', parseError);
  }
});

client.on('error', (err) => {
  console.error('⚠️ MQTT 연결 에러:', err);
});
