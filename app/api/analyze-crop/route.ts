import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버에 API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요.' }, 
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json({ error: '이미지가 업로드되지 않았습니다.' }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');

    const imageParts = [
      {
        inlineData: {
          data: base64Image,
          mimeType: imageFile.type,
        },
      },
    ];

    const prompt = `
      당신은 스마트팜 농업 전문가이자 식물 병리학자입니다. 
      제공된 작물 사진을 분석하여 영농일지에 기록할 수 있도록 다음 4가지 항목을 상세히 분석해주세요.
      결과는 마크다운(Markdown) 형식으로 깔끔하게 정리해서 답변해주세요.

      1. 병해충 여부 및 대처법: 현재 보이는 병해충 증상이 있는지 진단하고, 구체적인 친환경적/화학적 대처법 제시
      2. 생육 단계 및 수확 시기: 현재 작물의 생육 단계를 평가하고 예상 수확 시기 가늠
      3. 토양 환경 문제 진단: 잎 상태를 통해 수분 부족, 과습, 토양 통기성 등 유추
      4. 배양액 및 양분 관리 조언: 결핍된 영양소 분석 및 EC/pH 조절 등 배양액 수치 관리 방향 추천
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    return NextResponse.json({ analysis: responseText });

  } catch (error) {
    console.error('이미지 분석 중 오류 발생:', error);
    return NextResponse.json(
      { error: '이미지 분석에 실패했습니다. 이미지 파일이나 서버 상태를 확인해주세요.' }, 
      { status: 500 }
    );
  }
}
