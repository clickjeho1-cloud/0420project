import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const { data, error } = await supabase
      .from('journal')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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
    const { date, height, leafSize, waterAmount, notes } = body;

    const { data, error } = await supabase
      .from('journal')
      .insert([{ date, height, leafSize, waterAmount, notes }])
      .select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}</content>
<parameter name="filePath">c:/0420project/app/api/journal/route.ts