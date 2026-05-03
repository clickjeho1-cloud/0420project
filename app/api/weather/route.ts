import { NextResponse } from 'next/server';

export async function GET() {

  try {

    const res = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current_weather=true',
      {
        cache: 'no-store',
      }
    );

    const data = await res.json();

    return NextResponse.json({
      temperature:
        data.current_weather.temperature,

      windspeed:
        data.current_weather.windspeed,

      weathercode:
        data.current_weather.weathercode,
    });

  } catch {

    return NextResponse.json(
      {
        error:
          'weather api failed',
      },
      {
        status: 500,
      }
    );
  }
}