import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "crumbz",
    short_name: "crumbz",
    description: "the crumbz student brand app.",
    start_url: "/",
    display: "standalone",
    background_color: "#FE8A01",
    theme_color: "#FE8A01",
    icons: [
      {
        src: "/brand/onboarding-page-exact.png",
        sizes: "1080x1920",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/onboarding-page-exact.png",
        sizes: "1080x1920",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
