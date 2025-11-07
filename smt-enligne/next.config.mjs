/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  output: 'standalone',  // Enable standalone output mode
  experimental: {
    outputFileTracingRoot: undefined, // Needed for standalone in Docker
  },
  images: {
    // If installing `sharp` in the runner fails on Alpine, consider
    // setting `unoptimized: true` to disable Next.js image optimization.
    // unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig
