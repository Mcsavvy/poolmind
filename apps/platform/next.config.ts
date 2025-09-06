import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  allowedDevOrigins: ["dev.poolmind.com"],
  output: 'standalone',
  outputFileTracingRoot: '../../',
};

export default nextConfig;
