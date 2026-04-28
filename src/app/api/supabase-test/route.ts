import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.sensorReading.count();

    return NextResponse.json({
      ok: true,
      message: "Prisma DB 연결 성공",
      model: "SensorReading",
      count,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/supabase-test]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "Prisma DB 연결 실패",
        error: String((error as any)?.message || error),
      },
      { status: 500 }
    );
  }
}
