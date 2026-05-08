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
    let nearbyIndices: number[] = [];
    
    if (Array.isArray(hourly.time) && currentTime) {
      // 정확한 매칭 시도
      currentIndex = hourly.time.findIndex((time: string) => time === currentTime);
      
      // 정확한 매칭이 실패하면 가장 가까운 시간 찾기
      if (currentIndex === -1 && hourly.time.length > 0) {
        const currentDate = currentTime.split('T')[0];
        const currentHour = parseInt(currentTime.split('T')[1]?.substring(0, 2) || '0');
        
        // 같은 날짜에서 가장 가까운 시간 찾기 (현재 시간 ±2시간 범위)
        for (let i = 0; i < hourly.time.length; i++) {
          const timeStr = hourly.time[i];
          if (timeStr.startsWith(currentDate)) {
            const hourStr = timeStr.split('T')[1]?.substring(0, 2);
            if (hourStr) {
              const hour = parseInt(hourStr);
              if (Math.abs(hour - currentHour) <= 2) {
                nearbyIndices.push(i);
              }
            }
          }
        }
        
        // 가장 가까운 시간 선택
        if (nearbyIndices.length > 0) {
          currentIndex = nearbyIndices[0];
        } else {
          // 여전히 못 찾으면 첫 번째 시간대 사용
          currentIndex = 0;
        }
      }
    }

    // 신뢰할 수 있는 습도 값 계산 (현재 시간 ±2시간 평균)
    let humidity = null;
    let humidityConfidence = 'low';
    
    if (currentIndex >= 0 && Array.isArray(hourly.relativehumidity_2m)) {
      if (nearbyIndices.length >= 3) {
        // 여러 시간대의 평균값 사용 (더 신뢰성 높음)
        const values = nearbyIndices
          .map(idx => hourly.relativehumidity_2m[idx])
          .filter(val => val !== null && val !== undefined);
        if (values.length > 0) {
          humidity = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
          humidityConfidence = 'high';
        }
      } else {
        // 단일 값 사용
        humidity = hourly.relativehumidity_2m[currentIndex];
        humidityConfidence = 'medium';
      }
    }
    // 신뢰할 수 있는 날씨 데이터 계산 함수
    const getReliableValue = (array: any[], indices: number[], fallbackIndex: number) => {
      if (!Array.isArray(array)) return null;
      
      if (indices.length >= 3) {
        // 여러 시간대의 평균값 사용
        const values = indices
          .map(idx => array[idx])
          .filter(val => val !== null && val !== undefined && !isNaN(val));
        return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100 : null;
      } else if (fallbackIndex >= 0) {
        // 단일 값 사용
        return array[fallbackIndex];
      }
      return null;
    };

    const uvIndex = getReliableValue(hourly.uv_index, nearbyIndices, currentIndex);
    const pm10 = getReliableValue(hourly.pm10, nearbyIndices, currentIndex);
    const pm2_5 = getReliableValue(hourly.pm2_5, nearbyIndices, currentIndex);
    const cloudCover = getReliableValue(hourly.cloudcover, nearbyIndices, currentIndex);

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
      // 신뢰성 정보 추가
      dataQuality: {
        humidity: humidityConfidence,
        uvIndex: nearbyIndices.length >= 3 ? 'high' : nearbyIndices.length >= 1 ? 'medium' : 'low',
        airQuality: nearbyIndices.length >= 3 ? 'high' : nearbyIndices.length >= 1 ? 'medium' : 'low',
        overall: nearbyIndices.length >= 3 ? 'high' : nearbyIndices.length >= 1 ? 'medium' : 'low'
      },
      lastUpdated: new Date().toISOString(),
      dataSource: 'Open-Meteo (무료 API)',
    });
  } catch (error) {
    console.error('날씨 API 오류:', error);
    return NextResponse.json(
      { error: '날씨 정보를 가져올 수 없습니다.' },
      { status: 500 }
    );
  }
}
