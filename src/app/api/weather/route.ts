export async function GET() {
  const res = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=37.5&longitude=127&current_weather=true"
  );

  const data = await res.json();

  return new Response(JSON.stringify({
    temp: data.current_weather.temperature,
    wind: data.current_weather.windspeed
  }));
}
