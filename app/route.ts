import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "분석할 이미지가 없습니다." }, { status: 400 });
    }
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API 키 설정이 필요합니다." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imageData = {
      inlineData: {
        data: image.split(",")[1],
        mimeType: "image/jpeg",
      },
    };

    const prompt = `
      이 식물 사진을 분석해서 다음 정보를 JSON 형식으로 알려줘:
      1. disease_name: 병충해 이름 (건강하다면 '정상'이라고 해줘)
      2. probability: 확률 (0~100)
      3. symptoms: 주요 증상 설명
      4. treatment: 구체적인 방제 방법 또는 대처법
      반드시 다른 설명 없이 JSON 객체만 반환해줘.
    `;

    const result = await model.generateContent([prompt, imageData]);
    const text = result.response.text();
    
    // JSON 응답 정제 (마크다운 제거 및 순수 JSON 추출)
    const jsonMatch = text.match(/\{[\s\S]*\}/); 
    const diagnosis = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    return NextResponse.json({
      ...diagnosis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("AI 진단 에러:", error);
    return NextResponse.json(
      { error: "진단 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}