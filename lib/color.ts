/** Colore del testo (scuro/chiaro) leggibile sopra uno sfondo HEX #RRGGBB. */
export function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if ([r, g, b].some(Number.isNaN)) return "#1F1B17";
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1F1B17" : "#FAF7F2";
}
