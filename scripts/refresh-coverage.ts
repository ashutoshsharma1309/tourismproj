import { refreshAllCoverage } from "@/lib/coverage";

async function main() {
  const results = await refreshAllCoverage();
  console.log("\n  coverage recomputed");
  for (const r of results.sort((a, b) => b.score - a.score)) {
    console.log(`    ${String(r.score).padStart(3)}  ${r.name}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
