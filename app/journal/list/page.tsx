"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

type JournalImage = {
  id: string;
  public_url: string;
  file_name: string;
};

type Journal = {
  id: string;
  date: string;
  height: string;
  leafSize: string;
  waterAmount: string;
  notes: string;
  photos?: any; 
  journal_images?: JournalImage[]; 
};

export default function JournalList() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch('/api/journal', { cache: 'no-store' });
        const data = await res.json();
        
        if (data.success) {
          // 💡 서버에서 온 데이터가 배열이 아닌 경우 앱이 터지는 것(map error) 방지
          const fetchedData = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
          setJournals(fetchedData);
          
          // 들어온 데이터 중 가장 최신 월(Month)을 기본 선택값으로 지정
          const availableMonths = Array.from(new Set(fetchedData.filter((j: any) => j && j.date).map((j: any) => j.date.substring(0, 7)))).sort().reverse();
          if (availableMonths.length > 0) {
            setSelectedMonth(availableMonths[0] as string);
          }
        } else {
          setError('데이터를 불러오는데 실패했습니다.');
        }
      } catch (err) {
        setError('서버와 통신 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchJournals();
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>데이터를 불러오는 중입니다...</div>;
  if (error) return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;

  // 월별 필터링 계산
  const availableMonths = Array.from(new Set(journals.filter(j => j && j.date).map(j => j.date.substring(0, 7)))).sort().reverse();
  const filteredJournals = journals.filter(j => j && j.date && j.date.startsWith(selectedMonth));

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
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

      {/* 월별 필터 탭 (버튼) UI */}
      {availableMonths.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
          {availableMonths.map(month => (
            <button
              key={month}
              onClick={() => setSelectedMonth(month as string)}
              style={{
                padding: '10px 20px',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 'bold',
                cursor: 'pointer',
                background: selectedMonth === month ? '#10b981' : '#e2e8f0',
                color: selectedMonth === month ? 'white' : '#475569',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {month}월
            </button>
          ))}
        </div>
      )}

      {filteredJournals.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem', background: '#f8fafc', borderRadius: '12px' }}>
          해당 월에 등록된 영농일지가 없습니다. 첫 일지를 작성해 보세요!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredJournals.map((journal, index) => {
            if (!journal) return null; // 💡 비어있는 데이터 행이 있을 경우 무시
            return (
            <div key={journal.id || `journal-${index}`} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '15px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#0f172a' }}>📅 {journal.date ? new Date(journal.date).toLocaleDateString() : '날짜 없음'}</span>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>ID: {journal.id ? String(journal.id).slice(0,8) : '알 수 없음'}</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><strong style={{ color: '#475569' }}>🌱 작물 키:</strong> {journal.height} cm</div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><strong style={{ color: '#475569' }}>🍃 잎 크기:</strong> {journal.leafSize} cm</div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}><strong style={{ color: '#475569' }}>💧 관수량:</strong> {journal.waterAmount} L</div>
              </div>

              <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px', marginBottom: '20px', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                <strong style={{ color: '#334155', display: 'block', marginBottom: '8px' }}>📝 추가 영농 정보 및 AI 분석 결과:</strong>
                {journal.notes || '특기사항 없음'}
              </div>

            {(() => {
              let urls: string[] = [];
              if (Array.isArray(journal.photos)) {
                urls = journal.photos;
              } else if (typeof journal.photos === 'string') {
                if (journal.photos.trim().startsWith('[')) {
                  try { const parsed = JSON.parse(journal.photos); urls = Array.isArray(parsed) ? parsed : [journal.photos]; } catch(e) { urls = [journal.photos]; }
                } else {
                  urls = journal.photos.split(',').filter((url: string) => url.trim() !== '');
                }
              }
              
              if (!Array.isArray(urls)) urls = []; // 💡 urls가 확실히 배열인지 한 번 더 보장
              urls = urls.filter(url => typeof url === 'string' && url.trim() !== ''); // 💡 url이 문자열이 아닐 경우 trim() 에러 방지
              
              // 💡 기존 사진(journal_images)이 배열이 아닌 객체로 넘어와서 에러가 났던 현상 방지 및 사진 복구
              const legacyImages = Array.isArray(journal.journal_images) ? journal.journal_images : (journal.journal_images ? [journal.journal_images] : []);
              if (urls.length === 0 && legacyImages.length === 0) return null;

              return (
                <div>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '10px' }}>첨부된 사진:</strong>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {urls.map((url, idx) => (
                      <img key={`photo-${idx}`} src={url.trim()} alt={`첨부 사진 ${idx + 1}`} onClick={() => setSelectedImage(url.trim())} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }} title="클릭하여 확대보기" />
                    ))}
                    {legacyImages.map((img) => (
                      img?.public_url && <img key={img.id || img.public_url} src={img.public_url} alt={img.file_name || '사진'} onClick={() => setSelectedImage(img.public_url)} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }} title="클릭하여 확대보기" />
                    ))}
                  </div>
                </div>
              );
            })()}
            </div>
          );})}
        </div>
      )}

      {selectedImage && (
        <div onClick={() => setSelectedImage(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, cursor: 'zoom-out' }}>
          <img src={selectedImage} alt="확대된 사진" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8)' }} />
        </div>
      )}
    </div>
  );
}
