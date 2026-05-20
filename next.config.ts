import type { NextConfig } from "next";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy — strict for PHI app, but allow Vercel devtools + Next inline scripts.
const csp = [
  "default-src 'self'",
  // Next.js needs unsafe-inline + unsafe-eval in dev for HMR, in prod only inline for hydration data.
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  // OpenAI for whisper/gpt, OpenFDA for DDI, RxNorm for med autocomplete, Vercel blob for photos.
  "connect-src 'self' https://api.openai.com https://api.fda.gov https://rxnav.nlm.nih.gov https://*.neon.tech wss: https://vitals.vercel-insights.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  // Upgrade insecure requests in prod.
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      // Disallow caching for API + chart pages by intermediate CDNs to prevent PHI leak.
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/patients/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" }],
      },
    ];
  },
};

export default nextConfig;
