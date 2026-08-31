import type { NextConfig } from 'next';

// Set only for the (later) Capacitor iOS build — Vercel's normal `next build`
// never sets this, so the web deploy is unaffected. See design spec §9/§11.
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor';

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: 'export' } : {}),
};

export default nextConfig;
