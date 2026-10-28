import type { NextConfig } from "next";

const securityHeaders = [
  // Don't let other sites show this app inside a frame.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Don't let browsers guess file types.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the site name (not the page) when students open source links.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The app only needs the camera through the file picker, nothing else.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
