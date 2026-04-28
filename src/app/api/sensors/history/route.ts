import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_TABLE = "sensor_readings";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.");
  }

  return createClient(url, anon);
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return n;
    }
  }

  return null;
}

function errorToMessage(error: unknown) {
  if (!error) return "알 수 없는 오류";

  if (typeof error === "object") {
    const e = error as any;

    return [
      e.message,
      e.details,
      e.hint,
      e.code ? `code=${e.code}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return String(error);
}

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    // 최근 2일간 데이터 조회
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, created_at, temperature, humidity")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "센서 이력 데이터를 불러오지 못했습니다.",
          error: errorToMessage(error),
          table: SUPABASE_TABLE,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      range: "2d",
      count: data?.length ?? 0,
      data: data ?? [],
    });
  } catch (error) {
    console.error("[GET /api/sensors/history]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "센서 이력 데이터를 불러오지 못했습니다.",
        error: errorToMessage(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();

    const temperature = toNumberOrNull(body.temperature);
    const humidity = toNumberOrNull(body.humidity);

    if (temperature === null || humidity === null) {
      return NextResponse.json(
        {
          ok: false,
          message: "temperature 또는 humidity 값이 올바르지 않습니다.",
          received: body,
        },
        { status: 400 }
      );
    }

    // 비정상값 방어: 공개 API이므로 너무 말 안 되는 값은 저장하지 않음
    if (temperature < -30 || temperature > 80) {
      return NextResponse.json(
        {
          ok: false,
          message: "temperature 값이 허용 범위를 벗어났습니다.",
          temperature,
        },
        { status: 400 }
      );
    }

    if (humidity < 0 || humidity > 100) {
      return NextResponse.json(
        {
          ok: false,
          message: "humidity 값이 허용 범위를 벗어났습니다.",
          humidity,
        },
        { status: 400 }
      );
    }

    const insertPayload = {
      temperature,
      humidity,
    };

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .insert(insertPayload)
      .select("id, created_at, temperature, humidity")
      .single();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          message: "센서 이력 데이터를 저장하지 못했습니다.",
          error: errorToMessage(error),
          table: SUPABASE_TABLE,
          insertPayload,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error("[POST /api/sensors/history]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "센서 이력 데이터를 저장하지 못했습니다.",
        error: errorToMessage(error),
      },
      { status: 500 }
    );
  }
}
