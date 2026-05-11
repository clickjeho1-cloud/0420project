'use client';

import React, { useState } from 'react';

export default function JournalPage() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch('/api/analyze-crop', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '서버 통신 중 오류가 발생했습니다.');
      }

      setAnalysisResult(data.analysis);
    } catch (error: any) {
      console.error('분석 오류:', error);
      setErrorMessage(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🌱 스마트 영농일지 AI 분석</h1>
      
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700">작물 사진 업로드</label>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageChange} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100 transition-colors"
        />
      </div>

      {imagePreview && (
        <div className="mb-6">
          <img src={imagePreview} alt="업로드된 작물" className="max-w-md rounded-lg shadow-md border border-gray-200" />
        </div>
      )}

      <button 
        onClick={analyzeImage}
        disabled={!selectedImage || isAnalyzing}
        className={`px-6 py-2 rounded-lg text-white font-semibold transition-colors ${
          !selectedImage || isAnalyzing ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {isAnalyzing ? 'AI가 정밀 분석 중입니다...' : '사진 분석하기'}
      </button>

      {errorMessage && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          🚨 {errorMessage}
        </div>
      )}

      {analysisResult && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-green-800">📊 AI 종합 진단 리포트</h2>
          <div className="whitespace-pre-wrap leading-relaxed text-gray-800">
            {analysisResult}
          </div>
        </div>
      )}
    </div>
  );
}