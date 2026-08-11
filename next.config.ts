import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Enable static exports.
   *
   * @see https://nextjs.org/docs/app/building-your-application/deploying/static-exports
   */
  output: "export",

  /**
   * No basePath: this is a GitHub *user* page, served from the domain root
   * (https://youngwoong-cho.github.io/). A basePath would prefix every asset
   * URL with a path segment that does not exist on disk.
   *
   * @see https://nextjs.org/docs/app/api-reference/next-config-js/basePath
   */

  /**
   * Disable server-based image optimization. Next.js does not support
   * dynamic features with static exports.
   *
   * @see https://nextjs.org/docs/app/api-reference/components/image#unoptimized
   */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;