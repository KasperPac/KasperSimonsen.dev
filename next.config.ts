import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.kaspersimonsen.dev" }],
        destination: "https://kaspersimonsen.dev/:path*",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // The redesign's temporary home: public to anyone with the link, kept out of search so it doesn't compete with
        // kaspersimonsen.dev.
        source: "/(.*)",
        has: [{ type: "host", value: "new.kaspersimonsen.dev" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
