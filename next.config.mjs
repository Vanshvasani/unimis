const security = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];
export default {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  async headers() {
    return [
      { source: "/(.*)", headers: security },
      { source: "/icon.svg", headers: [{ key: "Cache-Control", value: "public, max-age=604800" }] },
    ];
  },
};
