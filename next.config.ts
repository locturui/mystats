import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    middlewareClientMaxBodySize: '150mb',
  },
};

export default nextConfig;
