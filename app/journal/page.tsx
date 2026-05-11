'use client';

import React, { useState } from 'react';

export default function JournalPage() {
  // AI 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 영농일지 폼 데이터 상태
  const [formData, setFormData] = useState({
    date: '2026-05-11',
    height: '',
    leafSize: '',
    waterAmount: '',
    ecManagement: '',
    phSupply: '',
    drainageRate: '',
    supplyTime: '',
    substrateMoisture: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0]; // 첫 번째 이미지를 AI 분석용으로 사용
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setAnalysisResult('');
      setErrorMessage('');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisResult('');
    setErrorMessage('');

    const data = new FormData();
    data.append('image', selectedImage);

    try {
      const response = await fetch('/api/analyze-crop', {
        method: 'POST',
        body: data,
      });

      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || '서버 통신 중 오류가 발생했습니다.');
      }

      setAnalysisResult(resultData.analysis);
    } catch (error: any) {
      console.error('분석 오류:', error);
      setErrorMessage(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('저장될 데이터:', formData);
    alert('영농일지가 저장되었습니다.');
    // 차후 여기에 DB 전송 로직 추가
  };

  return (
    // 화면 전체 너비를 차지하고 내부 요소를 중앙(flex justify-center)으로 강제 정렬합니다.
    <div className="min-h-screen w-full flex justify-center p-6 text-gray-200">
      <div className="w-full max-w-4xl bg-[#11131e] p-8 rounded-2xl shadow-2xl border border-gray-800">
        <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
          <h1 className="text-2xl font-bold">📝 영농일지 작성</h1>
          <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm rounded-lg transition-colors">
            목록으로 돌아가기
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 영농 폼 영역 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">일자</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">초장 (cm)</label>
              <input type="number" step="0.1" name="height" value={formData.height} onChange={handleInputChange} placeholder="예: 15.5" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">엽면적 (cm²)</label>
              <input type="number" step="0.1" name="leafSize" value={formData.leafSize} onChange={handleInputChange} placeholder="예: 25.3" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">관수량 (L)</label>
              <input type="number" step="0.1" name="waterAmount" value={formData.waterAmount} onChange={handleInputChange} placeholder="예: 2.5" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">EC 관리 (mS/cm)</label>
              <input type="text" name="ecManagement" value={formData.ecManagement} onChange={handleInputChange} placeholder="예: 2.5" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">pH 공급량</label>
              <input type="text" name="phSupply" value={formData.phSupply} onChange={handleInputChange} placeholder="예: 5.8" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">배액률 (%)</label>
              <input type="text" name="drainageRate" value={formData.drainageRate} onChange={handleInputChange} placeholder="예: 20" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">공급시간</label>
              <input type="text" name="supplyTime" value={formData.supplyTime} onChange={handleInputChange} placeholder="예: 08:00 ~ 18:00 (총 10회)" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">배지 함수율 (%)</label>
              <input type="text" name="substrateMoisture" value={formData.substrateMoisture} onChange={handleInputChange} placeholder="예: 65" className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">특이사항</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleInputChange} placeholder="오늘의 관찰 내용이나 특이사항을 기록하세요." className="w-full bg-[#1a1d2d] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-green-500"></textarea>
            </div>
          </div>

          {/* 사진 업로드 및 AI 분석 영역 */}
          <div className="border border-gray-700 rounded-xl p-6 bg-[#151826] mt-8">
            <label className="block text-lg font-medium text-white mb-2">📸 사진 업로드 및 AI 분석</label>
            <p className="text-sm text-gray-400 mb-4">사진을 업로드하면 AI가 작물의 생육 상태와 병해충을 정밀 분석해줍니다.</p>
            
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-500 transition-colors mb-4" />

            {imagePreview && (
              <div className="mb-4">
                <img src={imagePreview} alt="업로드된 작물" className="max-w-xs rounded-lg shadow-md border border-gray-600" />
              </div>
            )}

            <button type="button" onClick={analyzeImage} disabled={!selectedImage || isAnalyzing} className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors ${!selectedImage || isAnalyzing ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}>
              {isAnalyzing ? 'AI가 정밀 분석 중입니다...' : '업로드한 사진 AI로 진단하기'}
            </button>

            {errorMessage && (
              <div className="mt-4 p-4 bg-red-900/40 text-red-200 rounded-lg border border-red-800">
                🚨 {errorMessage}
              </div>
            )}

            {analysisResult && (
              <div className="mt-6 p-6 bg-[#1a1d2d] rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-green-400">📊 AI 종합 진단 리포트</h2>
                <div className="whitespace-pre-wrap leading-relaxed text-gray-300">
                  {analysisResult}
                </div>
              </div>
            )}
          </div>

          {/* 최종 제출 버튼 */}
          <div className="pt-6">
            <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg text-lg transition-colors shadow-lg">
              영농일지 최종 저장하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}