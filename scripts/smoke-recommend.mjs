import { readFileSync, existsSync } from "node:fs";

const RECOMMEND = "http://localhost:3000/api/recommend";
const SHARE = (id) => `http://localhost:3000/api/share/${id}`;

async function streamRecommend(file, label, extra = {}) {
  const img = readFileSync(file).toString("base64");
  const start = Date.now();
  const res = await fetch(RECOMMEND, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images: [`data:image/jpeg;base64,${img}`], ...extra }),
  });
  console.log(`\n[${label}] HTTP ${res.status} ${res.headers.get("content-type")}`);
  if (!res.ok || !res.body) {
    console.log("  body:", await res.text());
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];
  let firstEventMs = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      let event = null;
      let data = null;
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data = line.slice(5).trim();
      }
      if (!event) continue;
      if (firstEventMs === null) firstEventMs = Date.now() - start;
      const parsed = data ? JSON.parse(data) : null;
      events.push({ event, parsed, at: Date.now() - start });
      if (event === "analysis")
        console.log(`  +${Date.now() - start}ms analysis: ${parsed.style}`);
      else if (event === "product")
        console.log(`  +${Date.now() - start}ms product: ${parsed.category} — ${parsed.name} (${parsed.price})`);
      else if (event === "shared")
        console.log(`  +${Date.now() - start}ms shared id: ${parsed.id}`);
      else if (event === "error")
        console.log(`  +${Date.now() - start}ms ERROR ${parsed.code}: ${parsed.message}`);
      else if (event === "done")
        console.log(`  +${Date.now() - start}ms done (totale ${Date.now() - start}ms)`);
    }
  }
  return events;
}

// 1) NOT_A_ROOM
if (existsSync("not-a-room.jpg")) {
  const ev = await streamRecommend("not-a-room.jpg", "NON-STANZA");
  const hasAnalysis = ev?.some((e) => e.event === "analysis");
  const hasNotRoom = ev?.some((e) => e.event === "error" && e.parsed.code === "NOT_A_ROOM");
  console.log(`  => analysis assente: ${!hasAnalysis}, NOT_A_ROOM: ${hasNotRoom}`);
}

// 2) Happy path + share roundtrip
if (existsSync("test-room.jpg")) {
  const ev = await streamRecommend("test-room.jpg", "STANZA REALE", { budget: 300 });
  const shared = ev?.find((e) => e.event === "shared");
  if (shared) {
    const res = await fetch(SHARE(shared.parsed.id));
    const body = await res.json();
    console.log(`\n[SHARE ${shared.parsed.id}] HTTP ${res.status}`);
    console.log(`  analysis.style: ${body.analysis?.style}`);
    console.log(`  products: ${body.products?.length}`);
  }
  // share inesistente
  const res404 = await fetch(SHARE("inesistente-123"));
  console.log(`[SHARE inesistente] HTTP ${res404.status} (atteso 404)`);
}
