"use client";
import { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";

interface ImageScannerProps {
  onCapture: (image: string) => void;
}

export default function ImageScanner({ onCapture }: ImageScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) onCapture(imageSrc);
  }, [onCapture]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-xl bg-white shadow-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg aspect-video bg-black">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          className="w-full h-full object-cover scale-x-[-1]" // 좌우 반전(거울 모드)
          onUserMedia={() => setIsCameraReady(true)}
        />
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
            카메라를 연결 중입니다...
          </div>
        )}
      </div>
      <button
        onClick={capture}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-bold shadow-lg active:scale-95"
      >
        현재 화면 분석하기
      </button>
    </div>
  );
}