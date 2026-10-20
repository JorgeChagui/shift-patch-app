import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// Vercel serves HTTPS only; local `next start` (and the E2E server) is plain http.
const isHttps = process.env.VERCEL === "1";

// Static CSP, no nonce: a nonce forces every page to render per request, which would undo
// cacheComponents/partial prerendering. Inline scripts carry the RSC payload, hence
// 'unsafe-inline'. Everything is same-origin: fonts are self-hosted by next/font, and the
// browser never talks to Supabase (signed URLs are plain links). See
// node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md ("Without Nonces").
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  cacheLife: {
    // Shared reads in src/lib/data. Mutations expire their tags right away; the time-based
    // window only bounds staleness for changes made outside the app (e.g. a reseed).
    marketplace: {
      stale: 30,
      revalidate: 60,
      expire: 60 * 60,
    },
  },
  experimental: {
    serverActions: {
      // Credential uploads are up to 4 MB plus multipart overhead, under Vercel's 4.5 MB body cap.
      bodySizeLimit: "4.5mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
