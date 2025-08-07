import type { NextConfig } from "next";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org",
  "frame-src https://oauth.telegram.org https://*.telegram.org",
  "connect-src 'self' https://oauth.telegram.org https://*.telegram.org",
  "img-src 'self' data: https://*.telegram.org",
  "style-src 'self' 'unsafe-inline'",
].join("; ");


const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
  allowedDevOrigins: ["dev.poolmind.com"],
};

export default nextConfig;
