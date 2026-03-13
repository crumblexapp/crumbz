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
        src: "/brand/crumbz-app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      {
        src: "/brand/crumbz-app-icon.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
