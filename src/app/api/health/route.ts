import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      status: "healthy",
      database: "connected",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/health]", error);

    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        database: "disconnected",
        message: String((error as any)?.message || error),
      },
      { status: 500 }
    );
  }
}
