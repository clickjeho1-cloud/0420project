import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 쿼리 파라미터에서 위도/경도 가져오기
    const { searchParams } = new URL(request.url);
    let lat = searchParams.get('lat');
    let lon = searchParams.get('lon');

    // 기본값: 서울 (역삼동 근처) 37.4979, 127.0276
    // 또는 서울 중심 37.5665, 126.9780
    if (!lat || !lon) {
      lat = '37.5665';
      lon = '126.9780';
    }

    // Open-Meteo 단기예보 API (습도, 강수량, 풍향 등 포함)
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day,cloud_cover&timezone=Asia/Seoul`,
      {
        cache: 'no-store',
      }
    );

    const data = await res.json();
    const current = data.current;

    // 날씨 코드를 한글로 변환
    const weatherDescriptions: { [key: number]: string } = {
      0: '맑음',
      1: '흐림',
      2: '흐림',
      3: '흐림',
      45: '안개',
      48: '안개',
      51: '이슬비',
      53: '이슬비',
      55: '이슬비',
      61: '소나기',
      63: '소나기',
      65: '소나기',
      71: '눈',
      73: '눈',
      75: '눈',
      80: '소나기',
      81: '소나기',
      82: '소나기',
      85: '소나기',
      86: '눈보라',
      95: '뇌우',
      96: '뇌우',
      99: '뇌우',
    };

    // 좌표에서 지역명 추측 (간단한 매핑)
    let locationName = '알 수 없음';
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (latNum > 37.4 && latNum < 37.7 && lonNum > 126.7 && lonNum < 127.2) {
      if (latNum > 37.49 && latNum < 37.51 && lonNum > 127.02 && lonNum < 127.04) {
        locationName = '역삼동';
      } else if (latNum < 37.57) {
        locationName = '강남';
      } else {
        locationName = '서울';
      }
    }

    return NextResponse.json({
      timestamp: current.time,
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      weatherCode: current.weather_code,
      weatherDescription: weatherDescriptions[current.weather_code] || '알 수 없음',
      windspeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      cloudCover: current.cloud_cover,
      isDay: current.is_day,
      location: locationName,
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
    });
  } catch (error) {
    console.error('날씨 API 오류:', error);
    return NextResponse.json(
      { error: '날씨 정보를 가져올 수 없습니다.' },
      { status: 500 }
    );
  }
}