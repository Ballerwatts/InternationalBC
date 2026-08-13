/** @type {import('next').NextConfig} */
const nextConfig = {
  // Smaller, self-contained production build — used by the Dockerfile
  // (see fly.toml / Dockerfile for the lowest-cost Fly.io deployment path).
  output: "standalone",
};

export default nextConfig;
