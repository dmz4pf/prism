import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  poweredByHeader: false,
  compress: true,

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@rainbow-me/rainbowkit',
      'framer-motion',
      'wagmi',
      'viem',
    ],
  },

  // Turbopack configuration (used with --turbopack flag)
  turbopack: {
    resolveAlias: {
      'pino-pretty': { browser: '' },
    },
  },

  // Webpack configuration to handle missing optional dependencies
  webpack: (config) => {
    // Provide empty modules for optional dependencies that cause warnings
    config.resolve.alias = {
      ...config.resolve.alias,
      'pino-pretty': false,
    };

    // Handle fallbacks for browser environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'assets.coingecko.com' },
      { protocol: 'https', hostname: 'raw.githubusercontent.com' },
      { protocol: 'https', hostname: 'cryptologos.cc' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Performance headers
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      // Cache static assets aggressively
      {
        source: '/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
