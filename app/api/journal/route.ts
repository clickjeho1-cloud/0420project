import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic'; // 항상 최신 데이터를 불러오도록 캐시 강제 비활성화

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ success: false, error: 'Supabase 환경 변수가 설정되지 않았습니다.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // journals와 연관된 journal_images(사진)를 함께 불러옵니다.
    const { data, error } = await supabase
      .from('journals')
      .select('*, journal_images(*)')
      .order('date', { ascending: false }); // 최신 날짜가 위로 오게 정렬

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // 프론트엔드에서 사용하는 카멜케이스(camelCase) 변수명으로 자동 매핑
    const formattedData = data.map((item: any) => ({
      id: item.id,
      date: item.date,
      height: item.height,
      leafSize: item.leaf_size || item.leafSize || null,
      waterAmount: item.water_amount || item.waterAmount || null,
      notes: item.notes,
      journal_images: item.journal_images
    }));

    return NextResponse.json({ success: true, data: formattedData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      date, height, leafSize, waterAmount, notes, images,
      ecManagement, phSupply, drainageRate, supplyTime, substrateMoisture
    } = body;

    // 새로 추가된 영농 항목들을 기존 특기사항(notes)에 병합하여 예쁘게 포맷팅합니다.
    const extendedNotes = `[추가 영농 정보]
- EC 관리: ${ecManagement || '-'}
- pH 공급량: ${phSupply || '-'}
- 배액률: ${drainageRate || '-'}
- 공급시간: ${supplyTime || '-'}
- 배지 함수율: ${substrateMoisture || '-'}

[기존 특기사항]
${notes || ''}`.trim();

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
        notes: extendedNotes
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