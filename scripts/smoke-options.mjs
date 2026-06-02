import { readFileSync, existsSync } from "node:fs";

const ANALYZE = "http://localhost:3000/api/analyze";
const PRODUCTS = "http://localhost:3000/api/products";

async function call(url, body, label) {
  const start = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const elapsed = Date.now() - start;
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  console.log(`[${label}] ${res.status} (${elapsed}ms)`);
  console.dir(parsed, { depth: 3 });
  return { status: res.status, body: parsed };
}

console.log("=== BACKWARDS COMPAT ===");
await call(PRODUCTS, { analysis: { colors: ["#FFFFFF"], style: "test", dimensions: "n/d", confidence: "low" } }, "products senza budget");

console.log("\n=== BUDGET INVALIDO ===");
await call(PRODUCTS, { analysis: { colors: ["#FFFFFF"], style: "test", dimensions: "n/d", confidence: "low" }, budget: "xyz" }, "budget invalido");

if (existsSync("test-room.jpg")) {
  const img = readFileSync("test-room.jpg").toString("base64");
  const dataUrl = `data:image/jpeg;base64,${img}`;
  console.log("\n=== ANALYZE CON DIMENSIONS ===");
  await call(ANALYZE, { images: [dataUrl], dimensions: "3x4 metri, soffitto 2.5m" }, "analyze con dims");
}

console.log("\n=== PRODUCTS CON BUDGET 150€ ===");
await call(PRODUCTS, {
  analysis: {
    colors: ["#F8F8F8", "#CF1D2D", "#B0744D"],
    style: "Cucina moderna con accenti caldi",
    dimensions: "circa 20 m²",
    confidence: "high",
  },
  budget: 150,
}, "products budget 150");

console.log("\n=== PRODUCTS CON BUDGET 1200€ ===");
await call(PRODUCTS, {
  analysis: {
    colors: ["#1F1B17", "#FAF7F2"],
    style: "Salotto minimalista contemporaneo",
    dimensions: "circa 30 m²",
    confidence: "high",
  },
  budget: 1200,
}, "products budget 1200");
