import webpack from "next/dist/compiled/webpack/webpack-lib.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // mqtt 브라우저 번들이 Node 전역(process/Buffer)을 기대하는 경우가 있어 폴리필 주입
      // Next.js 14는 기본 polyfill을 제공하지 않음
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // 브라우저에서 Node용 엔트리로 번들링되는 이슈 방지
        mqtt: "mqtt/dist/mqtt",
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        })
      );
    }
    return config;
  },
};

export default nextConfig;
