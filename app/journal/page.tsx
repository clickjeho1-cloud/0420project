'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (환경 변수 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 이미지 용량 압축 함수 (Request Entity Too Large 에러 방지)
const compressImage = async (file: File): Promise<File> => {
  let processFile = file;

  // HEIC/HEIF 파일인 경우 JPEG로 자동 변환
  if (processFile.name.toLowerCase().match(/\.(heic|heif)$/i) || processFile.type === 'image/heic') {
    try {
      const heic2any = (await import('heic2any')).default;
      const convertedBlob = await heic2any({ blob: processFile, toType: 'image/jpeg', quality: 0.8 });
      const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      processFile = new File([blob], processFile.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
    } catch (error) {
      console.error('HEIC 변환 실패:', error);
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(processFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 512; // 💡 허깅페이스 용량 초과 에러 방지를 위해 512px로 더욱 압축

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (blob) resolve(new File([blob], processFile.name, { type: 'image/jpeg' }));
          else resolve(processFile);
        }, 'image/jpeg', 0.6); // 💡 60% 품질로 압축 (용량 최소화)
      };
      img.onerror = () => resolve(processFile);
    };
    reader.onerror = () => resolve(processFile);
  });
};

// 사진의 밝기, 녹색 비율을 클라이언트에서 즉시 분석하는 함수
const analyzeImageLocally = (file: File): Promise<{ brightness: number; greenness: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve({ brightness: 0, greenness: 0 });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let totalBrightness = 0, totalGreenness = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
          totalBrightness += (r + g + b) / 3;
          const totalRGB = r + g + b;
          if (totalRGB > 0) totalGreenness += g / totalRGB;
        }

        resolve({
          brightness: Math.round((totalBrightness / pixelCount / 255) * 100),
          greenness: Math.round((totalGreenness / pixelCount) * 100),
        });
      };
      img.onerror = () => resolve({ brightness: 0, greenness: 0 });
    };
    reader.onerror = () => resolve({ brightness: 0, greenness: 0 });
  });
};

export default function JournalPage() {
  // AI 관련 상태
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [clientAnalysis, setClientAnalysis] = useState<{ brightness: number; greenness: number }[]>([]);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 오늘 날짜를 YYYY-MM-DD 형식으로 구하는 함수 (타임존 문제 방지)
  const getTodayDate = () => {
    const offset = new Date().getTimezoneOffset() * 60000;
    const dateOffset = new Date(Date.now() - offset);
    return dateOffset.toISOString().split('T')[0];
  };

  // 영농일지 폼 데이터 상태
  const [formData, setFormData] = useState({
    date: getTodayDate(),
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const limitedFiles = files.slice(0, 8); // 최대 8장으로 제한
      setSelectedImages(limitedFiles);
      setImagePreviews(limitedFiles.map(file => URL.createObjectURL(file)));

      // 로컬에서 즉시 밝기/녹색 분석 실행
      const localAnalyses = await Promise.all(limitedFiles.map(analyzeImageLocally));
      setClientAnalysis(localAnalyses);
      setAnalysisResult('');
      setErrorMessage('');
    } else {
      setSelectedImages([]);
      setImagePreviews([]);
      setClientAnalysis([]);
    }
  };

  const analyzeImage = async () => {
    if (selectedImages.length === 0) return;

    setIsAnalyzing(true);
    setAnalysisResult('');
    setErrorMessage('');

    try {
      const data = new FormData();

      // 💡 허깅페이스 서버 용량 초과(Payload Too Large) 에러를 막기 위해 분석에는 최대 2장만 전송
      const imagesForAI = selectedImages.slice(0, 2);
      const compressedFiles = await Promise.all(imagesForAI.map(img => compressImage(img)));
      compressedFiles.forEach(file => data.append('images', file));

      // 💡 AI가 분석 시 참고할 수 있도록 현재 폼에 입력된 수치 데이터를 함께 전송
      data.append('ec', formData.ecManagement);
      data.append('ph', formData.phSupply);
      data.append('water', formData.waterAmount);
      data.append('height', formData.height);

      const response = await fetch('/api/analyze-crop', {
        method: 'POST',
        body: data,
      });

      if (!response.ok) {
        // JSON 형태의 정상적인 오류 메시지인지 확인
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errData = await response.json();
          throw new Error(errData.error || '서버 통신 중 오류가 발생했습니다.');
        } else {
          throw new Error(`서버 응답 오류(${response.status}): 허깅페이스 서버 지연일 수 있습니다.`);
        }
      }

      const resultData = await response.json();
      setAnalysisResult(resultData.analysis);
      
      // 💡 AI 분석 완료 시 사용자가 버튼을 누르지 않아도 특이사항(notes)에 자동 입력되도록 추가
      setFormData(prev => {
        const baseNotes = prev.notes.includes('[AI 진단 리포트]') 
          ? prev.notes.split('[AI 진단 리포트]')[0].trim() 
          : prev.notes.trim();
          
        const newNotes = baseNotes 
          ? baseNotes + '\n\n[AI 진단 리포트]\n' + resultData.analysis 
          : '[AI 진단 리포트]\n' + resultData.analysis;
          
        return { ...prev, notes: newNotes };
      });
    } catch (error: any) {
      console.error('분석 오류:', error);
      setErrorMessage(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supabaseUrl || !supabaseAnonKey) {
      alert('Supabase 연결 정보가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
      return;
    }

    try {
      // 1. Supabase Storage 'journal-images' 버킷에 사진 업로드
      let uploadedUrls: string[] = [];
      if (selectedImages.length > 0) {
        alert('사진을 업로드하고 영농일지를 저장하는 중입니다. 잠시만 기다려주세요...');
        for (let i = 0; i < selectedImages.length; i++) {
          // 💡 원본 사진 용량이 커서 업로드(저장)에 실패하는 현상 방지를 위해 압축 후 전송
          const file = await compressImage(selectedImages[i]);
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${i}.${fileExt}`;

          // journal-images 버킷에 업로드
          const { data, error: uploadError } = await supabase.storage
            .from('journal-images')
            .upload(fileName, file, { upsert: true });

          if (uploadError) {
            console.error('이미지 업로드 에러:', uploadError);
            throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
          }

          // 업로드된 이미지의 공개 URL 가져오기
          const { data: publicUrlData } = supabase.storage
            .from('journal-images')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      // 2. Supabase 'journals' 테이블에 최종 데이터 삽입
      const { error } = await supabase
        .from('journals')
        .insert([
          {
            date: formData.date,
            height: formData.height ? parseFloat(formData.height) : null,
            leaf_size: formData.leafSize ? parseFloat(formData.leafSize) : null,
            water_amount: formData.waterAmount ? parseFloat(formData.waterAmount) : null,
            ec_management: formData.ecManagement ? parseFloat(formData.ecManagement) : null,
            ph_supply: formData.phSupply ? parseFloat(formData.phSupply) : null,
            drainage_rate: formData.drainageRate ? parseFloat(formData.drainageRate) : null,
            supply_time: formData.supplyTime,
            substrate_moisture: formData.substrateMoisture ? parseFloat(formData.substrateMoisture) : null,
            notes: formData.notes,
            photos: uploadedUrls.join(','), // 💡 업로드된 사진 URL들을 쉼표로 묶어서 저장
          }
        ]);

      if (error) throw error;

      alert('영농일지가 성공적으로 저장되었습니다!');
      
      // 저장 완료 후 다음 작성을 위해 폼과 사진 초기화
      setFormData({
        date: getTodayDate(),
        height: '', leafSize: '', waterAmount: '', ecManagement: '', phSupply: '',
        drainageRate: '', supplyTime: '', substrateMoisture: '', notes: ''
      });
      setSelectedImages([]);
      setImagePreviews([]);
      setClientAnalysis([]);
      setAnalysisResult('');
    } catch (error: any) {
      console.error('저장 오류:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  return (
    <div className="container">
      <div className="form-wrapper">
        <div className="header">
          <h1>📝 영농일지 작성</h1>
          <button type="button" className="btn-back" onClick={() => window.location.href = '/journal/list'}>
            목록으로 돌아가기
          </button>
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
              <input type="number" step="0.1" name="ecManagement" value={formData.ecManagement} onChange={handleInputChange} placeholder="예: 2.5" />
            </div>
            <div className="form-group">
              <label>pH 공급량</label>
              <input type="number" step="0.1" name="phSupply" value={formData.phSupply} onChange={handleInputChange} placeholder="예: 5.8" />
            </div>
            <div className="form-group">
              <label>배액률 (%)</label>
              <input type="number" step="0.1" name="drainageRate" value={formData.drainageRate} onChange={handleInputChange} placeholder="예: 20" />
            </div>
            <div className="form-group">
              <label>공급시간</label>
              <input type="text" name="supplyTime" value={formData.supplyTime} onChange={handleInputChange} placeholder="예: 08:00 ~ 18:00" />
            </div>
            <div className="form-group full">
              <label>배지 함수율 (%)</label>
              <input type="number" step="0.1" name="substrateMoisture" value={formData.substrateMoisture} onChange={handleInputChange} placeholder="예: 65" />
            </div>
            <div className="form-group full">
              <label>특이사항</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleInputChange} placeholder="오늘의 관찰 내용이나 특이사항을 기록하세요."></textarea>
            </div>
          </div>

          <div className="ai-section">
            <div className="ai-header">
              <h2 className="ai-title"><span>🌿</span> AI 지능형 작물 분석 (HuggingFace)</h2>
              <button type="button" className={`btn-ai ${isAnalyzing ? 'analyzing' : ''}`} onClick={analyzeImage} disabled={selectedImages.length === 0 || isAnalyzing}>
                {isAnalyzing ? '분석 중...' : 'AI 진단 실행'}
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '15px' }}>
              사진을 업로드하고 수치를 입력하면, 허깅페이스 오픈소스 AI가 작물을 정밀 분석해 줍니다.
            </p>
            
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ marginBottom: '15px' }} />

            {imagePreviews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '15px' }}>
                {imagePreviews.map((src, index) => (
                  <div key={index} style={{ position: 'relative', border: '1px solid #374151', borderRadius: '8px', padding: '5px', background: '#1a1d2d' }}>
                    <div style={{ position: 'absolute', top: '5px', left: '5px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>사진 {index + 1}</div>
                    <img src={src} alt={`업로드된 작물 ${index + 1}`} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px' }} />
                    {clientAnalysis[index] && (
                      <div style={{ fontSize: '12px', marginTop: '5px', color: '#9ca3af', padding: '5px 0' }}>
                        <div>💡 밝기: {clientAnalysis[index].brightness}%</div>
                        <div>🌿 녹색: {clientAnalysis[index].greenness}%</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {errorMessage && (
              <div className="error-box">
                🚨 {errorMessage}
              </div>
            )}

            {analysisResult ? (
              <div className="result-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: '#10b981' }}>📊 AI 종합 진단 리포트 <span style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'normal'}}>(특이사항 입력란에 자동 적용됨)</span></h4>
                </div>
                <div 
                  style={{ lineHeight: '1.6', color: '#d1d5db', background: '#11131e', padding: '15px', borderRadius: '8px', border: '1px solid #10b981' }}
                  dangerouslySetInnerHTML={{
                    __html: analysisResult
                      .replace(/### (.*)/g, '<h3 style="color: #34d399; margin-top: 15px; margin-bottom: 5px;">$1</h3>')
                      .replace(/## (.*)/g, '<h2 style="color: #10b981; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #374151; padding-bottom: 5px;">$1</h2>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; background: rgba(16, 185, 129, 0.2); padding: 0 4px; border-radius: 4px;">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem 0', margin: 0, border: '1px dashed #374151', borderRadius: '8px' }}>
                사진을 등록하고 "AI 진단 실행" 버튼을 누르면 오픈소스 AI 분석이 시작됩니다.
              </p>
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
          background-color: #f59e0b;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .btn-back:hover {
          background-color: #d97706;
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
          background-color: #1a1d2d;
          border: 1px solid #374151;
          border-top: 4px solid #10b981;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        }
        .ai-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .ai-title {
          font-size: 1.25rem;
          font-weight: bold;
          color: #f3f4f6;
          display: flex;
          align-items: center;
          margin: 0;
        }
        .ai-title span {
          margin-right: 0.5rem;
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
          padding: 0.5rem 1rem;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.2s;
        }
        .btn-ai:hover {
          background-color: #059669;
        }
        .btn-ai:disabled, .btn-ai.analyzing {
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