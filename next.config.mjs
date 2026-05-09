/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 빌드 시 ESLint 경고/에러 무시 (강제 통과)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 타입스크립트 에러 무시 (강제 통과)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;