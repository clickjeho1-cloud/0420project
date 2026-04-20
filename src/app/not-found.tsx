import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-white">404</h1>
      <p className="mt-2 text-slate-400">페이지를 찾을 수 없습니다.</p>
      <Link href="/" className="mt-6 inline-block text-sky-400 underline hover:text-sky-300">
        홈으로
      </Link>
    </main>
  );
}
