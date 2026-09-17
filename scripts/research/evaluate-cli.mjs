/**
 * node scripts/research/evaluate-cli.mjs [--live]
 *
 * Without --live: runs the ten fixture cases through the verifier.
 * With --live:    additionally runs the real provider, if a key exists.
 */
import { runFixtures, runLive } from "./evaluate.mjs";
import { listProviders } from "./provider.mjs";

console.log("\nProviders");
for (const p of listProviders()) console.log(`  ${p.name.padEnd(12)} ${p.available ? "AVAILABLE" : "UNAVAILABLE"}`);

console.log("\nFIXTURE MODE — measures the verifier, not any model\n");
const f = runFixtures();
for (const r of f.rows) {
  const mark = r.ok ? "ok  " : "MISS";
  console.log(`  ${mark} ${String(r.id).padStart(2)}. ${r.name.padEnd(42)} expect=${r.expect.padEnd(6)} got=${r.outcome.padEnd(6)} ${r.reasons.join(",")}`);
}
console.log(`\n  verifier accuracy: ${f.correct}/${f.total} (${Math.round(f.accuracy * 100)}%)\n`);

if (process.argv.includes("--preflight")) {
  const { preflight } = await import("./evaluate.mjs");
  const r = await preflight();
  console.log("PRE-FLIGHT");
  if (r.ok) {
    console.log(`  OK — ${r.model} responded in ${r.latencyMs}ms (stop_reason: ${r.stopReason})`);
    console.log(`  usage: ${JSON.stringify(r.usage)}`);
    console.log("\n  The credential works. Run: npm run research:evaluate -- --live\n");
  } else {
    console.log(`  BLOCKED at ${r.stage}: ${r.detail}`);
    console.log("\n  Live evaluation cannot run.\n");
  }
  process.exit(r.ok ? 0 : 1);
}

if (process.argv.includes("--live")) {
  console.log("LIVE MODE — measures the model\n");
  for (const d of ["sikkim", "jaipur"]) {
    const m = await runLive({ destinationId: d });
    if (!m.executed) {
      console.log(`  ${d.padEnd(8)} NOT EXECUTED — ${m.reason}`);
      continue;
    }
    const pct = (v) => (v === null || v === undefined ? "n/a" : `${Math.round(v * 100)}%`);
    console.log(`  ${d.padEnd(8)} model=${m.model} prompt=${m.promptVersion} claimSet=${m.claimSetVersion}`);
    console.log(`  ${" ".repeat(8)} calls=${m.calls} sentences=${m.totalSentences} accepted=${m.accepted} rejected=${m.rejected}`);
    console.log(`  ${" ".repeat(8)} SURVIVAL=${pct(m.survivalRate)}  COMPOSITION=${pct(m.compositionRatio)}  unsupported=${pct(m.unsupportedRate)}  practical=${pct(m.practicalRate)}`);
    console.log(`  ${" ".repeat(8)} rejections=${JSON.stringify(m.rejections)} conflictExclusions=${m.conflictExclusions}`);
    console.log(`  ${" ".repeat(8)} latency=${m.avgLatencyMs ?? "n/a"}ms tokens=${m.inputTokens}in/${m.outputTokens}out cacheRead=${m.cacheReadTokens}`);
    console.log(`  ${" ".repeat(8)} cost=${m.estimatedCostUsd === null ? "n/a" : `$${m.estimatedCostUsd}`} perNarrative=${m.costPerNarrativeUsd === null ? "n/a" : `$${m.costPerNarrativeUsd}`}`);
    for (const t of m.tasks) {
      if (t.skipped) { console.log(`  ${" ".repeat(10)} ${t.task.padEnd(22)} skipped — ${t.skipped}`); continue; }
      if (t.error) { console.log(`  ${" ".repeat(10)} ${t.task.padEnd(22)} FAILED — ${t.error}`); continue; }
      console.log(`  ${" ".repeat(10)} ${t.task.padEnd(22)} survival=${pct(t.survival)} composition=${pct(t.quality?.compositionRatio)} coverage=${pct(t.quality?.coverage)} ${t.latencyMs}ms`);
    }
  }
  console.log("");
} else {
  console.log("LIVE MODE not requested. Pass --live to measure a real model (requires ANTHROPIC_API_KEY).\n");
}
