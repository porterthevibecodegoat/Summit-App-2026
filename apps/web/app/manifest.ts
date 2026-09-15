import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { id: "/", name: "notalonesummit.org", short_name: "Not Alone", description: "The Not Alone Summit attendee experience.", start_url: "/", display: "standalone", background_color: "#fff9f1", theme_color: "#8177c9", icons: [{ src: "/icf-mark.png", sizes: "72x72", type: "image/png", purpose: "any" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }] };
}
