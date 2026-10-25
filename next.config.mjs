/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // The whole stylesheet is ~18 KB (5 KB gzipped). Inlining it into the
    // HTML removes the one render-blocking request before first paint, which
    // is a full round trip on a phone.
    inlineCss: true,
  },
  // Files in public/ are served with max-age=0 by default, so every repeat
  // visit revalidates each cheetah frame and the sun mask. They change only
  // with a deploy; an hour fresh plus a week of background revalidation
  // keeps repeat loads off the network without pinning a stale frame.
  async headers() {
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=3600, stale-while-revalidate=604800",
      },
    ];
    return [
      { source: "/cheetah-frames/:path*", headers: cache },
      { source: "/sun-glyph.png", headers: cache },
    ];
  },
  // /software and /hardware became one /projects page (2026-10-09); old links still land.
  async redirects() {
    return [
      { source: "/software", destination: "/projects", permanent: true },
      { source: "/hardware", destination: "/projects", permanent: true },
    ];
  },
  // .wgsl modules (the ocean + sun shader pipelines) import each other; the
  // vgpu loader resolves that graph at build time. Turbopack and webpack each
  // read only their own block, so both are configured.
  turbopack: {
    rules: {
      "*.wgsl": {
        loaders: ["@vgpu/wgsl/loader-webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module ??= {};
    config.module.rules ??= [];
    config.module.rules.push({
      test: /\.wgsl$/,
      loader: "@vgpu/wgsl/loader-webpack",
    });
    return config;
  },
};

export default nextConfig;
