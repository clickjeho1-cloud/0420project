"use client";

/**
 * 전역 오류 UI — reset() 으로 복구 시도
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <h2 className="text-xl font-semibold text-white">오류가 발생했습니다</h2>
          <p className="mt-3 break-all text-sm text-slate-400">{error.message}</p>
          {error.digest ? (
            <p className="mt-2 text-xs text-slate-500">digest: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
