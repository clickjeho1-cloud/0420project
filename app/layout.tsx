import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Smart Farm Control',
    template: '%s | Smart Farm',
  },
  description: 'AI 기반 스마트팜 제어 및 모니터링 시스템',

  manifest: '/manifest.json',

  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },

  applicationName: 'Smart Farm',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Smart Farm',
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#00ffcc',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* iOS 스플래시 화면 */}
        <link rel="apple-touch-startup-image" href="/splash.png" />
      </head>

      <body>
        {children}

        {/* 서비스워커 등록 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}