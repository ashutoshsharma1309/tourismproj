/**
 * The whole QA battery, in one command.
 *
 *   npm run build && npm run start        # in another shell
 *   npm run qa:final
 *
 * WHY A RUNNER AND NOT A SHELL LOOP
 * ---------------------------------
 * There are twenty-four suites, they report in three different formats, some
 * read build output and some drive a browser, and the run order matters — a
 * suite that reads `.next/server/app` must not run after a server has started
 * re-rendering pages into it (Phase 11 §20). A loop that printed exit codes
 * would hide all of that. This prints one table with the counts each suite
 * actually reported, and it never converts a failure into a pass.
 *
 * ENVIRONMENTAL is a category, not an excuse: a suite may only carry that
 * flag once its failure has been reproduced, diagnosed and written down in
 * docs/, with the assertion left in place. As of Phase 16 no suite carries
 * it — the last one that did was fixed rather than excused.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";

/** No single suite may exceed this. The slowest honest suite is ~7 minutes. */
const SUITE_TIMEOUT_MS = Number(process.env.QA_SUITE_TIMEOUT_MS ?? 900_000);

/**
 * `reads` describes what a suite needs:
 *   "build"  — reads .next build output; run BEFORE a server starts
 *   "server" — needs the site served at BASE
 *   "static" — neither
 */
const SUITES = [
  { name: "qa:route-migration", script: "scripts/qa/route-migration.mjs", reads: "build" },
  { name: "qa:destination", script: "scripts/qa/destination-integrity.mjs", reads: "build" },
  { name: "qa:global-explore", script: "scripts/qa/global-explore-integrity.mjs", reads: "build" },
  { name: "qa:experience", script: "scripts/qa/experience-integrity.mjs", reads: "build" },
  { name: "qa:decision", script: "scripts/qa/decision-integrity.mjs", reads: "static" },
  { name: "qa:research", script: "scripts/qa/research-integrity.mjs", reads: "static" },
  { name: "qa:narrative", script: "scripts/qa/narrative-integrity.mjs", reads: "static" },
  { name: "qa:publishing", script: "scripts/qa/publishing-integrity.mjs", reads: "static" },
  { name: "qa:composition", script: "scripts/qa/composition-integrity.mjs", reads: "static" },
  { name: "qa:resilience", script: "scripts/qa/resilience-integrity.mjs", reads: "static" },
  { name: "qa:heritage", script: "scripts/qa/heritage-integrity.mjs", reads: "static" },
  /* Reads the retrieval records and the files on disk; needs no server. */
  { name: "qa:media", script: "scripts/qa/media-integrity.mjs", reads: "static" },
  { name: "qa:media-provenance", script: "scripts/qa/media-provenance.mjs", reads: "static" },
  /* From the sibling session: stays never carry a price/rating/phone; search shortcuts name their destination. */
  { name: "qa:stays", script: "scripts/qa/stays-integrity.mjs", reads: "static" },
  { name: "qa:search", script: "scripts/qa/search-scope.mjs", reads: "server" },
  { name: "qa:integrity", script: "scripts/qa/integrity.mjs", reads: "static" },
  { name: "qa:industry", script: "scripts/qa/industry-integrity.mjs", reads: "static" },
  { name: "qa:gallery", script: "scripts/qa/gallery-integrity.mjs", reads: "static" },
  { name: "qa:planner", script: "scripts/qa/planner-integrity.mjs", reads: "server" },
  { name: "qa:discovery", script: "scripts/qa/discovery-integrity.mjs", reads: "server" },
  { name: "qa:global-intelligence", script: "scripts/qa/global-intelligence.mjs", reads: "server" },
  { name: "qa:content-framework", script: "scripts/qa/content-framework.mjs", reads: "server" },
  { name: "qa:capsules", script: "scripts/qa/capsules.mjs", reads: "server" },
  { name: "qa:global-capsules", script: "scripts/qa/global-capsules.mjs", reads: "server" },
  { name: "qa:culture", script: "scripts/qa/culture.mjs", reads: "server" },
  { name: "qa:ux", script: "scripts/qa/ux.mjs", reads: "server" },
  { name: "qa:demo", script: "scripts/qa/demo.mjs", reads: "server" },
  { name: "qa:release", script: "scripts/qa/release-audit.mjs", reads: "server" },
  { name: "qa:product-flow", script: "scripts/qa/product-flow.mjs", reads: "server" },
  { name: "qa:journey", script: "scripts/qa/journey.mjs", reads: "server" },
  { name: "qa:intelligence", script: "scripts/qa/intelligence.mjs", reads: "server" },
  { name: "qa:flows", script: "scripts/qa/flows.mjs", reads: "server" },
  { name: "qa:industry-flows", script: "scripts/qa/industry-flows.mjs", reads: "server" },
  { name: "qa:immersive", script: "scripts/qa/immersive.mjs", reads: "server" },
  { name: "qa:stories", script: "scripts/qa/stories.mjs", reads: "server" },
  { name: "qa:culture-module", script: "scripts/qa/culture-module.mjs", reads: "server" },
  { name: "qa:history", script: "scripts/qa/history.mjs", reads: "server" },
  { name: "qa:archive", script: "scripts/qa/archive.mjs", reads: "server" },
  { name: "qa:responsive", script: "scripts/qa/responsive.mjs", reads: "server" },
  { name: "qa:a11y", script: "scripts/qa/a11y.mjs", reads: "server" },
  /*
   * qa:stories-map used to be listed here with an `environmental` exemption
   * for its MAP → STORY check. Phase 16 diagnosed that failure properly — the
   * navigation waited on `networkidle` while a live Leaflet map kept fetching
   * tiles, so the wait, not the product, was wrong — and fixed the
   * precondition without touching the assertion. It now passes 46/46, so the
   * exemption is gone. Nothing in this runner is pre-excused today.
   */
  { name: "qa:stories-map", script: "scripts/qa/stories-map-flows.mjs", reads: "server" },
  /* The partner programme: lifecycle, commission arithmetic, validation,
     security boundaries against the server, and — when a database and
     Supabase are configured — the whole apply → review → publish → referral
     flow. A TypeScript suite, run through tsx like qa:india. */
  { name: "qa:partners", script: "scripts/qa/partners.mts", reads: "server", runner: "tsx" },
  /* Accounts, travel history and personalization: the engine on real
     knowledge, event mapping, code guarantees, signed-out boundaries, and
     with a database the full traveller flow including user-to-user isolation. */
  { name: "qa:accounts", script: "scripts/qa/accounts.mts", reads: "server", runner: "tsx" },
  /* Booking: stay and money rules, the hold engine under real parallel
     transactions, expiry, and search → listing → hold → checkout in a browser. */
  { name: "qa:booking", script: "scripts/qa/booking.mts", reads: "server", runner: "tsx" },
  /* Plans, entitlements and the gates they drive, enforced server-side. */
  { name: "qa:subscriptions", script: "scripts/qa/subscriptions.mts", reads: "server", runner: "tsx" },
  /* The government console: jurisdiction, verification decisions, advisories. */
  { name: "qa:government", script: "scripts/qa/government.mts", reads: "server", runner: "tsx" },
  /* The TerraStory Guide: tools, grounding, refusals, voice, and the panel. */
  { name: "qa:guide-assistant", script: "scripts/qa/guide-assistant.mts", reads: "server", runner: "tsx" },
];

/** Suites report in three formats; all three are parsed, none is assumed. */
function parseCounts(output) {
  const passFail = output.match(/(\d+) passed,\s*(\d+) failed/);
  if (passFail) return { passed: Number(passFail[1]), failed: Number(passFail[2]) };

  const slash = output.match(/(\d+)\s*\/\s*(\d+)\s*(?:checks )?passed/);
  if (slash) {
    const passed = Number(slash[1]);
    const total = Number(slash[2]);
    return { passed, failed: Math.max(0, total - passed) };
  }

  const a11y = output.match(/Aggregate violations by rule:\s*([\s\S]*)$/);
  if (a11y) {
    const violations = (output.match(/violations: [1-9]/g) ?? []).length;
    const routes = (output.match(/^ok\s+\//gm) ?? []).length;
    return { passed: routes, failed: violations };
  }
  return null;
}

/* `--only a,b` runs a subset. The full battery is the default; the subset is
   for re-verifying the suites a previous run flagged, without paying for the
   twenty that already passed. */
const onlyIndex = process.argv.indexOf("--only");
const only = onlyIndex > -1 ? (process.argv[onlyIndex + 1] ?? "").split(",").filter(Boolean) : [];
const selected = only.length
  ? SUITES.filter((suite) => only.some((name) => suite.name.includes(name)))
  : SUITES;

const results = [];
const started = Date.now();

for (const suite of selected) {
  if (!existsSync(suite.script)) {
    results.push({ ...suite, status: "MISSING", passed: 0, failed: 0, detail: suite.script });
    continue;
  }
  process.stdout.write(`running ${suite.name}… `);
  const startedSuite = Date.now();
  /*
   * `detached: true` puts the suite in its own process GROUP, and the timeout
   * kill therefore reaches its Chromium children too.
   *
   * Measured in Phase 16: killing only the node process left orphaned browsers
   * running, which then loaded the machine enough to crash the NEXT two suites
   * — a11y died mid-run and stories-map recorded a connection reset. A killed
   * suite must take its own children with it, or one stall becomes three
   * failures and the table lies about where the problem is.
   */
  /* A `.mts` suite runs through tsx (path aliases, TypeScript); the rest
     through node, as before. */
  const [command, args] = suite.runner === "tsx"
    ? ["node_modules/.bin/tsx", [suite.script]]
    : ["node", [suite.script]];
  const run = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, QA_BASE_URL: BASE },
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
    timeout: SUITE_TIMEOUT_MS,
    killSignal: "SIGKILL",
    detached: true,
  });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  const exitCode = run.status ?? (run.error ? 1 : 0);
  const timedOut = run.signal === "SIGKILL" || run.error?.code === "ETIMEDOUT";
  const suiteSeconds = Math.round((Date.now() - startedSuite) / 1000);

  const counts = parseCounts(output) ?? { passed: 0, failed: exitCode === 0 ? 0 : 1 };
  const failingLines = output.split("\n").filter((line) => /^\s*(FAIL|✗)/.test(line));

  let status = exitCode === 0 && counts.failed === 0 ? "PASS" : "FAIL";
  let detail = counts.failed > 0 ? (failingLines[0] ?? "").trim().slice(0, 90) : "";

  if (timedOut) {
    status = "TIMEOUT";
    detail = `killed after ${Math.round(SUITE_TIMEOUT_MS / 1000)}s`;
  } else if (status === "FAIL" && failingLines.length === 0) {
    /* The suite threw before reporting. Say what it said, rather than
       printing a bare 0/1 and leaving the reader to guess. */
    const lines = output.trim().split("\n").filter(Boolean);
    detail = (lines[lines.length - 1] ?? "no output").trim().slice(0, 90);
  }

  if (
    status === "FAIL" &&
    suite.environmental &&
    failingLines.length > 0 &&
    failingLines.every((line) => suite.environmental.check.test(line))
  ) {
    status = "ENVIRONMENTAL";
    detail = suite.environmental.why;
  }

  results.push({ ...suite, status, ...counts, detail, seconds: suiteSeconds });
  console.log(`${status} (${suiteSeconds}s)`);
}

const totals = results.reduce(
  (acc, r) => ({
    passed: acc.passed + r.passed,
    failed: acc.failed + r.failed,
    suitesPassed: acc.suitesPassed + (r.status === "PASS" ? 1 : 0),
    suitesFailed: acc.suitesFailed + (r.status === "FAIL" ? 1 : 0),
    suitesEnvironmental: acc.suitesEnvironmental + (r.status === "ENVIRONMENTAL" ? 1 : 0),
    suitesMissing: acc.suitesMissing + (r.status === "MISSING" ? 1 : 0),
    suitesTimedOut: acc.suitesTimedOut + (r.status === "TIMEOUT" ? 1 : 0),
  }),
  {
    passed: 0,
    failed: 0,
    suitesPassed: 0,
    suitesFailed: 0,
    suitesEnvironmental: 0,
    suitesMissing: 0,
    suitesTimedOut: 0,
  },
);

console.log(`\n${"".padEnd(78, "=")}`);
console.log("FINAL QA BATTERY");
console.log("".padEnd(78, "="));
for (const r of results) {
  const counts = `${r.passed}/${r.passed + r.failed}`;
  console.log(
    `${r.status.padEnd(14)} ${r.name.padEnd(24)} ${counts.padStart(9)} ${String(r.seconds ?? 0).padStart(5)}s  ${r.detail ?? ""}`,
  );
}
console.log("".padEnd(78, "-"));
console.log(`SUITES          ${results.length}${only.length ? ` (subset: ${only.join(", ")})` : ""}`);
console.log(`PASSED          ${totals.suitesPassed}`);
console.log(`FAILED          ${totals.suitesFailed}`);
console.log(`ENVIRONMENTAL   ${totals.suitesEnvironmental}`);
console.log(`TIMED OUT       ${totals.suitesTimedOut}`);
console.log(`SKIPPED/MISSING ${totals.suitesMissing}`);
console.log(`CHECKS          ${totals.passed} passed, ${totals.failed} failed`);
console.log(`DURATION        ${Math.round((Date.now() - started) / 1000)}s`);
console.log("".padEnd(78, "="));

/* A failing suite fails the command. An environmental one is reported and
   does not, because it has been diagnosed and written down — but it is
   printed on every run so it can never be forgotten. */
process.exit(totals.suitesFailed + totals.suitesMissing + totals.suitesTimedOut === 0 ? 0 : 1);
