/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Self-contained build for the production Docker image (only the files the
  // server actually needs end up under .next/standalone).
  output: "standalone",
  // The standalone tracer must include the agent/content/ markdown that
  // page.tsx reads at request time via ../agent/content/*.md.
  outputFileTracingIncludes: {
    "/": ["../agent/content/**/*.md"],
  },
};

export default nextConfig;
