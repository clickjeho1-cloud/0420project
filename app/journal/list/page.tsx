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
  journal_images: JournalImage[];
};

export default function JournalList() {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJournals() {
      try {
        const res = await fetch('/api/journal');
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
          <Link href="/journal/write" style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
            새 일지 작성
          </Link>
          <Link href="/dashboard" style={{ padding: '10px 20px', background: '#475569', color: 'white', textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
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

              {journal.journal_images && journal.journal_images.length > 0 && (
                <div>
                  <strong style={{ color: '#94a3b8', display: 'block', marginBottom: '10px' }}>첨부된 사진:</strong>
                  <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                    {journal.journal_images.map((img) => (
                      <img key={img.id} src={img.public_url} alt={img.file_name} style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #334155' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}