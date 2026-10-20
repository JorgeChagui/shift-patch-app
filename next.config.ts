import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
