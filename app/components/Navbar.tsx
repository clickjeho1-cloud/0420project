'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="logo">🌱 Glovera Smart Farm</div>
      <div className="links">
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
          대시보드
        </Link>
        <Link href="/journal" className={pathname === '/journal' ? 'active' : ''}>
          영농일지 작성
        </Link>
        <Link href="/journal/list" className={pathname === '/journal/list' ? 'active' : ''}>
          일지 목록
        </Link>
      </div>

      <style jsx>{`
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0b1220;
          padding: 16px 24px;
          border-bottom: 1px solid #1f2937;
          color: white;
        }
        .logo {
          font-size: 20px;
          font-weight: bold;
          color: #22c55e;
        }
        .links {
          display: flex;
          gap: 20px;
        }
        a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 16px;
          transition: all 0.2s;
        }
        a:hover, a.active {
          color: #f8fafc;
          font-weight: bold;
        }
      `}</style>
    </nav>
  );
}