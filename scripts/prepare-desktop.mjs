// Completa la build "standalone" di Next.js per l'app desktop: Next non copia
// gli asset statici né la cartella public dentro .next/standalone.
import { cpSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error('Build standalone non trovata: esegui prima "npm run build".');
  process.exit(1);
}

const copies = [
  [join(root, ".next", "static"), join(standalone, ".next", "static")],
  [join(root, "public"), join(standalone, "public")],
];
for (const [from, to] of copies) {
  if (!existsSync(from)) continue;
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}

// Le variabili locali non devono mai finire nel pacchetto distribuito.
for (const f of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  rmSync(join(standalone, f), { force: true });
}

console.log("Server desktop pronto in .next/standalone");
