import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // 빌드 시 정적 페이지 생성 에러 방지

export async function POST(req: NextRequest) {
  try {
    // 💡 환경 변수에서 키를 가져오거나 직접 입력된 키 사용
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyCS2yRcRd5QyboAHw-vCdNlBgpd06Km-c4";
    if (!apiKey) {
      console.error('환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버에 API 키가 설정되지 않았습니다.' }, 
        { status: 500 }
      );
    }

    const formData = await req.formData();
    
    // 💡 프론트엔드에서 보낸 폼 데이터를 변수로 읽어옵니다 (이 부분이 추가되어야 에러가 안 납니다!)
    const height = formData.get('height') || '미입력';
    const water = formData.get('water') || '미입력';
    const ec = formData.get('ec') || '미입력';
    const ph = formData.get('ph') || '미입력';

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
      당신은 30년 경력의 '스마트팜 정밀 농업 컨설턴트'입니다. 
      제공된 작물 사진과 아래의 입력 데이터를 바탕으로 [작물 종합 진단 리포트]를 작성하세요.

      [현재 실시간 농장 데이터]
      - 작물 초장(키): ${height} cm
      - 일일 관수량: ${water} L
      - 배양액 EC: ${ec} dS/m
      - 배양액 pH: ${ph}

      [분석 지시사항]
      1. 현재 환경 진단: 데이터와 사진을 종합하여 현재 상태의 '위험도(최적/주의/위험)'를 판정하세요.
      2. 병해충 및 이상 증상: 사진에서 보이는 잎의 색, 모양 등을 분석하여 결핍 증상(예: 팁번, 칼슘 결핍, 곰팡이 등)을 특정하세요.
      3. 즉각적인 조치 사항: 장비 제어(예: 환풍기 가동), 양액 농도(EC/pH) 조절 등 농민이 바로 실행할 수 있도록 조언을 숫자로 명확히 제안하세요.

      답변은 농민이 이해하기 쉽게 친절한 한국어로 작성하고, 소제목은 '##' 기호로, 핵심 문장은 '**'로 굵게 표시해 주세요.
    `;

    // 💡 최신 모델(3.0, 2.0)의 접근(404) 및 할당량(429) 에러를 방지하기 위해
    // 💡 현재 API 키가 여전히 무료 티어(Free Tier)로 인식되어 2.0 모델의 할당량이 0으로 차단되었습니다.
    // 💡 결제 연동이 완전히 반영될 때까지, 안정적인 'gemini-1.5-flash' 정식(v1) 버전으로 다시 우회합니다.
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
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
