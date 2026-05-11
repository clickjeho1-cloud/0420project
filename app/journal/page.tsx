'use client';

import React, { useState } from 'react';

export default function JournalPage() {
  // AI 관련 상태
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
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
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const limitedFiles = files.slice(0, 8); // 최대 8장으로 제한
      setSelectedImages(limitedFiles);
      setImagePreviews(limitedFiles.map(file => URL.createObjectURL(file)));
      setAnalysisResult('');
      setErrorMessage('');
    } else {
      setSelectedImages([]);
      setImagePreviews([]);
    }
  };

  const analyzeImage = async () => {
    if (selectedImages.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisResult('');
    setErrorMessage('');

    const data = new FormData();
    selectedImages.forEach(file => data.append('images', file));

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
    <div className="container">
      <div className="form-wrapper">
        <div className="header">
          <h1>📝 영농일지 작성</h1>
          <button type="button" className="btn-back">목록으로 돌아가기</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>일자</label>
              <input type="date" name="date" value={formData.date} onChange={handleInputChange} required />
            </div>
            <div className="form-group">
              <label>초장 (cm)</label>
              <input type="number" step="0.1" name="height" value={formData.height} onChange={handleInputChange} placeholder="예: 15.5" />
            </div>
            <div className="form-group">
              <label>엽면적 (cm²)</label>
              <input type="number" step="0.1" name="leafSize" value={formData.leafSize} onChange={handleInputChange} placeholder="예: 25.3" />
            </div>
            <div className="form-group">
              <label>관수량 (L)</label>
              <input type="number" step="0.1" name="waterAmount" value={formData.waterAmount} onChange={handleInputChange} placeholder="예: 2.5" />
            </div>
            <div className="form-group">
              <label>EC 관리 (mS/cm)</label>
              <input type="text" name="ecManagement" value={formData.ecManagement} onChange={handleInputChange} placeholder="예: 2.5" />
            </div>
            <div className="form-group">
              <label>pH 공급량</label>
              <input type="text" name="phSupply" value={formData.phSupply} onChange={handleInputChange} placeholder="예: 5.8" />
            </div>
            <div className="form-group">
              <label>배액률 (%)</label>
              <input type="text" name="drainageRate" value={formData.drainageRate} onChange={handleInputChange} placeholder="예: 20" />
            </div>
            <div className="form-group">
              <label>공급시간</label>
              <input type="text" name="supplyTime" value={formData.supplyTime} onChange={handleInputChange} placeholder="예: 08:00 ~ 18:00" />
            </div>
            <div className="form-group full">
              <label>배지 함수율 (%)</label>
              <input type="text" name="substrateMoisture" value={formData.substrateMoisture} onChange={handleInputChange} placeholder="예: 65" />
            </div>
            <div className="form-group full">
              <label>특이사항</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleInputChange} placeholder="오늘의 관찰 내용이나 특이사항을 기록하세요."></textarea>
            </div>
          </div>

          <div className="ai-section">
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#fff' }}>📸 사진 업로드 및 AI 분석</h3>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '15px' }}>
              사진을 업로드하면 AI가 작물의 생육 상태와 병해충을 정밀 분석해줍니다.
            </p>
            
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ marginBottom: '15px' }} />

            {imagePreviews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                {imagePreviews.map((src, index) => (
                  <img key={index} src={src} alt={`업로드된 작물 ${index + 1}`} style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                ))}
              </div>
            )}

            <button type="button" className="btn-ai" onClick={analyzeImage} disabled={selectedImages.length === 0 || isAnalyzing}>
              {isAnalyzing ? 'AI가 정밀 분석 중입니다...' : '업로드한 사진 AI로 진단하기'}
            </button>

            {errorMessage && (
              <div className="error-box">
                🚨 {errorMessage}
              </div>
            )}

            {analysisResult && (
              <div className="result-box">
                <h4 style={{ marginTop: 0, color: '#10b981' }}>📊 AI 종합 진단 리포트</h4>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#d1d5db' }}>
                  {analysisResult}
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit">
            영농일지 최종 저장하기
          </button>
        </form>
      </div>

      <style jsx>{`
        .container {
          display: flex;
          justify-content: center;
          padding: 2rem;
          color: #e5e7eb;
          font-family: sans-serif;
        }
        .form-wrapper {
          width: 100%;
          max-width: 900px;
          background-color: #11131e;
          padding: 2.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          border: 1px solid #1f2937;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #374151;
          padding-bottom: 1rem;
        }
        .header h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }
        .btn-back {
          background-color: #1f2937;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .btn-back:hover {
          background-color: #374151;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-group.full {
          grid-column: span 2;
        }
        label {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          color: #9ca3af;
        }
        input, textarea {
          background-color: #1a1d2d;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #fff;
          outline: none;
          font-family: inherit;
        }
        input:focus, textarea:focus {
          border-color: #10b981;
        }
        .ai-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: #151826;
          border: 1px solid #374151;
          border-radius: 0.75rem;
        }
        .btn-submit {
          width: 100%;
          padding: 1rem;
          margin-top: 2rem;
          background-color: #10b981;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1.125rem;
        }
        .btn-submit:hover {
          background-color: #059669;
        }
        .btn-ai {
          padding: 0.75rem 1.5rem;
          background-color: #2563eb;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-ai:disabled {
          background-color: #4b5563;
          cursor: not-allowed;
        }
        .error-box {
          margin-top: 1rem;
          padding: 1rem;
          background-color: rgba(127, 29, 29, 0.4);
          color: #fca5a5;
          border: 1px solid #991b1b;
          border-radius: 0.5rem;
        }
        .result-box {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background-color: #1a1d2d;
          border: 1px solid #374151;
          border-radius: 0.5rem;
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
          .form-group.full {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}