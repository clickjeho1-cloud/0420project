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
    image: str

@app.post("/analyze")
async def analyze_image(data: ImageData):
    try:
        # 1. Base64로 넘어온 이미지를 OpenCV 포맷으로 변환
        img_bytes = base64.b64decode(data.image)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # 2. 💡 여기에 YOLOv8 모델 추론 코드를 넣으면 됩니다!
        # 예: results = model(img)
        # 현재는 YOLO가 감지했다고 가정한 더미 텍스트를 반환합니다.
        
        return {"status": "success", "message": "딸기 잎 뒷면에서 '흰가루병' 초기 징후가 감지되었습니다. (정확도: 85%)"}
    
    except Exception as e:
        return {"status": "error", "message": str(e)}