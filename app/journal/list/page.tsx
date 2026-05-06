'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ================= TYPES ================= */
type JournalEntry = {
  id: number;
  date: string;
  height: number | null;
  leafSize: number | null;
  waterAmount: number | null;
  notes: string;
};

/* ================= PAGE ================= */
export default function JournalListPage() {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJournals() {
      try {
        const response = await fetch('/api/journal');
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
        table { width: 100%; border-collapse: collapse; text-align: center; }
        th { background: #1e293b; color: #f8fafc; padding: 14px; font-weight: bold; border-bottom: 2px solid #334155; }
        td { padding: 14px; border-bottom: 1px solid #1f2937; color: #cbd5e1; }
        tr:hover td { background: #0f172a; }
        
        .notes-col { text-align: left; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </div>
  );
}