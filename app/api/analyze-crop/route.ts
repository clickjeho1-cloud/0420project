import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    // .env.local 파일을 못 찾는 경우를 대비해 사용자님의 키를 직접 삽입합니다.
    const apiKey = process.env.GEMINI_API_KEY || "AIzaSyA_EgbdM5d1Qpr0Nv0FyTP1x1G9VsZ6Kkk";
    
    console.log("[API 진단] GEMINI_API_KEY 로드 상태:", apiKey ? `✅ 성공 (길이: ${apiKey.length}자)` : "❌ 실패(찾을 수 없음)");

    if (!apiKey) {
      console.error('환경 변수에 GEMINI_API_KEY가 설정되지 않았습니다.');
      return NextResponse.json(
        { error: '서버에 API 키가 설정되지 않았습니다. .env.local 파일을 확인해주세요.' }, 
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 💡 최신 표준 이미지 분석 모델인 1.5-flash로 변경합니다.
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const formData = await req.formData();
    const imageFiles = formData.getAll('images') as File[];

    if (!imageFiles || imageFiles.length === 0) {
      return NextResponse.json({ error: '이미지가 업로드되지 않았습니다.' }, { status: 400 });
    }

    // 최대 8장까지만 처리
    const filesToProcess = imageFiles.slice(0, 8);
    const imageParts = await Promise.all(
      filesToProcess.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer();
        const base64Image = Buffer.from(arrayBuffer).toString('base64');
        return {
          inlineData: {
            data: base64Image,
            mimeType: file.type || 'image/jpeg', // 이미지 타입 누락 시 기본값 지정
          },
        };
      })
    );

    const prompt = `
      당신은 스마트팜 농업 전문가이자 식물 병리학자입니다. 
      총 ${imageParts.length}장의 작물 사진이 제공되었습니다. 
      결과는 마크다운(Markdown) 형식으로 일목요연하게 정리해주세요.

      [지시사항]
      1. 각 사진별로 개별 분석을 먼저 진행해주세요. (형식: "### 📷 사진 1 분석", "### 📷 사진 2 분석" ...)
      2. 개별 사진 분석 내용에는 해당 사진에서 관찰되는 병해충 여부, 생육 상태, 특이사항을 명시해주세요.
      3. 모든 개별 분석이 끝난 후, 전체 상황을 종합하여 아래 항목에 대한 [종합 진단 리포트]를 작성해주세요.
         - 🚨 종합 병해충 진단 및 대처법 (친환경적/화학적 방제)
         - 🌱 종합 생육 단계 및 수확 시기 가늠
         - 💧 종합 토양 환경(수분, 과습 등) 및 배양액(EC/pH) 관리 지침
    `;

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text();

    return NextResponse.json({ analysis: responseText });

  } catch (error) {
    console.error('이미지 분석 중 오류 발생:', error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return NextResponse.json(
      { error: `이미지 분석 실패 (원인: ${errorMessage})` }, 
      { status: 500 }
    );
  }
}
