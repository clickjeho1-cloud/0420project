import webpack from "next/dist/compiled/webpack/webpack-lib.js";
import { createRequire } from "module";
import path from "path";

const require = createRequire(import.meta.url);

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
        // mqtt 브라우저 번들이 참조하는 Node core 모듈 폴리필
        buffer: "buffer/",
        process: "process/browser",
        stream: "stream-browserify",
        util: "util/",
        assert: "assert/",
        events: "events/",
      };

      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // 브라우저에서 Node용 엔트리로 번들링되는 이슈 방지
        // UMD 번들은 ESM import에서 형태가 꼬일 수 있어 ESM 번들을 강제 사용
        // (exports 해석으로 .js가 중복되는 이슈가 있어 절대 경로로 지정)
        mqtt: path.resolve(
          path.dirname(require.resolve("mqtt/package.json")),
          "dist",
          "mqtt.esm.js"
        ),
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
