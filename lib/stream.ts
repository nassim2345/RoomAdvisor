/**
 * Formatta un evento Server-Sent Events (SSE).
 * Ogni evento: `event: <type>\ndata: <json>\n\n`
 */
export function formatSse(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}
