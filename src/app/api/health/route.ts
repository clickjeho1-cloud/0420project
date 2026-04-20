import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Vercel / 로드밸런서 헬스체크용 */
export function GET() {
  return NextResponse.json({
    ok: true,
    service: "0420project",
    ts: new Date().toISOString(),
  });
}
