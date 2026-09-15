import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "Not Alone Summit 2026", short_name: "Not Alone", description: "The Not Alone Summit attendee experience.", start_url: "/", display: "standalone", background_color: "#f4efe6", theme_color: "#0d1632", icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png" }] };
}
