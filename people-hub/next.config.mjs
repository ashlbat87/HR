/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*.app.github.dev",
        "*.github.dev",
        "localhost:3000",
        "localhost:3001",
        "localhost:3002"
      ],
    },
  },
};
export default nextConfig;
