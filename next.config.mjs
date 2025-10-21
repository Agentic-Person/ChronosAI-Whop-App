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
};

export default nextConfig;
