import type { MetadataRoute } from "next";

// Rende l'app web installabile dal browser (Chrome/Edge: icona "Installa"
// nella barra degli indirizzi; Safari iOS: Condividi → Aggiungi a Home).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoomAdvisor",
    short_name: "RoomAdvisor",
    description: "Carica le foto della tua stanza: stile, palette e arredi da comprare.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#FAF7F2",
    lang: "it",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
