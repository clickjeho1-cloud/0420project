// lib/mqtt-client.js
import mqtt from 'mqtt';

const client = mqtt.connect('wss://763d603e502d4671a5c950470203ec7f.s1.eu.hivemq.cloud:8884/mqtt', {
  username: 'jhk001',
  password: 'Sinwonpark1!',
  rejectUnauthorized: false
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

client.on('connect', () => {
  console.log('✅ HiveMQ 연결');
  client.subscribe(['smartfarm/sensor/temp', 'smartfarm/sensor/humi']);
});

client.on('message', async (topic, message) => {
  const value = parseFloat(message.toString());
  console.log(`${topic}: ${value}`);
  
  // Supabase 저장
  const { error } = await supabase
    .from('sensor_readings')
    .insert({ 
      temperature: topic.includes('temp') ? value : null,
      humidity: topic.includes('humi') ? value : null,
      sensor_id: 'uno_r4'
    });
  
  if (error) console.error('DB 오류:', error);
});

export default client;
