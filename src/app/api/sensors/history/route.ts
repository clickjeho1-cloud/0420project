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

export async function GET() {
  try {
    const supabase = getSupabaseClient();

    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("id, created_at, temperature, humidity")
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
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
        error: String((error as any)?.message || error),
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
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .insert({
        temperature,
        humidity,
      })
      .select("id, created_at, temperature, humidity")
      .single();

    if (error) {
      throw error;
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
        error: String((error as any)?.message || error),
      },
      { status: 500 }
    );
  }
}
