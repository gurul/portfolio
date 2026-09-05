/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
