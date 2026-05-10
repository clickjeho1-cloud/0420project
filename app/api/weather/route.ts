import { NextRequest, NextResponse } from 'next/server';

// Next.js 캐싱 무효화 (항상 최신 날씨 가져오기)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const weatherDescriptions: Record<number, string> = {
  0: '맑음',
  1: '대체로 맑음',
  2: '부분적으로 흐림',
  3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비',
  61: '비', 63: '비', 65: '강한 비',
  71: '눈', 73: '눈', 75: '강한 눈',
  95: '뇌우',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let lat = searchParams.get('lat');
    let lon = searchParams.get('lon');

    // 기본 위치: 천호동
    if (!lat || !lon) {
      lat = '37.545';
      lon = '127.123';
    }

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current_weather: 'true',
      hourly: 'relativehumidity_2m,cloudcover',
      daily: 'sunrise,sunset',
      timezone: 'Asia/Seoul',
    });

    // 1. Open-Meteo API (기본 글로벌 날씨 데이터)
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const meteoRes = await fetch(meteoUrl, { cache: 'no-store' });
    const meteoData = await meteoRes.json();

    const current = meteoData.current_weather;
    const hourly = meteoData.hourly;
    const daily = meteoData.daily;
    
    let humidity = null;
    let cloudCover = null;

    if (hourly && hourly.time && current?.time) {
      const currentIndex = hourly.time.findIndex((t: string) => t === current.time);
      if (currentIndex !== -1) {
        humidity = hourly.relativehumidity_2m[currentIndex];
        cloudCover = hourly.cloudcover[currentIndex];
      }
    }

    let locationName = '알 수 없음';
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // 위치 판별 (천호동 중심)
    if (Math.abs(latNum - 37.545) < 0.02 && Math.abs(lonNum - 127.123) < 0.02) {
      locationName = '천호동';
    } else if (latNum > 37.49 && latNum < 37.51 && lonNum > 127.02 && lonNum < 127.04) {
      locationName = '역삼동';
    }

    // 2. 🇰🇷 기상청(KMA) 초단기실황 API 연동 (천호동 nx=62, ny=126)
    let kmaData: any = null;
    const kmaKey = process.env.KMA_API_KEY;
    
    if (kmaKey) {
      try {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const kst = new Date(utc + (9 * 60 * 60000));
        let year = kst.getFullYear();
        let month = String(kst.getMonth() + 1).padStart(2, '0');
        let day = String(kst.getDate()).padStart(2, '0');
        let hours = kst.getHours();
        let minutes = kst.getMinutes();

        if (minutes < 40) {
          hours -= 1;
          if (hours < 0) {
            hours = 23;
            kst.setDate(kst.getDate() - 1);
            year = kst.getFullYear();
            month = String(kst.getMonth() + 1).padStart(2, '0');
            day = String(kst.getDate()).padStart(2, '0');
          }
        }
        const base_date = `${year}${month}${day}`;
        const base_time = `${String(hours).padStart(2, '0')}00`;

        const nx = 62; const ny = 126; // 천호동 좌표
        const kmaUrl = `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${kmaKey}&pageNo=1&numOfRows=10&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;
        const kmaRes = await fetch(kmaUrl, { cache: 'no-store' });
        const kmaText = await kmaRes.text();
        
        try {
          const kmaJson = JSON.parse(kmaText);
        if (kmaJson?.response?.header?.resultCode === '00') {
          const items = kmaJson.response.body.items.item;
          kmaData = {};
          items.forEach((item: any) => {
            if (item.category === 'T1H') kmaData.temp = parseFloat(item.obsrValue);
            if (item.category === 'REH') kmaData.hum = parseFloat(item.obsrValue);
            if (item.category === 'WSD') kmaData.wsd = parseFloat(item.obsrValue);
            if (item.category === 'VEC') kmaData.vec = parseFloat(item.obsrValue);
            if (item.category === 'PTY') kmaData.pty = parseInt(item.obsrValue);
          });
        }
        } catch (parseErr) {
          console.warn('⚠️ 기상청 응답 파싱 실패 (API 키가 잘못되었을 확률이 매우 높습니다).');
        }
      } catch (e) {
        console.error('기상청 API 네트워크 오류:', e);
      }
    }

    // 3. 데이터 병합 (기상청 데이터 우선 적용)
    let finalTemp = current?.temperature ?? null;
    let finalHum = humidity;
    let finalWsd = current?.windspeed ?? null;
    let finalVec = current?.winddirection ?? null;
    let finalDesc = weatherDescriptions[current?.weathercode ?? 0] || '알 수 없음';
    let source = 'Open-Meteo (무료 API)';

    if (kmaData) {
      if (!isNaN(kmaData.temp)) finalTemp = kmaData.temp;
      if (!isNaN(kmaData.hum)) finalHum = kmaData.hum;
      if (!isNaN(kmaData.wsd)) finalWsd = kmaData.wsd;
      if (!isNaN(kmaData.vec)) finalVec = kmaData.vec;
      source = '기상청(KMA) 실황 & Open-Meteo';
      
      if (kmaData.pty === 1 || kmaData.pty === 5) finalDesc = '비';
      else if (kmaData.pty === 2 || kmaData.pty === 6) finalDesc = '비/눈';
      else if (kmaData.pty === 3 || kmaData.pty === 7) finalDesc = '눈';
    }

    return NextResponse.json({
      timestamp: current?.time,
      temperature: finalTemp,
      humidity: finalHum,
      weatherCode: current?.weathercode ?? null,
      weatherDescription: finalDesc,
      windspeed: finalWsd,
      windDirection: finalVec,
      cloudCover,
      isDay: current?.is_day ?? null,
      sunrise: daily?.sunrise?.[0] ?? null,
      sunset: daily?.sunset?.[0] ?? null,
      location: locationName,
      coordinates: { lat: latNum, lon: lonNum },
      dataQuality: { overall: kmaData ? 'high' : 'medium' },
      lastUpdated: new Date().toISOString(),
      dataSource: source,
    });
  } catch (error) {
    console.error('Weather API Error:', error);
    return NextResponse.json({ error: '날씨 정보를 가져오는데 실패했습니다.' }, { status: 500 });
  }
}
