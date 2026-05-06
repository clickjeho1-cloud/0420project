import Navbar from './components/Navbar';

export const metadata = {
  title: 'Glovera Smart Farm',
  description: '스마트팜 통합 관제 대시보드 및 영농일지',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#05070f' }}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}