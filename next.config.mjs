import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // M-1: Remove x-powered-by header
  poweredByHeader: false,

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  outputFileTracingRoot: __dirname,
  allowedDevOrigins: [
    "100.84.105.74",
    "localhost",
  ],
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    resolveAlias: {
      // Ensure better-sqlite3 is resolved as a native module
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark better-sqlite3 as external so it's loaded natively, not bundled
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('better-sqlite3');
      }
    }
    return config;
  },

  // Security headers (redundant with Traefik, added for defense in depth)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()'
          }
        ]
      }
    ]
  }
};

export default nextConfig;
