'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ================= TYPES ================= */
type JournalImage = {
  id: number;
  public_url: string;
  file_name: string;
  crop_health?: string;
  health_description?: string;
  avg_brightness?: number;
  green_score?: number;
};

type JournalEntry = {
  id: number;
  date: string;
  height: number | null;
  leafSize: number | null;
  waterAmount: number | null;
  notes: string;
  journal_images?: JournalImage[];
};

/* ================= 조치 사항(개선점) 도우미 함수 ================= */
const getActionTip = (health?: string) => {
  switch(health) {
    case 'excellent': return '✨ 현재 환경 유지';
    case 'good': return '💧 꾸준한 관찰 요망';
    case 'fair': return '☀️ 광량 및 수분 점검';
    case 'poor': return '🚨 영양/환경 적극 개선';
    default: return '🔍 재촬영 요망';
  }
};

/* ================= PAGE ================= */
export default function JournalListPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJournals() {
      try {
        // 캐시를 무시하고 항상 서버에 최신 데이터를 요청
        const response = await fetch('/api/journal', { cache: 'no-store' });
        const result = await response.json();
        
        if (result.success) {
          setJournals(result.data);
        }
      } catch (error) {
        console.error('일지 목록을 불러오는 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchJournals();
  }, []);

  /* ================= UI ================= */
  return (
    <div className="list-container">
      <div className="header">
        <h1>📖 작성된 영농일지 목록</h1>
        <Link href="/journal" className="write-btn">
          + 새 일지 작성
        </Link>
      </div>

      {loading ? (
        <p className="loading">데이터를 불러오는 중입니다...</p>
      ) : journals.length === 0 ? (
        <p className="empty">아직 작성된 영농일지가 없습니다.</p>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>일자</th>
                <th>초장 (cm)</th>
                <th>엽면적 (cm)</th>
                <th>관수량 (L)</th>
                <th className="notes-col">특이사항</th>
                <th>사진</th>
              </tr>
            </thead>
            <tbody>
              {journals.map((journal) => (
                <tr key={journal.id}>
                  <td>{journal.date}</td>
                  <td>{journal.height || '-'}</td>
                  <td>{journal.leafSize || '-'}</td>
                  <td>{journal.waterAmount || '-'}</td>
                  <td className="notes-col">{journal.notes || '-'}</td>
                  <td className="images-col">
                    {journal.journal_images && journal.journal_images.length > 0 ? (
                      <div className="thumbnail-row">
                        {journal.journal_images.map((img) => (
                          <div key={img.id} className="image-item">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.public_url} alt={img.file_name} />
                            {img.health_description && (
                              <div className={`health-badge health-${img.crop_health || 'unknown'}`}>
                                {img.health_description.split(' ')[0]}
                              </div>
                            )}
                            {typeof img.avg_brightness === 'number' && (
                              <div className="image-stats">{getActionTip(img.crop_health)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
              <span style={{ color: '#64748b', fontSize: '14px' }}>사진 없음</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .list-container { background: #05070f; color: white; min-height: 100vh; padding: 24px; font-size: 16px; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 16px; margin-bottom: 24px; }
        h1 { margin: 0; font-size: 24px; }
        
        .write-btn { background: #2563eb; color: white; padding: 10px 16px; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .write-btn:hover { background: #1d4ed8; }
        
        .loading, .empty { text-align: center; color: #94a3b8; padding: 40px; font-size: 18px; }
        
        .table-wrapper { background: #0b1220; border: 1px solid #1f2937; border-radius: 8px; overflow: hidden; }
        .thumbnail-row { display: flex; gap: 10px; justify-content: flex-start; flex-wrap: wrap; padding: 4px; }
        .image-item { display: flex; flex-direction: column; align-items: center; gap: 5px; background: #0f172a; padding: 8px; border-radius: 8px; border: 1px solid #1e293b; }
        .thumbnail-row img { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; border: 1px solid #334155; }
        .health-badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
        .health-excellent { background: #10b981; color: #ecfdf5; }
        .health-good { background: #3b82f6; color: #eff6ff; }
        .health-fair { background: #f59e0b; color: #fffbeb; }
        .health-poor { background: #ef4444; color: #fef2f2; }
        .health-unknown { background: #6b7280; color: #f3f4f6; }
        .image-stats { font-size: 11px; color: #94a3b8; background: #05070f; padding: 4px 6px; border-radius: 4px; white-space: nowrap; border: 1px solid #1f2937; letter-spacing: -0.5px; }
        .images-col { min-width: 140px; }
        table { width: 100%; border-collapse: collapse; text-align: center; }
        th { background: #1e293b; color: #f8fafc; padding: 14px; font-weight: bold; border-bottom: 2px solid #334155; }
        td { padding: 14px; border-bottom: 1px solid #1f2937; color: #cbd5e1; }
        tr:hover td { background: #0f172a; }
        
        .notes-col { text-align: left; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
}