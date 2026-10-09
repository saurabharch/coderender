/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["geoip-lite"],
  // Lint + typecheck run explicitly in scripts/ci.sh; skipping them in-build
  // keeps device builds fast and avoids the standalone ESLint crash.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@mantine/dates", "@mantine/charts", "@mantine/form"],
  },
  webpack: (config, { dev, isServer }) => {
    // Client-only: the device react dist is a CJS stub (`module.exports =
    // require(...)`) that webpack cannot statically analyze from strict ESM
    // (.mjs) importers. Point client builds at the real CJS files so Mantine
    // v9's named imports resolve. Server builds keep export conditions (RSC).
    if (!isServer) {
      const suffix = dev ? "development.js" : "production.js";
      const rj = (p) => `${process.cwd()}/${p}`;
      config.resolve.alias = {
        "react/jsx-runtime": rj(`node_modules/react/cjs/react-jsx-runtime.${suffix}`),
        "react/jsx-dev-runtime": rj(`node_modules/react/cjs/react-jsx-dev-runtime.${suffix}`),
        "react-dom/client": rj(`node_modules/react-dom/cjs/react-dom-client.${suffix}`),
        ...config.resolve.alias,
        react: rj(`node_modules/react/cjs/react.${suffix}`),
        "react-dom": rj(`node_modules/react-dom/cjs/react-dom.${suffix}`),
      };
    }
    return config;
  },
  async headers() {    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        // Admin HTML must never serve stale across deploys: cached pages
        // reference rotated chunks and render dead. APIs/static untouched.
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
    ];
  },
};
export default nextConfig;
