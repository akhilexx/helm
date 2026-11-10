/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/helm",
  assetPrefix: "/helm",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["@pm-amm/sdk", "@anchor-lang/core"],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, os: false, path: false, crypto: false };
    config.resolve.alias = { ...(config.resolve.alias || {}), buffer: "buffer" };
    return config;
  }
};
export default nextConfig;
