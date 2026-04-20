# 0420project — 스마트팜 웹 대시보드

Arduino UNO R4 WiFi → **HiveMQ MQTT** → (본 웹앱) **Supabase** 저장 + **Vercel** 배포.

## 디렉터리 구조

```
0420project/
├── vercel.json
├── LICENSE
├── package.json
├── next.config.mjs          # mqtt 브라우저 번들용 webpack fallback
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── .env.example
├── .gitignore
├── README.md
├── public/                    # 정적 파일 (현재 .gitkeep)
├── supabase/
│   └── schema.sql             # Supabase 테이블·RLS (초기 1회 실행)
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── loading.tsx
    │   ├── error.tsx          # 전역 오류 (Client Component)
    │   ├── not-found.tsx
    │   └── api/
    │       ├── health/route.ts        # GET /api/health
    │       └── supabase-test/route.ts # GET /api/supabase-test
    ├── components/
    │   ├── Dashboard.tsx      # MQTT + Supabase 연동
    │   ├── StatusCards.tsx
    │   ├── SensorCharts.tsx
    │   └── PumpLedControls.tsx
    └── lib/
        ├── supabase-client.ts
        └── types.ts
```

## 로컬 실행

```powershell
cd C:\0420project
npm install
copy .env.example .env.local
# .env.local 을 편집해 Supabase·HiveMQ 값 입력
npm run dev
```

브라우저: http://localhost:3000

## 환경 변수 (`.env.local` / Vercel)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `NEXT_PUBLIC_MQTT_WS_URL` | HiveMQ **WebSocket** 주소 (예: `wss://....hivemq.cloud:8884/mqtt`) |
| `NEXT_PUBLIC_MQTT_USER` | MQTT 사용자명 |
| `NEXT_PUBLIC_MQTT_PASSWORD` | MQTT 비밀번호 |

> HiveMQ Cloud 콘솔의 **WebSocket** 연결 정보(호스트·포트·경로)를 그대로 사용하세요.  
> 브라우저에 비밀번호가 포함되므로 **전용 계정·최소 권한**을 권장합니다.

## Supabase

1. 새 프로젝트 생성  
2. SQL Editor 에서 `supabase/schema.sql` 실행  
3. Settings → API 에서 URL / anon key 복사 → `.env.local`

## GitHub 업로드

```powershell
cd C:\0420project
git init
git add .
git commit -m "Initial commit: smartfarm dashboard"
# GitHub 에 저장소 만든 뒤
git remote add origin https://github.com/<계정>/<저장소>.git
git branch -M main
git push -u origin main
```

`.env.local` 은 `.gitignore` 에 포함되어 **푸시되지 않습니다.**

## Vercel 배포

1. [vercel.com](https://vercel.com) → New Project → GitHub 저장소 import  
2. Framework: **Next.js** 자동 인식  
3. Environment Variables 에 위 `NEXT_PUBLIC_*` 항목을 **Production** 에 등록  
4. Deploy

빌드: `npm run build` (Vercel 동일)

배포 후 확인 (선택):

- `https://<배포도메인>/api/health` — 서비스 기동 여부
- `https://<배포도메인>/api/supabase-test` — Supabase 환경 변수 설정 여부(값은 미노출)

## 아두이노와 동일 토픽

- 발행(구독): `smartfarm/sensor/temp`, `smartfarm/sensor/humi`, `smartfarm/status`  
- 제어(발행): `smartfarm/control` — `PUMP_ON` / `PUMP_OFF` / `LED_ON` / `LED_OFF`
