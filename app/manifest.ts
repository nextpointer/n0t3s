import type { MetadataRoute } from "next";

// Next serves this at /manifest.webmanifest and auto-adds the <link
// rel="manifest"> tag, so no manual wiring is needed. Icons reuse the
// chrome PNGs that already live in public/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "N0T3S",
    short_name: "N0T3S",
    description: "A simple, fast and minimal note-taking app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Matches the light theme's canvas; what the install splash paints.
    background_color: "#ffffff",
    // Same value the viewport already advertises.
    theme_color: "#71717b",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Maskable duplicates give Android the safe-zone cropped variant.
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
