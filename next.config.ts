import type { NextConfig } from "next";

const API_BASE = process.env.NEXT_PUBLIC_VALUATE_API ?? "http://127.0.0.1:8765";

const nextConfig: NextConfig = {
  // Allow dev access from both localhost and 127.0.0.1 (Next 16 blocks HMR otherwise).
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
