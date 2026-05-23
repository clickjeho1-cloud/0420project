"use client";
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    redirect('/dashboard');
  }, []);

  return null; // 리다이렉트가 발생하므로 렌더링할 내용은 없습니다.
}