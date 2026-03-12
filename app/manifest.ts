import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "crumbz",
    short_name: "crumbz",
    description: "the crumbz student brand app.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffaf4",
    theme_color: "#FE8A01",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
