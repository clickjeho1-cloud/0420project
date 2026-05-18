import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token');

  // 로그인하지 않은 사용자가 보호된 페이지에 접근하면 로그인 페이지로 리다이렉트
  if (!authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// 💡 아래 경로들에 대해서만 미들웨어(보안 검사)를 작동시킵니다.
export const config = {
  matcher: ['/dashboard/:path*', '/journal/:path*'],
};