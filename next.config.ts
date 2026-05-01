import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker standalone deployment
  output: "standalone",

  experimental: {
    optimizePackageImports: ["antd", "@ant-design/icons", "recharts"],
  },

  // Allow HMR from network IP (for development on LAN/CasaOS)
  allowedDevOrigins: ["192.168.0.109"],
};

export default nextConfig;
