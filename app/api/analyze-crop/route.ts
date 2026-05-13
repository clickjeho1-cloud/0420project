import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 💡 환경 변수에서 키를 가져오거나 직접 입력된 키 사용
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyA_EgbdM5d1Qpr0Nv0FyTP1x1G9VsZ6Kkk";
    if (!apiKey) {
      console.error('환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버에 API 키가 설정되지 않았습니다.' }, 
        { status: 500 }
      );
    }

    const formData = await req.formData();
    
    // 💡 프론트엔드에서 여러 장의 사진(images)을 보낼 경우 모두 처리
    let imageFiles = formData.getAll('images') as File[];
    if (imageFiles.length === 0) {
      const singleImage = formData.get('image') as File;
      if (singleImage) imageFiles.push(singleImage);
    }

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: '이미지가 하나 이상 업로드되지 않았습니다.' }, { status: 400 });
    }

    // 💡 모든 이미지를 Base64 및 AI가 읽을 수 있는 형태로 변환
    const imageParts = await Promise.all(imageFiles.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const base64Image = Buffer.from(arrayBuffer).toString('base64');
      return {
        inlineData: { mimeType: file.type, data: base64Image }
      };
    }));

    const prompt = `
      당신은 스마트팜 농업 전문가이자 식물 병리학자입니다. 
      제공된 작물 사진을 분석하여 영농일지에 기록할 수 있도록 다음 4가지 항목을 상세히 분석해주세요.
      결과는 마크다운(Markdown) 형식으로 깔끔하게 정리해서 답변해주세요.

      1. 병해충 여부 및 대처법: 현재 보이는 병해충 증상이 있는지 진단하고, 구체적인 친환경적/화학적 대처법 제시
      2. 생육 단계 및 수확 시기: 현재 작물의 생육 단계를 평가하고 예상 수확 시기 가늠
      3. 토양 환경 문제 진단: 잎 상태를 통해 수분 부족, 과습, 토양 통기성 등 유추
      4. 배양액 및 양분 관리 조언: 결핍된 영양소 분석 및 EC/pH 조절 등 배양액 수치 관리 방향 추천
    `;

    // 💡 구글의 구버전(1.5) 모델 서비스가 완전히 종료되어 404 에러가 발생하고 있습니다.
    // 💡 현재 지원되는 최신 안정화 모델인 'gemini-2.0-flash'로 버전명을 업데이트합니다.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...imageParts, // 여러 장의 사진 데이터 전송
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Google API 요청 실패: ${errorData}`);
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '분석 결과를 불러오지 못했습니다.';

    return NextResponse.json({ analysis: responseText });

  } catch (error: any) {
    console.error('이미지 분석 중 오류 발생:', error);
    return NextResponse.json(
      { error: error.message || '이미지 분석에 실패했습니다. 이미지 파일이나 서버 상태를 확인해주세요.' }, 
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
