# 자체 AI 서버 (FastAPI + OpenCV)
# 설치 방법: pip install fastapi uvicorn opencv-python numpy pydantic
# 실행 방법: uvicorn ai_server:app --reload --port 8000

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import cv2
import numpy as np

app = FastAPI()

# 웹 브라우저(대시보드)에서 접속할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImageData(BaseModel):
    image: str = None
    url: str = None
    sensors: dict = None

@app.get("/")
async def check_status():
    # 브라우저에서 직접 접속했을 때 서버가 켜져 있는지 확인하는 용도입니다.
    return {"status": "running", "message": "🚀 Glovera 스마트팜 AI 서버가 정상적으로 작동 중입니다!"}

@app.post("/analyze")
async def analyze_image(data: ImageData):
    try:
        img = None
        
        # 1. 브라우저에서 보낸 카메라 URL이 있다면, 서버(OpenCV)가 직접 스트림에 접속해 1프레임을 캡처합니다. (CORS 보안 에러 원천 차단)
        if data.url:
            cap = cv2.VideoCapture(data.url)
            ret, frame = cap.read()
            cap.release()
            if not ret:
                raise Exception("카메라 스트리밍 주소에서 영상을 읽어올 수 없습니다.")
            img = frame
            
        # 2. Base64로 넘어온 이미지가 있다면 OpenCV 포맷으로 변환
        elif data.image:
            img_bytes = base64.b64decode(data.image)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        else:
            raise Exception("분석할 이미지 데이터나 URL이 제공되지 않았습니다.")

        # 3. 💡 여기에 YOLOv8 모델 추론 코드를 넣으면 됩니다!
        # 예: results = model(img)
        # 현재는 YOLO가 감지했다고 가정한 더미 텍스트를 반환합니다.
        
        return {"status": "success", "message": "딸기 잎 뒷면에서 '흰가루병' 초기 징후가 감지되었습니다. (정확도: 85%)"}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}