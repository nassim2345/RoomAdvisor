import { readFileSync } from "node:fs";

const ANALYZE = "http://localhost:3000/api/analyze";

async function analyze(file, label) {
  const img = readFileSync(file).toString("base64");
  const res = await fetch(ANALYZE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: [`data:image/jpeg;base64,${img}`] }),
  });
  const body = await res.json();
  console.log(`[${label}] HTTP ${res.status}`);
  console.dir(body, { depth: 3 });
}

console.log("=== NON-STANZA (atteso 422 NOT_A_ROOM) ===");
await analyze("not-a-room.jpg", "gatto");

console.log("\n=== STANZA REALE (atteso 200, nessun falso positivo) ===");
await analyze("test-room.jpg", "cucina");
