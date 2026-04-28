import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_TABLE = "sensor_readings";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.");
  }

  return { url, anon };
}

export async function GET() {
  try {
    const { url, anon } = getSupabaseEnv();

    const supabase = createClient(url, anon);

    const { count, error } = await supabase
      .from(SUPABASE_TABLE)
      .select("*", {
        count: "exact",
        head: true,
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase 연결 성공",
      table: SUPABASE_TABLE,
      count: count ?? 0,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/supabase-test]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Supabase 연결 실패",
        error: String((error as any)?.message || error),
      },
      { status: 500 }
    );
  }
}
