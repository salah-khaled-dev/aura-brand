const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next.js App Router streams RSC payloads via inline `<script>self.__next_f.push(...)</script>`
  // tags, so script-src can't be locked to 'self' alone without a per-request nonce wired through
  // proxy.ts + every layout — not attempted here since it can't be verified without a browser.
  // 'unsafe-eval' is added only in dev: React's Fast Refresh/dev-mode debugging calls eval() to
  // reconstruct stack traces across environments — React itself never calls eval() in production,
  // so the production CSP stays eval-free.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  // framer-motion drives animations through inline `style` attributes; Tailwind's own rules ship
  // as external stylesheets and don't need this, but the inline attributes do.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://api.dicebear.com https://via.placeholder.com https://*.supabase.co",
  "font-src 'self' data:",
  // REST/RPC calls and Realtime (order-tracking broadcast channel) both go to the Supabase project.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
    // On NAT64/DNS64 networks (common on IPv6-only networks, some VPNs/corporate
    // networks, and some hosting providers), DNS lookups for our allowed hosts above
    // return synthetic "64:ff9b::/96" IPv6 addresses alongside the real ones. Next's
    // image optimizer resolves every hostname and rejects the request if *any*
    // resolved address isn't a plain public unicast IP — and it doesn't special-case
    // the NAT64 well-known prefix, so it misclassifies these synthetic (but publicly
    // routable) addresses as "private" and throws "resolved to private ip", even
    // though remotePatterns above already restricts fetches to our 4 trusted hosts.
    // This flag turns off only that DNS-based check; format/size optimization and
    // caching still run normally for every remote image.
    dangerouslyAllowLocalIP: true,
  },
};
