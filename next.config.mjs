/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
