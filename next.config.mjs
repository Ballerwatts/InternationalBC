/** @type {import('next').NextConfig} */
const nextConfig = {
  // Smaller, self-contained production build — used by the Dockerfile
  // (see fly.toml / Dockerfile for the lowest-cost Fly.io deployment path).
  output: "standalone",
  // Serve WordPress's trailing-slash URLs (/theclub/clubhistory/) directly
  // instead of redirecting them — they are exactly what Google has indexed,
  // and canonical tags consolidate the with/without-slash pair.
  skipTrailingSlashRedirect: true,

  // Old paths that moved. Permanent, so ranking signal follows them.
  async redirects() {
    const moved = (from, to) => [
      { source: from, destination: to, permanent: true },
      { source: `${from}/`, destination: to, permanent: true },
    ];
    return [
      // The bare domain goes to www, as WordPress already did — otherwise
      // once DNS moves, intbbc.org and www.intbbc.org would be two copies of
      // every page. Inert until the domain actually points here.
      {
        // Slashed paths first, so /teams/ibbc-men/ keeps its trailing slash.
        source: "/:path+/",
        has: [{ type: "host", value: "intbbc.org" }],
        destination: "https://www.intbbc.org/:path+/",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "intbbc.org" }],
        destination: "https://www.intbbc.org/:path*",
        permanent: true,
      },
      // The previous version of this app used French paths.
      ...moved("/club", "/theclub/"),
      ...moved("/equipe", "/teams/"),
      { source: "/equipe/:slug", destination: "/teams/:slug/", permanent: true },
      { source: "/equipe/:slug/", destination: "/teams/:slug/", permanent: true },
      // WordPress renamed the men's page in September 2026; the old address
      // was indexed first.
      ...moved("/teams/ibbc-2", "/teams/ibbc-men/"),
    ];
  },
};

export default nextConfig;
