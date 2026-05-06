import type { NextConfig } from "next";

const RAW_API = process.env.NEXT_PUBLIC_VALUATE_API ?? "http://127.0.0.1:8765";
// Tolerate the env var being set to a bare hostname (e.g. "foo.up.railway.app").
// Next.js rewrites require destinations to start with `/`, `http://`, or `https://`.
const API_BASE = /^https?:\/\//.test(RAW_API) ? RAW_API : `https://${RAW_API}`;

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
