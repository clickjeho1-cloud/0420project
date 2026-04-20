import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 배포 후 환경 변수 주입 여부만 확인 (키 값은 노출하지 않음)
 */
export function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return NextResponse.json({
    ok: true,
    supabaseUrlConfigured: Boolean(url),
    supabaseAnonKeyConfigured: hasAnon,
  });
}
