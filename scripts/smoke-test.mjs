import { readFileSync } from "node:fs";

const BASE = "http://localhost:3000/api/analyze";

async function call(body, label) {
  const start = Date.now();
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const elapsed = Date.now() - start;
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  console.log(`[${label}] ${res.status} (${elapsed}ms)`, parsed);
  return { status: res.status, body: parsed };
}

console.log("=== ERROR CASES ===");
await call("not json", "body invalido");
await call({}, "no images");
await call({ images: [] }, "images vuoto");
await call({ images: ["a", "b", "c", "d"] }, "4 immagini");
await call({ images: ["foo"] }, "non data URL");

console.log("\n=== HAPPY PATH ===");
const img = readFileSync("test-room.jpg").toString("base64");
const dataUrl = `data:image/jpeg;base64,${img}`;
await call({ images: [dataUrl] }, "1 foto stanza");
