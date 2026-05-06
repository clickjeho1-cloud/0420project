import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

type JournalImage = {
  storage_path: string;
  public_url: string;
  file_name: string;
  width: number;
  height: number;
  size_kb: number;
  avg_brightness: number;
  green_score: number;
};

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select('*, journal_images(*)')
      .order('date', { ascending: false });

    if (error) {
      const fallback = await supabase
        .from('journals')
        .select('*')
        .order('date', { ascending: false });

      if (fallback.error) {
        return NextResponse.json({ success: false, error: fallback.error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: fallback.data });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { date, height, leafSize, waterAmount, notes, images } = body;

    const { data, error } = await supabase
      .from('journals')
      .insert([{ date, height, leafSize, waterAmount, notes }])
      .select();

    if (error || !data || !data.length) {
      return NextResponse.json({ success: false, error: error?.message ?? 'Journal insert failed' }, { status: 400 });
    }

    const journalId = data[0].id;
    if (images && Array.isArray(images) && images.length > 0) {
      const insertImages = images.map((img: JournalImage) => ({
        journal_id: journalId,
        storage_path: img.storage_path,
        public_url: img.public_url,
        file_name: img.file_name,
        width: img.width,
        height: img.height,
        size_kb: img.size_kb,
        avg_brightness: img.avg_brightness,
        green_score: img.green_score,
      }));

      const { error: imageError } = await supabase.from('journal_images').insert(insertImages);
      if (imageError) {
        console.error('journal_images insert error', imageError.message);
      }
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
