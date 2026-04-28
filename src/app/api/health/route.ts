import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const rows = await prisma.sensorLog.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      ok: true,
      range: "2d",
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error("[GET /api/sensors/history]", error);

    return NextResponse.json(
      {
        ok: false,
        message: "센서 이력 데이터를 불러오지 못했습니다.",
      },
      { status: 500 }
    );
  }
}
