import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

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
    const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const rows = await prisma.sensorReading.findMany({
      where: {
        createdAt: {
          gte: since,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const data = rows.map((row) => ({
      id: row.id,
      created_at: row.createdAt,
      temperature: row.temperature,
      humidity: row.humidity,
    }));

    return NextResponse.json({
      ok: true,
      range: "2d",
      count: data.length,
      data,
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

    const row = await prisma.sensorReading.create({
      data: {
        temperature,
        humidity,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: row.id,
        created_at: row.createdAt,
        temperature: row.temperature,
        humidity: row.humidity,
      },
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
