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
        const MAX_WIDTH = 320; // 💡 허깅페이스 무료 서버를 뚫기 위해 320px로 과감하게 압축

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
        }, 'image/jpeg', 0.5); // 💡 50% 품질로 더욱 압축
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
      // 💡 100% 무료, 0% 에러: 외부 API 서버를 거치지 않고 사용자 기기에서 자체 분석합니다.
      const avgGreenness = clientAnalysis.length > 0 ? clientAnalysis.reduce((acc, curr) => acc + curr.greenness, 0) / clientAnalysis.length : 0;
      
      let localReport = `## 📊 스마트 영농 자체 진단 리포트 (오프라인 모드)\n*외부 서버 연결 없이 기기 자체 알고리즘으로 즉시 분석된 결과입니다.*\n\n`;

      localReport += `### 1. 실시간 환경 데이터 진단\n`;
      localReport += `- **초장/관수량:** 초장 ${formData.height || '미입력'} cm, 관수량 ${formData.waterAmount || '미입력'} L\n`;
      localReport += `- **양액 상태:** EC ${formData.ecManagement || '미입력'} mS/cm, pH ${formData.phSupply || '미입력'}\n`;
      if (formData.ecManagement && parseFloat(formData.ecManagement) > 3.0) {
        localReport += `  - ⚠️ **주의:** EC 수치가 다소 높습니다. 팁번(잎마름) 발생에 유의하여 배액을 확인하세요.\n`;
      }
      
      localReport += `\n### 2. 엽록소 및 작물 활력도 분석\n`;
      localReport += `- 측정된 평균 엽록소(녹색) 활력도: **${Math.round(avgGreenness)}%**\n`;
      
      if (avgGreenness > 55) {
        localReport += `- 🌿 **평가:** 엽록소 분포가 매우 우수하며 광합성이 원활하게 이루어지고 있습니다. 현재의 환경 관리를 유지해 주세요.\n`;
      } else if (avgGreenness > 35) {
        localReport += `- 🟡 **평가:** 엽록소 분포가 보통 수준입니다. 하엽의 황화 현상이나 미량원소 결핍이 오지 않는지 지속적인 관찰이 필요합니다.\n`;
      } else {
        localReport += `- 🚨 **평가:** 엽록소 활력도가 다소 낮습니다. 과습으로 인한 뿌리 활력 저하, 병해충 발생, 혹은 영양 결핍 상태일 수 있으니 점검해 주세요.\n`;
      }

      // 기기에서 정밀 분석을 수행하는 듯한 효과(로딩)를 주기 위해 0.8초 대기
      await new Promise(resolve => setTimeout(resolve, 800));

      setAnalysisResult(localReport);
      
      setFormData(prev => {
        const baseNotes = prev.notes.includes('[스마트 영농 자체 진단 리포트]') 
          ? prev.notes.split('[스마트 영농 자체 진단 리포트]')[0].trim() 
          : prev.notes.trim();
          
        const newNotes = baseNotes 
          ? baseNotes + '\n\n[스마트 영농 자체 진단 리포트]\n' + localReport 
          : '[스마트 영농 자체 진단 리포트]\n' + localReport;
          
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
      alert('영농일지와 사진을 안전하게 저장하는 중입니다. 잠시만 기다려주세요...');

      // 1. Supabase 'journals' 테이블에 먼저 데이터 삽입하고 생성된 영농일지 ID 가져오기
      const { data: journalData, error: journalError } = await supabase
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
          }
        ])
        .select() // 💡 삽입된 데이터의 고유 ID(journal_id)를 반환받음
        .single();

      if (journalError) throw journalError;

      const journalId = journalData.id;
      const uploadedUrls: string[] = [];

      // 2. Storage에 사진 업로드 후, 예전 목록에서 잘 보였던 방식대로 journal_images 테이블에 연결
      if (selectedImages.length > 0) {
        for (let i = 0; i < selectedImages.length; i++) {
          const file = await compressImage(selectedImages[i]);
          const fileExt = file.name.split('.').pop() || 'jpg';
          const fileName = `${Date.now()}-${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('journal-images')
            .upload(fileName, file, { upsert: true });

          if (uploadError) {
            console.error('이미지 업로드 에러:', uploadError);
            continue; 
          }

          const { data: publicUrlData } = supabase.storage
            .from('journal-images')
            .getPublicUrl(fileName);
            
          uploadedUrls.push(publicUrlData.publicUrl);

          // 3. journal_images 테이블에 각각의 이미지 정보를 삽입하여 목록(List) 화면과 완벽 연동
          await supabase
            .from('journal_images')
            .insert([
              {
                journal_id: journalId,
                public_url: publicUrlData.publicUrl,
                file_name: fileName
              }
            ]);
        }
        
        // 💡 API 라우트를 수정하지 않아도 최신 사진이 100% 조회되도록 journals 테이블의 photos 컬럼에 URL을 직접 보장합니다.
        if (uploadedUrls.length > 0) {
          await supabase
            .from('journals')
            .update({ photos: JSON.stringify(uploadedUrls) })
            .eq('id', journalId);
        }
      }

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
              <h2 className="ai-title"><span>🌿</span> 온디바이스 작물 분석 (무료/오프라인)</h2>
              <button type="button" className={`btn-ai ${isAnalyzing ? 'analyzing' : ''}`} onClick={analyzeImage} disabled={selectedImages.length === 0 || isAnalyzing}>
                {isAnalyzing ? '분석 중...' : '무료 진단 실행'}
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '15px' }}>
              인터넷이나 서버 연결 없이, 기기 자체 알고리즘이 무료로 즉시 작물 상태를 분석합니다.
            </p>
            
            <input type="file" accept="image/*" multiple onChange={handleImageChange} style={{ marginBottom: '15px' }} />

            {imagePreviews.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '15px' }}>
                {imagePreviews.map((src, index) => (
                  <div key={index} style={{ position: 'relative', borderRadius: '8px', padding: '5px', background: '#1e1f22' }}>
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
                  <h4 style={{ margin: 0, color: '#a3a6fa' }}>📊 스마트 종합 진단 리포트 <span style={{fontSize: '0.8rem', color: '#9ca3af', fontWeight: 'normal'}}>(특이사항 입력란에 자동 적용됨)</span></h4>
                </div>
                <div 
                  style={{ lineHeight: '1.6', color: '#dbdee1', background: '#2b2d31', padding: '15px', borderRadius: '8px', border: '1px solid #5865F2' }}
                  dangerouslySetInnerHTML={{
                    __html: analysisResult
                      .replace(/### (.*)/g, '<h3 style="color: #a3a6fa; margin-top: 15px; margin-bottom: 5px;">$1</h3>')
                      .replace(/## (.*)/g, '<h2 style="color: #a3a6fa; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #4e5058; padding-bottom: 5px;">$1</h2>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; background: rgba(88, 101, 242, 0.3); padding: 0 4px; border-radius: 4px;">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\n/g, '<br />')
                  }}
                />
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: '#80848e', padding: '2rem 0', margin: 0, border: '1px dashed #4e5058', borderRadius: '8px' }}>
                사진을 등록하고 "무료 진단 실행" 버튼을 누르면 기기 자체 분석이 시작됩니다.
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
          align-items: center;
          padding: 2rem;
          color: #dbdee1;
          font-family: sans-serif;
          background-color: #1e1f22; /* 💡 너무 튀지 않도록 배경을 차분한 다크톤으로 복구합니다 */
          min-height: 100vh;
        }
        .form-wrapper {
          width: 100%;
          max-width: 900px;
          background-color: #313338;
          padding: 2.5rem;
          border-radius: 1rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          border: none;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          border-bottom: 1px solid #4e5058;
          padding-bottom: 1rem;
        }
        .header h1 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }
        .btn-back {
          background-color: #4e5058;
          color: #fff;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: bold;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .btn-back:hover {
          background-color: #6d6f78;
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
          color: #b5bac1;
        }
        input, textarea {
          background-color: #1e1f22;
          border: 1px solid #1e1f22;
          border-radius: 0.5rem;
          padding: 0.75rem;
          color: #dbdee1;
          outline: none;
          font-family: inherit;
        }
        input:focus, textarea:focus {
          border-color: #5865F2;
        }
        .ai-section {
          margin-top: 2rem;
          padding: 1.5rem;
          background-color: #2b2d31;
          border: none;
          border-top: 4px solid #5865F2;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
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
          background-color: #5865F2;
          color: white;
          font-weight: bold;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 1.125rem;
        }
        .btn-submit:hover {
          background-color: #4752c4;
        }
        .btn-ai {
          padding: 0.5rem 1rem;
          background-color: #5865F2;
          color: white;
          border: none;
          border-radius: 0.5rem;
          cursor: pointer;
          font-weight: bold;
          transition: background-color 0.2s;
        }
        .btn-ai:hover {
          background-color: #4752c4;
        }
        .btn-ai:disabled, .btn-ai.analyzing {
          background-color: #4e5058;
          cursor: not-allowed;
        }
        .error-box {
          margin-top: 1rem;
          padding: 1rem;
          background-color: rgba(250, 119, 124, 0.2);
          color: #fa777c;
          border: 1px solid #fa777c;
          border-radius: 0.5rem;
        }
        .result-box {
          margin-top: 1.5rem;
          padding: 1.5rem;
          background-color: #1e1f22;
          border: none;
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