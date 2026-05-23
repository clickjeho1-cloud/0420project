"use client";
import { useState } from "react";
import ImageScanner from "@/components/ai/ImageScanner";

export default function DiagnosisPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleDiagnosis = async (image: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json();
      setResult(data);
      await saveToJournal(data, image);
    } catch (error) {
      console.error("진단 에러:", error);
      alert("AI 서버와의 통신 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const saveToJournal = async (data: any, image: string) => {
    console.log("영농일지 자동 저장 시도:", data.disease_name);
    // 실제 API 연동 시: await fetch("/api/journal", { method: "POST", body: JSON.stringify({ ...data, image }) });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">AI 병충해 실시간 진단</h1>
        <p className="text-gray-500 text-sm">스마트팜 내 식물을 비추고 아래 '분석' 버튼을 클릭하세요.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <ImageScanner onCapture={handleDiagnosis} />

        <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-md min-h-[350px] flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600"></div>
              <p className="text-green-600 font-semibold animate-pulse">식물 상태 정밀 분석 중...</p>
            </div>
          ) : result ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-bold text-green-700">{result.disease_name}</h2>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-bold">
                  신뢰도: {result.probability}%
                </span>
              </div>
              <div className="space-y-4 text-sm leading-relaxed">
                <div><p className="font-bold text-gray-700">📋 주요 증상</p><p className="text-gray-600 mt-1">{result.symptoms}</p></div>
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                  <p className="font-bold text-blue-800">🛠️ 방제 가이드</p><p className="text-blue-700 mt-1">{result.treatment}</p>
                </div>
              </div>
              <div className="pt-4 border-t text-[11px] text-gray-400 text-right">분석 시간: {new Date(result.timestamp).toLocaleString()}</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-gray-400 space-y-2">
              <span className="text-4xl">🌱</span><p>분석 결과가 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}