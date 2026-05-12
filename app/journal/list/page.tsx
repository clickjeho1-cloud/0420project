"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type JournalImage = {
  id: string;
  public_url: string;
  file_name: string;
  crop_health: string;
  health_description: string;
};

type Journal = {
  id: string;
  date: string;
  height: string;
  leafSize: string;
  waterAmount: string;
  notes: string;
  photos?: string; // 💡 새로 저장된 쉼표 형태의 사진 URL 문자열
  journal_images?: JournalImage[]; // 기존 방식 호환을 위해 옵셔널 처리
};

export default function JournalList() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJournals() {
      try {
        // 💡 Next.js 캐싱을 무시하고 항상 최신 데이터를 DB에서 가져오도록 옵션 추가
        const res = await fetch('/api/journal', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setJournals(data.data);
        } else {
          setError(data.error || '데이터를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError('서버와 통신 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchJournals();
  }, []);

  return (
    <div style={{ padding: '2rem', color: 'white', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0 }}>📖 영농일지 목록</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/journal" style={{ padding: '10px 20px', background: '#10b981', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            새 일지 작성
          </Link>
          <Link href="/dashboard" style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8' }}>데이터를 불러오는 중입니다...</p>
      ) : error ? (
        <p style={{ color: '#ef4444', textAlign: 'center' }}>오류: {error}</p>
      ) : journals.length === 0 ? (
        <p style={{ color: '#94a3b8', textAlign: 'center' }}>아직 작성된 영농일지가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {journals.map((journal) => (
            <div key={journal.id} style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, color: '#38bdf8' }}>📅 {new Date(journal.date).toLocaleDateString('ko-KR')}</h3>
              </div>
              
              <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', whiteSpace: 'pre-wrap', marginBottom: '15px', lineHeight: '1.6' }}>
                {journal.notes || '특기사항 없음'}
              </div>

            {(journal.photos || (journal.journal_images && journal.journal_images.length > 0)) && (
                <div>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '10px' }}>첨부된 사진:</strong>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {/* 새 방식: photos 문자열에서 쉼표로 분리하여 렌더링 */}
                  {journal.photos && journal.photos.split(',').filter(url => url.trim() !== '').map((url, idx) => (
                    <img key={`photo-${idx}`} src={url.trim()} alt={`첨부 사진 ${idx + 1}`} onClick={() => setSelectedImage(url.trim())} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }} title="클릭하여 확대보기" />
                  ))}
                  {/* 구 방식 호환: 예전 데이터가 있을 경우 렌더링 */}
                  {(!journal.photos && journal.journal_images) && journal.journal_images.map((img) => (
                      <img key={img.id} src={img.public_url} alt={img.file_name} onClick={() => setSelectedImage(img.public_url)} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }} title="클릭하여 확대보기" />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 이미지 확대 팝업(모달) */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'zoom-out'
          }}
        >
          <img
            src={selectedImage}
            alt="확대된 사진"
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
          />
        </div>
      )}
    </div>
  );
}