'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type ImageAnalysis = {
  name: string;
  width: number;
  height: number;
  sizeKB: number;
  avgBrightness: number;
  greenScore: number;
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
          resolve({ name: file.name, width, height, sizeKB: Math.round(file.size / 1024), avgBrightness: 0, greenScore: 0 });
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
        resolve({
          name: file.name,
          width,
          height,
          sizeKB: Math.round(file.size / 1024),
          avgBrightness: Math.round(totalBrightness / totalPixels),
          greenScore: Math.round((greenCount / totalPixels) * 100),
        });
      };
      img.onerror = () => {
        resolve({ name: file.name, width: 0, height: 0, sizeKB: Math.round(file.size / 1024), avgBrightness: 0, greenScore: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 3) {
      setImageWarning('사진은 최대 3장까지 업로드할 수 있습니다.');
    } else {
      setImageWarning('');
    }
    const selected = files.slice(0, 3);
    setImages(selected);
    const analysis = await Promise.all(selected.map((file) => analyzeImage(file)));
    setAnalysisResults(analysis);
  };

  const uploadJournalImages = async (files: File[], analyses: ImageAnalysis[]) => {
    const client = supabase;
    if (!client) {
      throw new Error('🔴 Supabase가 설정되어 있지 않습니다. .env.local 파일을 확인하세요.');
    }

    const uploaded: UploadedImage[] = [];

    await Promise.all(
      files.map(async (file, index) => {
        const timestamp = Date.now();
        const path = `journal-images/${timestamp}-${index}-${file.name}`;
        const { error: uploadError } = await client.storage.from('journal-images').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          console.error('Supabase Storage 업로드 에러:', uploadError);
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('🔴 [중요] Supabase에서 "journal-images" 스토리지 버킷을 생성해야 합니다.\n1. Supabase 대시보시오드 열기\n2. Storage > Buckets 메뉴\n3. "New bucket" 클릭\n4. 이름: journal-images (정확히)\n5. Public 체크\n6. Create bucket');
          }
          throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
        }

        const publicData = client.storage.from('journal-images').getPublicUrl(path);
        if (!publicData || !publicData.data || !publicData.data.publicUrl) {
          throw new Error('공개 URL 생성 실패: Supabase 공개 URL을 가져올 수 없습니다.');
        }

        const analysis = analyses[index] ?? {
          name: file.name,
          width: 0,
          height: 0,
          sizeKB: Math.round(file.size / 1024),
          avgBrightness: 0,
          greenScore: 0,
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
        });
      })
    );

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

      {errorMessage ? <div className="alert error">⚠️ {errorMessage}</div> : null}
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
          <label htmlFor="photos">사진 업로드 (최대 3장)</label>
          <input
            type="file"
            id="photos"
            accept="image/*"
            multiple
            onChange={handleImageChange}
          />
          <p className="hint">4:3 비율 권장. 최대 3개까지 선택하세요.</p>
          <p className="hint">사진은 Supabase Storage의 버킷 `journal-images`에 저장됩니다.</p>
          <p className="hint">버킷 내 저장 경로는 `journal-images/{timestamp}-{index}-{파일명}`입니다.</p>
          {imageWarning ? <div className="hint warning">{imageWarning}</div> : null}
        </div>

        {images.length > 0 ? (
          <div className="image-preview-grid">
            {images.map((file, index) => (
              <div key={file.name + index} className="image-card">
                <img src={imagePreviews[index]} alt={file.name} />
                <div className="image-meta">
                  <strong>{file.name}</strong>
                  <div>사이즈: {Math.round(file.size / 1024)}KB</div>
                  {analysisResults[index] ? (
                    <>
                      <div>해상도: {analysisResults[index].width}x{analysisResults[index].height}</div>
                      <div>밝기: {analysisResults[index].avgBrightness}%</div>
                      <div>녹색성: {analysisResults[index].greenScore}%</div>
                    </>
                  ) : (
                    <div>분석 중...</div>
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
        .alert { padding: 14px 16px; border-radius: 10px; margin-bottom: 20px; font-weight: 600; }
        .alert.error { background: #7f1d1d; color: #fee2e2; border: 1px solid #991b1b; }
        .alert.success { background: #064e3b; color: #d1fae5; border: 1px solid #065f46; }
        .hint { margin-top: 8px; color: #94a3b8; font-size: 14px; }
        .hint.warning { color: #fca5a5; }
        .image-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .image-card { background: #111827; border: 1px solid #334155; border-radius: 10px; overflow: hidden; }
        .image-card img { width: 100%; height: auto; display: block; }
        .image-meta { padding: 12px; color: #cbd5e1; font-size: 14px; }
        .image-meta strong { display: block; margin-bottom: 6px; color: #f8fafc; }
        .alert.success { background: #064e3b; color: #d1fae5; border: 1px solid #065f46; }
      `}</style>
    </div>
  );
}
