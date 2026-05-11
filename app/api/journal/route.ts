import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, height, leafSize, waterAmount, notes, images } = body;

    // 환경 변수 로드 (서비스 롤 키를 우선 사용하여 RLS 권한 문제 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase 환경 변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. journals 테이블에 일지 데이터 우선 저장
    const { data: journalData, error: journalError } = await supabase
      .from('journals')
      .insert([{
        date,
        height,
        leaf_size: leafSize,
        water_amount: waterAmount,
        notes
      }])
      .select()
      .single();

    if (journalError) {
      console.error('journals 저장 에러:', journalError);
      return NextResponse.json({ success: false, error: journalError.message }, { status: 500 });
    }

    // 2. 업로드된 이미지가 있다면 새로 생성된 일지 ID와 함께 journal_images 테이블에 저장
    if (images && images.length > 0) {
      const imageRecords = images.map((img: any) => ({
        journal_id: journalData.id,
        storage_path: img.storage_path,
        public_url: img.public_url,
        file_name: img.file_name,
        width: img.width,
        height: img.height,
        size_kb: img.size_kb,
        avg_brightness: img.avg_brightness,
        green_score: img.green_score,
        crop_health: img.crop_health,
        health_description: img.health_description
      }));

      const { error: imagesError } = await supabase
        .from('journal_images')
        .insert(imageRecords);

      if (imagesError) {
        console.error('journal_images 저장 에러:', imagesError);
        return NextResponse.json({ success: false, error: '이미지 DB 저장 중 오류: ' + imagesError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: journalData });

  } catch (error: any) {
    console.error('API 처리 중 에러 발생:', error);
    return NextResponse.json({ success: false, error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}