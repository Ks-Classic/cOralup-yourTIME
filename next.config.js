/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],
  images: {
    domains: ['localhost', 'placehold.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'dnofyacfnaesqksmypab.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
