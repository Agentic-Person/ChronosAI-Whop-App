import { withWhopAppConfig } from "@whop/react/next.config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['whop.com', 'cdn.whop.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default withWhopAppConfig(nextConfig);
