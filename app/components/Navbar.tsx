'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: '대시보드', path: '/dashboard' },
    { name: '일지 작성', path: '/journal' },
    { name: '일지 목록', path: '/journal/list' },
  ];

  return (
    <nav className="navbar">
      <div className="logo">
        <Link href="/dashboard">🌱 Glover Smart Farm</Link>
      </div>
      <div className="menu">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: #0b1220;
          border-bottom: 2px solid #1f2937;
        }
        .logo a {
          color: #10b981;
          font-size: 1.5rem;
          font-weight: bold;
          text-decoration: none;
        }
        .menu {
          display: flex;
          gap: 1rem;
          justify-content: flex-end; /* 메뉴를 오른쪽으로 정렬 */
        }
        .menu-item {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: bold;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          transition: all 0.2s ease-in-out;
        }
        .menu-item:hover {
          background-color: #1e293b;
          color: white;
        }
        /* ✨ 누른 곳(현재 페이지) 노란색 강조 효과 ✨ */
        .menu-item.active {
          color: #facc15;
          background-color: rgba(250, 204, 21, 0.15);
          border: 1px solid #facc15;
          box-shadow: 0 0 10px rgba(250, 204, 21, 0.2);
        }
      `}</style>
    </nav>
  );
}