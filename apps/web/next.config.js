/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@openmonitor/api-client", "@openmonitor/shared"],
  eslint: { ignoreDuringBuilds: true },
};

module.exports = nextConfig;
