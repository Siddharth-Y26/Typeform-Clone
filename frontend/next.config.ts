import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating Next.js badge in development; it covers the bottom-left of the builder.
  devIndicators: false,

  // Tells Turbopack (the bundler) to run every CSS file through Tailwind.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
