'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          height: formData.height ? parseFloat(formData.height) : null,
          leafSize: formData.leafSize ? parseFloat(formData.leafSize) : null,
          waterAmount: formData.waterAmount ? parseFloat(formData.waterAmount) : null,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        alert('영농일지가 성공적으로 저장되었습니다.');
        router.push('/journal/list');
      } else {
        alert('저장 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('저장 오류:', error);
      alert('저장 중 오류가 발생했습니다.');
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
      `}</style>
    </div>
  );
}</content>
<parameter name="filePath">c:/0420project/app/journal/page.tsx