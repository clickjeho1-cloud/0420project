
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          스마트팜 웹 대시보드
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          HiveMQ 실시간 · Supabase 이력 · Vercel 배포
        </p>
      </header>
      <Dashboard />
    </main>
  );
}


