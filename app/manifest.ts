import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tiza · Bitácora docente",
    short_name: "Tiza",
    description: "Bitácora digital para maestros de primaria.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F3EB",
    theme_color: "#2C3D4C",
    lang: "es",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
