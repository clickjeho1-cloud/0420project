'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

// 🔧 저장 설정: bucket 이름을 여기서 쉽게 변경할 수 있습니다
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'journal-images';
const STORAGE_PATH_PREFIX = process.env.NEXT_PUBLIC_STORAGE_PATH || 'journal-images';

type ImageAnalysis = {
  name: string;
  width: number;
  height: number;
  sizeKB: number;
  avgBrightness: number;
  greenScore: number;
  cropHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  healthDescription: string;
};

type UploadedImage = {
  storage_path: string;
  public_url: string;
  file_name: string;
  width: number;
  height: number;
  size_kb: number;
  avg_brightness: number;
  green_score: number;
  crop_health: string;
  health_description: string;
};

export default function JournalWritePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    height: '',
    leafSize: '',
    waterAmount: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [analysisResults, setAnalysisResults] = useState<ImageAnalysis[]>([]);
  const [imageWarning, setImageWarning] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const analyzeImage = (file: File): Promise<ImageAnalysis> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const ratio = Math.min(200 / width, 200 / height, 1);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ 
            name: file.name, width, height, sizeKB: Math.round(file.size / 1024), 
            avgBrightness: 0, greenScore: 0, 
            cropHealth: 'unknown', 
            healthDescription: '분석 실패' 
          });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let totalBrightness = 0;
        let greenCount = 0;
        const totalPixels = canvas.width * canvas.height;
        for (let i = 0; i < imageData.data.length; i += 4) {
          const [r, g, b] = [imageData.data[i], imageData.data[i + 1], imageData.data[i + 2]];
          totalBrightness += (r + g + b) / 3;
          if (g > r && g > b && g > 80) greenCount += 1;
        }
        
        const avgBrightness = Math.round(totalBrightness / totalPixels);
        const greenScore = Math.round((greenCount / totalPixels) * 100);
        
        // 🌱 작물 건강도 판정: 녹색 점수와 밝기 기반
        let cropHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' = 'unknown';
        let healthDescription = '';
        
        if (greenScore >= 35 && avgBrightness >= 120) {
          cropHealth = 'excellent';
          healthDescription = '우수 - 매우 건강한 상태 🟢';
        } else if (greenScore >= 25 && avgBrightness >= 100) {
          cropHealth = 'good';
          healthDescription = '양호 - 건강한 상태 ✅';
        } else if (greenScore >= 15 && avgBrightness >= 80) {
          cropHealth = 'fair';
          healthDescription = '보통 - 관리 필요 ⚠️';
        } else if (greenScore >= 5) {
          cropHealth = 'poor';
          healthDescription = '부진 - 적극 관리 필요 ❌';
        } else {
          cropHealth = 'unknown';
          healthDescription = '분석 불가 - 식물이 보이지 않음';
        }
        
        resolve({
          name: file.name,
          width,
          height,
          sizeKB: Math.round(file.size / 1024),
          avgBrightness,
          greenScore,
          cropHealth,
          healthDescription,
        });
      };
      img.onerror = () => {
        resolve({ 
          name: file.name, width: 0, height: 0, sizeKB: Math.round(file.size / 1024), 
          avgBrightness: 0, greenScore: 0, 
          cropHealth: 'unknown', 
          healthDescription: '이미지 로드 실패' 
        });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 8) {
      setImageWarning('사진은 최대 8장까지 업로드할 수 있습니다.');
    } else {
      setImageWarning('');
    }
    const selected = files.slice(0, 8);
    
    // 🔄 HEIC (아이폰) 이미지를 일반 웹용(JPG)으로 자동 변환
    const processedFiles = await Promise.all(
      selected.map(async (file) => {
        if (file.name.toLowerCase().endsWith('.heic') || file.type === 'image/heic') {
          try {
            // @ts-ignore: heic2any 라이브러리는 TypeScript 타입 선언이 없으므로 빌드 에러 방지
            const heic2any = (await import('heic2any')).default;
            const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            return new File([blob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
          } catch (err) {
            console.error('HEIC 변환 실패:', err);
            return file;
          }
        }
        return file;
      })
    );

    setImages(processedFiles);

    // 🔄 각 이미지 분석 시작
    try {
      const analysis = await Promise.all(processedFiles.map((file) => analyzeImage(file)));
      setAnalysisResults(analysis);
    } catch (error) {
      console.error('❌ 이미지 분석 오류:', error);
    }
  };

  const uploadJournalImages = async (files: File[], analyses: ImageAnalysis[]) => {
    // ✅ Supabase 클라이언트 확인
    if (!supabase) {
      const setupGuide = `
🔴 Supabase 설정 오류

현재 .env.local에 Supabase 정보가 없거나 불완전합니다.

[해결 방법]
1. https://supabase.com 에서 프로젝트 대시보드 열기
2. Settings > API 메뉴
3. 다음 정보 복사:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
4. 프로젝트 루트의 .env.local 파일에 추가:
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx

5. 개발 서버 재시작`;
      throw new Error(setupGuide);
    }

    const uploaded: UploadedImage[] = [];

    // ✅ Storage Bucket 확인
    try {
      await Promise.all(
        files.map(async (file, index) => {
          const timestamp = Date.now();
          const path = `${STORAGE_PATH_PREFIX}/plant-${timestamp}-${index}-${file.name}`;
          
          // 📤 파일 업로드
          const { error: uploadError } = await supabase!.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, {
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error('❌ Supabase Storage 업로드 오류:', uploadError);
            
            if (uploadError.message.includes('Bucket not found')) {
              throw new Error(`
🔴 Storage 버킷 생성 필요

"${STORAGE_BUCKET}" 버킷이 Supabase에 없습니다.

[빠른 생성 방법]
1. https://app.supabase.com 접속
2. 프로젝트 선택
3. Storage 메뉴 → Buckets
4. "Create a new bucket" 클릭
5. 설정:
   - Name: ${STORAGE_BUCKET}
   - Public bucket: ✓ 체크
   - Create bucket
6. 다시 시도`);
            }
            
            throw new Error(`❌ 이미지 업로드 실패: ${uploadError.message}`);
          }

          // 🔗 공개 URL 생성
          const publicData = supabase!
            .storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(path);
          
          if (!publicData?.data?.publicUrl) {
            throw new Error(`❌ 공개 URL 생성 실패: ${path}`);
          }

          // 📊 분석 결과와 함께 저장
          const analysis = analyses[index] ?? {
            name: file.name,
            width: 0,
            height: 0,
            sizeKB: Math.round(file.size / 1024),
            avgBrightness: 0,
            greenScore: 0,
            cropHealth: 'unknown' as const,
            healthDescription: '분석 없음',
          };

          uploaded.push({
            storage_path: path,
            public_url: publicData.data.publicUrl,
            file_name: file.name,
            width: analysis.width,
            height: analysis.height,
            size_kb: analysis.sizeKB,
            avg_brightness: analysis.avgBrightness,
            green_score: analysis.greenScore,
            crop_health: analysis.cropHealth,
            health_description: analysis.healthDescription,
          });
        })
      );
    } catch (error: any) {
      throw error;
    }

    return uploaded;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      let imagesPayload: UploadedImage[] = [];
      if (images.length > 0) {
        imagesPayload = await uploadJournalImages(images, analysisResults);
      }

      const payload = {
        date: formData.date,
        height: formData.height ? parseFloat(formData.height) : null,
        leafSize: formData.leafSize ? parseFloat(formData.leafSize) : null,
        waterAmount: formData.waterAmount ? parseFloat(formData.waterAmount) : null,
        notes: formData.notes,
        images: imagesPayload,
      };
      console.log('📤 POST payload:', payload);

      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccessMessage('영농일지가 성공적으로 저장되었습니다. 목록으로 이동합니다.');
        router.push('/journal/list');
      } else {
        setErrorMessage(result?.error ?? '저장 중 오류가 발생했습니다. 서버 응답을 확인하세요.');
      }
    } catch (error: any) {
      console.error('저장 오류:', error);
      setErrorMessage(error?.message ?? '저장 중 오류가 발생했습니다. 네트워크 또는 서버를 확인하세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="write-container">
      <div className="header">
        <h1>📝 영농일지 작성</h1>
        <button onClick={() => router.push('/journal/list')} className="back-btn">
          목록으로 돌아가기
        </button>
      </div>

      {errorMessage ? <div className="alert error"><pre>{errorMessage}</pre></div> : null}
      {successMessage ? <div className="alert success">✅ {successMessage}</div> : null}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="date">일자</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="height">초장 (cm)</label>
          <input
            type="number"
            id="height"
            name="height"
            value={formData.height}
            onChange={handleChange}
            step="0.1"
            placeholder="예: 15.5"
          />
        </div>

        <div className="form-group">
          <label htmlFor="leafSize">엽면적 (cm²)</label>
          <input
            type="number"
            id="leafSize"
            name="leafSize"
            value={formData.leafSize}
            onChange={handleChange}
            step="0.1"
            placeholder="예: 25.3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="waterAmount">관수량 (L)</label>
          <input
            type="number"
            id="waterAmount"
            name="waterAmount"
            value={formData.waterAmount}
            onChange={handleChange}
            step="0.1"
            placeholder="예: 2.5"
          />
        </div>

        <div className="form-group">
          <label htmlFor="notes">특이사항</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="오늘의 관찰 내용이나 특이사항을 기록하세요."
          />
        </div>

        <div className="form-group">
          <label htmlFor="photos">사진 업로드 (최대 8장)</label>
          <input
            type="file"
            id="photos"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <p className="hint">📸 권장: 4:3 비율, 명확한 작물 이미지</p>
          <p className="hint">📁 저장: {STORAGE_BUCKET} 버킷 → {STORAGE_PATH_PREFIX}/timestamp-index-파일명</p>
          <p className="hint">💡 저장 위치를 변경하려면 환경변수 설정 필요</p>
          {imageWarning ? <div className="hint warning">{imageWarning}</div> : null}
        </div>

        {images.length > 0 ? (
          <div className="image-preview-grid">
            {images.map((file, index) => (
              <div key={file.name + index} className="image-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imagePreviews[index] && <img src={imagePreviews[index]} alt={`Preview of ${file.name}`} />}
                <div className="image-meta">
                  <strong>{file.name}</strong>
                  <div>📦 사이즈: {Math.round(file.size / 1024)}KB</div>
                  {analysisResults[index] ? (
                    <>
                      <div>📐 해상도: {analysisResults[index].width}x{analysisResults[index].height}</div>
                      <div>☀️ 밝기: {analysisResults[index].avgBrightness}%</div>
                      <div>🌱 녹색: {analysisResults[index].greenScore}%</div>
                      <div className={`health-status health-${analysisResults[index].cropHealth}`}>
                        {analysisResults[index].healthDescription}
                      </div>
                    </>
                  ) : (
                    <div className="analyzing">분석 중...</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? '저장 중...' : '저장하기'}
        </button>
      </form>

      <style jsx>{`
        .write-container { background: #05070f; color: white; min-height: 100vh; padding: 24px; font-size: 16px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; }
        h1 { margin: 0; font-size: 24px; }
        .back-btn { background: #374151; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .back-btn:hover { background: #4b5563; }

        .form { background: #0b1220; padding: 24px; border: 1px solid #1f2937; border-radius: 8px; max-width: 600px; margin: 0 auto; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: bold; color: #f8fafc; }
        input, textarea { width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; border-radius: 4px; color: white; font-size: 16px; }
        input:focus, textarea:focus { outline: none; border-color: #2563eb; }
        textarea { resize: vertical; }

        .submit-btn { background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; }
        .submit-btn:hover:not(:disabled) { background: #1d4ed8; }
        .submit-btn:disabled { background: #374151; cursor: not-allowed; }
        .alert { padding: 14px 16px; border-radius: 10px; margin: 0 auto 20px auto; font-weight: 600; max-width: 600px; }
        .alert.error { background: #7f1d1d; color: #fee2e2; border: 1px solid #991b1b; }
        .alert.success { background: #064e3b; color: #d1fae5; border: 1px solid #065f46; }
        .alert pre { 
          margin: 0; 
          white-space: pre-wrap; 
          word-wrap: break-word; 
          font-family: 'Courier New', monospace; 
          font-size: 13px; 
          line-height: 1.5; 
        }
        .hint { margin-top: 8px; color: #94a3b8; font-size: 14px; }
        .hint.warning { color: #fca5a5; }
        .image-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .image-card { background: #111827; border: 1px solid #334155; border-radius: 10px; overflow: hidden; }
        .image-card img { width: 100%; height: auto; display: block; }
        .image-meta { padding: 12px; color: #cbd5e1; font-size: 14px; }
        .image-meta > div { margin: 4px 0; }
        .health-status { 
          margin-top: 8px; 
          padding: 8px; 
          border-radius: 6px; 
          font-weight: bold; 
          text-align: center; 
        }
        .health-excellent { background: #10b981; color: #ecfdf5; }
        .health-good { background: #3b82f6; color: #eff6ff; }
        .health-fair { background: #f59e0b; color: #fffbeb; }
        .health-poor { background: #ef4444; color: #fef2f2; }
        .health-unknown { background: #6b7280; color: #f3f4f6; }
        .analyzing { color: #60a5fa; font-style: italic; }
        .image-meta strong { display: block; margin-bottom: 6px; color: #f8fafc; }
        .alert.success { background: #064e3b; color: #d1fae5; border: 1px solid #065f46; }
      `}</style>
    </div>
  );
}
