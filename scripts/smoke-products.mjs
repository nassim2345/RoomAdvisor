const BASE = "http://localhost:3000/api/products";

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
  console.log(`[${label}] ${res.status} (${elapsed}ms)`);
  console.dir(parsed, { depth: 4 });
  return { status: res.status, body: parsed };
}

console.log("=== ERROR CASES ===");
await call("not json", "body invalido");
await call({}, "no analysis");
await call({ analysis: { style: "x" } }, "analysis incompleta");

console.log("\n=== HAPPY PATH ===");
await call(
  {
    analysis: {
      colors: ["#F8F8F8", "#CF1D2D", "#B0744D", "#2B2B2B", "#EFEBE7"],
      style: "Cucina luminosa in stile moderno con accenti caldi",
      dimensions: "circa 20-25 m², soffitto ~2.8m",
      confidence: "high",
    },
  },
  "analisi cucina moderna"
);
