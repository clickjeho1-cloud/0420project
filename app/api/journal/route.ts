import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (서버 환경)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// [1] 영농일지 목록 불러오기 (GET)
export async function GET() {
  try {
    // journals 테이블과 연결된 journal_images 사진 목록까지 한 번에 가져오기
    const { data, error } = await supabase
      .from('journals')
      .select(`
        *,
        journal_images (*)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('일지 조회 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// [2] 새 영농일지 및 사진 저장하기 (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, height, leafSize, waterAmount, notes, images } = body;

    // 1. 영농일지(텍스트 데이터) 저장
    const { data: journal, error: journalError } = await supabase
      .from('journals')
      .insert([
        {
          date,
          // 값이 비어있으면 데이터베이스 에러 방지를 위해 확실하게 null 처리
          height: height || null,
          "leafSize": leafSize || null,
          "waterAmount": waterAmount || null,
          notes: notes || null
        }
      ])
      .select()
      .single(); // 방금 저장한 일지의 정보(id 포함)를 가져옴

    if (journalError) throw journalError;

    // 2. 업로드된 사진이 있다면 사진 정보도 DB에 저장
    if (images && images.length > 0) {
      // 방금 저장된 일지의 ID(journal.id)를 사진 정보에 연결(Mapping)
      const imageRecords = images.map((img: any) => ({
        journal_id: journal.id,
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

      const { error: imageError } = await supabase.from('journal_images').insert(imageRecords);
      if (imageError) throw imageError;
    }

    return NextResponse.json({ success: true, data: journal });
  } catch (error: any) {
    console.error('일지 저장 에러:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}