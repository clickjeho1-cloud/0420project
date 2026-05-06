import { redirect } from 'next/navigation';

export default function Home() {
  // 사이트에 접속하면 자동으로 /dashboard 주소로 보냅니다.
  redirect('/dashboard');
}