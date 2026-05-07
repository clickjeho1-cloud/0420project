import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let lat = searchParams.get('lat');
    let lon = searchParams.get('lon');

    if (!lat || !lon) {
      lat = '37.5665';
      lon = '126.9780';
    }

    const params = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current_weather: 'true',
      hourly: 'relativehumidity_2m,uv_index,pm10,pm2_5,cloudcover',
      daily: 'sunrise,sunset,uv_index_max',
      timezone: 'Asia/Seoul',
    });

    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      cache: 'no-store',
    });
    const data = await res.json();

    const current = data.current_weather;
    const hourly = data.hourly ?? {};
    const daily = data.daily ?? {};

    const currentTime = current?.time;
    
    // 현재 시간의 인덱스를 더 유연하게 찾기
    let currentIndex = -1;
    if (Array.isArray(hourly.time) && currentTime) {
      // 정확한 매칭 시도
      currentIndex = hourly.time.findIndex((time: string) => time === currentTime);
      
      // 정확한 매칭이 실패하면 가장 가까운 시간 찾기
      if (currentIndex === -1 && hourly.time.length > 0) {
        const currentDate = currentTime.split('T')[0];
        const currentHour = currentTime.split('T')[1]?.substring(0, 2);
        
        // 같은 날짜에서 가장 가까운 시간 찾기
        for (let i = 0; i < hourly.time.length; i++) {
          const timeStr = hourly.time[i];
          if (timeStr.startsWith(currentDate)) {
            if (currentHour && timeStr.includes(currentHour + ':')) {
              currentIndex = i;
              break;
            }
          }
        }
        
        // 여전히 못 찾으면 첫 번째 시간대 사용
        if (currentIndex === -1) {
          currentIndex = 0;
        }
      }
    }

    const humidity = currentIndex >= 0 && Array.isArray(hourly.relativehumidity_2m)
      ? hourly.relativehumidity_2m[currentIndex]
      : null;
    const uvIndex = currentIndex >= 0 && Array.isArray(hourly.uv_index)
      ? hourly.uv_index[currentIndex]
      : null;
    const pm10 = currentIndex >= 0 && Array.isArray(hourly.pm10)
      ? hourly.pm10[currentIndex]
      : null;
    const pm2_5 = currentIndex >= 0 && Array.isArray(hourly.pm2_5)
      ? hourly.pm2_5[currentIndex]
      : null;
    const cloudCover = currentIndex >= 0 && Array.isArray(hourly.cloudcover)
      ? hourly.cloudcover[currentIndex]
      : null;

    const todayDate = currentTime?.split('T')[0] ?? null;
    const todayIndex = todayDate && Array.isArray(daily.time)
      ? daily.time.findIndex((date: string) => date === todayDate)
      : -1;

    const sunrise = todayIndex >= 0 && Array.isArray(daily.sunrise)
      ? daily.sunrise[todayIndex]
      : daily.sunrise?.[0] ?? null;
    const sunset = todayIndex >= 0 && Array.isArray(daily.sunset)
      ? daily.sunset[todayIndex]
      : daily.sunset?.[0] ?? null;
    const uvIndexMax = todayIndex >= 0 && Array.isArray(daily.uv_index_max)
      ? daily.uv_index_max[todayIndex]
      : daily.uv_index_max?.[0] ?? null;

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
      85: '눈보라',
      86: '눈보라',
      95: '뇌우',
      96: '뇌우',
      99: '뇌우',
    };

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
      timestamp: current?.time,
      temperature: current?.temperature ?? null,
      humidity,
      weatherCode: current?.weathercode ?? null,
      weatherDescription: weatherDescriptions[current?.weathercode ?? 0] || '알 수 없음',
      windspeed: current?.windspeed ?? null,
      windDirection: current?.winddirection ?? null,
      cloudCover,
      isDay: current?.is_day ?? null,
      location: locationName,
      coordinates: { lat: parseFloat(lat), lon: parseFloat(lon) },
      uvIndex,
      uvIndexMax,
      pm10,
      pm2_5,
      sunrise,
      sunset,
    });
  } catch (error) {
    console.error('날씨 API 오류:', error);
    return NextResponse.json(
      { error: '날씨 정보를 가져올 수 없습니다.' },
      { status: 500 }
    );
  }
}
