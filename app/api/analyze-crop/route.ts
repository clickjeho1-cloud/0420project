import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 💡 환경 변수 인식 문제로 인해 직접 새로 발급받은 토큰을 강제 삽입합니다.
    const hfToken = process.env.HF_API_TOKEN || "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";
    if (!hfToken) {
      console.error('환경 변수에 HF_API_TOKEN이 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버에 Hugging Face 토큰이 설정되지 않았습니다. .env.local 파일을 확인해주세요.' }, 
        { status: 500 }
      );
    }

    const formData = await req.formData();
    // 💡 프론트엔드에서 여러 장의 사진을 보낼 경우 모두 처리하도록 업데이트
    let imageFiles = formData.getAll('images') as File[];
    if (imageFiles.length === 0) {
      const singleImage = formData.get('image') as File;
      if (singleImage) imageFiles.push(singleImage);
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: '이미지가 하나 이상 업로드되지 않았습니다.' }, { status: 400 });
    }

    // 💡 Hugging Face가 읽을 수 있는 객체 형태로 변환
    const imageContents = await Promise.all(imageFiles.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      return {
        type: "image_url",
        image_url: {
          url: `data:${file.type};base64,${base64Image}`
        }
      };
    }));

    const prompt = `
      You are a smart farm agriculture expert and plant pathologist. 
      Please analyze the provided crop photo and provide a detailed report on the following 4 items for a farming journal.
      Please format the results neatly using Markdown.

      1. Pests, Diseases & Countermeasures: Diagnose any visible symptoms and suggest specific eco-friendly or chemical treatments.
      2. Growth Stage & Expected Harvest: Evaluate the current growth stage and estimate the harvest time.
      3. Soil & Environmental Diagnosis: Infer issues such as water stress, overwatering, or soil aeration based on leaf conditions.
      4. Nutrient Management Advice: Analyze potential nutrient deficiencies and recommend adjustments for EC/pH levels.
    `;

    // 💡 범용 API 주소에서 에러가 났으므로, 2.0 모델 전용 API 경로로 명확하게 재지정합니다.
    const url = `https://api-inference.huggingface.co/models/Qwen/Qwen2-VL-7B-Instruct/v1/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2-VL-7B-Instruct", // 💡 최신 2.5 버전은 무료 서버 통신 규격이 불안정하므로 안정적인 2.0 버전으로 다운그레이드
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...imageContents,
            ],
          },
        ],
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Hugging Face API 응답 에러:', errorData);
      
      let errorMsg = errorData;
      try {
        const parsed = JSON.parse(errorData);
        errorMsg = parsed.error || errorData;
      } catch(e) {}

      // 💡 모델이 잠들어있어 로딩 중인 경우(콜드 스타트) 친절한 메시지 반환
      if (response.status === 503 || errorMsg.toLowerCase().includes('loading')) {
        throw new Error('오픈소스 AI 모델이 현재 서버에서 깨어나는 중입니다(약 1~2분 소요). 잠시 후 진단 버튼을 다시 눌러주세요!');
      }
      
      throw new Error(`허깅페이스 API 오류: ${errorMsg}`);
    }

    const result = await response.json();
    const responseText = result.choices?.[0]?.message?.content || '분석 결과를 불러오지 못했습니다.';

    return NextResponse.json({ analysis: responseText });

  } catch (error: any) {
    console.error('이미지 분석 예외 발생:', error);
    return NextResponse.json(
      { error: error.message || '이미지 분석에 실패했습니다. 이미지 파일이나 서버 상태를 확인해주세요.' }, 
      { status: 500 }
    );
  }
}
