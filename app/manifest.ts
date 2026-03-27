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
        src: "/brand/crumbz-logo.png",
        sizes: "2000x2000",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/crumbz-logo.png",
        sizes: "2000x2000",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
