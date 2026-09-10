/**
 * Ingest tourism facts from the Sikkim Tourism & Civil Aviation Department site.
 *
 * WHAT THIS IS NOT
 * ----------------
 * It is not a mirror and it does not publish anything. Every record it writes
 * lands in reports/ingest/ with `verificationStatus: "PENDING_REVIEW"`, and a
 * person has to move it into src/data before a visitor ever sees it. Nothing
 * here overwrites production data.
 *
 * WHY IT RENDERS INSTEAD OF FETCHING
 * ----------------------------------
 * sikkimtourism.gov.in is an Angular application whose entire content is inside
 * a single 857 KB JavaScript bundle. It makes no XHR or fetch calls at all —
 * there is no JSON API behind it to ask politely. `curl` returns an app shell
 * with none of the content in it, so the only way to read what the department
 * publishes is to let the page render and read the DOM.
 *
 * WHAT IS WORTH TAKING
 * --------------------
 * The portal exposes 19 routes. Most of the value for a heritage platform is in
 * six of them, and a good part of the rest is administrative — notices,
 * tenders, RTI — which is explicitly out of scope. There are NO monastery pages
 * and NO destination detail pages on the portal: names like Rumtek and
 * Gurudongmar appear only as menu labels. So this ingest deliberately does not
 * try to source monastery content, because the department does not publish any.
 *
 *   node scripts/ingest-sikkim-tourism.mjs
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const ORIGIN = "https://sikkimtourism.gov.in";
const OUT_DIR = "reports/ingest";
const SOURCE_NAME = "Tourism & Civil Aviation Department, Government of Sikkim";

/**
 * The allowlist. `category` is the classification the record carries forward;
 * anything not named here is not fetched at all, which is a stronger filter
 * than fetching and discarding.
 */
const ROUTES = [
  { path: "/do-and-do-not", category: "RESPONSIBLE_TOURISM", extract: "guidelines" },
  { path: "/pap", category: "TRAVEL", extract: "permits" },
  { path: "/rap", category: "TRAVEL", extract: "permits" },
  { path: "/registered-establishments/hotels", category: "TOURISM", extract: "table" },
  { path: "/registered-establishments/travel-agents", category: "TOURISM", extract: "table" },
  { path: "/tic", category: "TRAVEL", extract: "prose" },
  { path: "/about/dances", category: "CULTURE", extract: "prose" },
  { path: "/about/cuisine", category: "FOOD", extract: "prose" },
  { path: "/about/weather", category: "TRAVEL", extract: "prose" },
];

/* Routes deliberately excluded, recorded so the omission is auditable. */
const EXCLUDED = [
  { path: "/updates/notice", reason: "Departmental notices — administrative, not tourism or heritage." },
  { path: "/updates/tender", reason: "Procurement tenders — administrative." },
  { path: "/updates/newsletter", reason: "Departmental newsletter — promotional." },
  { path: "/rti", reason: "Right to Information contacts — administrative." },
  { path: "/contact-us", reason: "Departmental contact details — administrative." },
  { path: "/about/sikkim", reason: "General state overview; duplicates material the archive already sources to Wikipedia and covers in more depth." },
];

/**
 * Site chrome repeated on every page. The portal renders its whole nav as list
 * items, so a naive `li` sweep returns the menu on every single route.
 */
const CHROME = [
  /^About\s+Sikkim\s+Weather/i,
  /^Permit Services/i,
  /^Registered Establishments/i,
  /^Updates/i,
  /official website of the Tourism & Civil Aviation Department/i,
  /^Quick Links/i,
  /^Follow Us/i,
  /^Copyright/i,
];
const isChrome = (t) => CHROME.some((re) => re.test(t));

/**
 * Walk a paginated register to the end.
 *
 * The hotel register renders 25 rows at a time and reports "Showing 25 of 907
 * results" — so a single-page read would have understated the register by a
 * factor of thirty-six and published "25 registered hotels" as if it were the
 * whole list. Pagination is a plain Next button; the loop stops when it is
 * disabled, when the first cell stops changing, or at a hard page cap.
 */
async function readPaginatedTable(page, maxPages = 120) {
  const rows = [];
  const seen = new Set();
  let pageNo = 0;

  for (;;) {
    pageNo++;
    const batch = await page.evaluate(() =>
      [...document.querySelectorAll("table tr")].map((tr) =>
        [...tr.cells].map((c) => c.textContent.replace(/\s+/g, " ").trim()),
      ),
    );
    let added = 0;
    for (const r of batch) {
      if (r.length < 4) continue;
      const key = r.join("\u0001");
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
      added++;
    }

    const next = page.locator('button[aria-label="Next page"]');
    const canGo =
      (await next.count()) > 0 &&
      (await next.first().isEnabled().catch(() => false));
    if (pageNo >= maxPages) {
      process.stdout.write(`\n    ! page cap ${maxPages} reached — register is longer than this read\n`);
      break;
    }
    if (!canGo || added === 0) break;

    await next.first().click();
    await page.waitForTimeout(700);
  }
  return { rows, pages: pageNo };
}

const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({
  userAgent:
    "SikkimDarshanIngest/1.0 (heritage archive; contact via repository) Chrome/131.0",
});
const page = await context.newPage();

const records = [];
const retrievedAt = new Date().toISOString().slice(0, 10);

/*
 * Chrome is detected by repetition, not by pattern.
 *
 * The portal renders its entire navigation — and its footer, and an "Important
 * Links" block — as list items on every route, so a pattern list never keeps up:
 * the first pass filtered the concatenated menu blocks but still admitted
 * "Protected Area Permit (PAP)" and "Right to Information" as if they were
 * responsible-tourism guidance. Anything that appears on three or more
 * different routes is furniture, whatever it says.
 */
const seenOn = new Map();
const raw = [];

for (const route of ROUTES) {
  const url = ORIGIN + route.path;
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(2000);
  } catch {
    process.stdout.write("UNREACHABLE\n");
    continue;
  }

  let paginated = null;
  if (route.extract === "table") {
    const reported = await page.evaluate(() => {
      const m = document.body.innerText.match(/Showing\s+\d+\s+of\s+([\d,]+)\s+results/i);
      return m ? Number(m[1].replace(/,/g, "")) : null;
    });
    paginated = { ...(await readPaginatedTable(page)), reported };
  }

  const payload = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent?.trim() ?? document.title.trim(),
    paras: [...document.querySelectorAll("p")].map((p) => p.textContent.replace(/\s+/g, " ").trim()),
    items: [...document.querySelectorAll("li")].map((l) => l.textContent.replace(/\s+/g, " ").trim()),
    headings: [...document.querySelectorAll("h2,h3")].map((h) => h.textContent.replace(/\s+/g, " ").trim()),
    rows: [...document.querySelectorAll("table tr")].map((tr) =>
      [...tr.cells].map((c) => c.textContent.replace(/\s+/g, " ").trim()),
    ),
    /* Walk the document in order so each list item keeps the heading above it. */
    sections: (() => {
      const out = [];
      let current = null;
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const tag = n.tagName;
        if (/^H[1-4]$/.test(tag)) {
          const h = n.textContent.replace(/\s+/g, " ").trim();
          if (h) { current = { heading: h, items: [], prose: [] }; out.push(current); }
        } else if (tag === "P" && current && !n.closest("li")) {
          /* A section's own prose. The two-wheeler heading carries its single
             most important rule this way — "Engine capacity must be 150 cc or
             higher" — which an LI-only sweep threw away entirely. */
          const t = n.textContent.replace(/\s+/g, " ").trim();
          if (t) current.prose.push(t);
        } else if (tag === "LI" && current && !n.querySelector("li")) {
          const t = n.textContent.replace(/\s+/g, " ").trim();
          /*
           * The department marks each guideline itself with a tick or a cross.
           * That is its own classification and it is the only trustworthy one:
           * section headings like "Smoking & Alcohol" carry no polarity at all,
           * and inferring one from the wording would have published "Smoking
           * near monasteries, temples and sacred places" as advice.
           */
          const svg = n.querySelector("svg");
          const icon = svg
            ? (String(svg.getAttribute("class") || "").match(/lucide-([a-z-]+)/) || [])[1] || null
            : null;
          /*
           * The permit pages render each entry as two sibling paragraphs — the
           * destination, then who issues its permit — which collapse into one
           * run-on string under textContent ("Tsomgo – Baba Mandir Permits are
           * issued by the Police Check Post…"). Keeping the pair split is what
           * makes the entry usable as data rather than as a sentence.
           */
          const ps = [...n.children].filter((c) => c.tagName === "P");
          const pair =
            ps.length >= 2
              ? {
                  label: ps[0].textContent.replace(/\s+/g, " ").trim(),
                  detail: ps
                    .slice(1)
                    .map((c) => c.textContent.replace(/\s+/g, " ").trim())
                    .join(" ")
                    .trim(),
                }
              : null;
          /*
           * Numbered checklists render the ordinal as its own node, so
           * textContent glues it to the label: "2Driving License". A digit
           * followed immediately by a capital with no space is never prose,
           * so it is safe to lift off — and lifting it off is what lets the
           * item be recognised as a checklist entry rather than a sentence.
           *
           * This mattered. The two-wheeler permit checklist lost items 2, 3
           * and 4 — driving licence, pollution certificate, insurance
           * certificate — because the notes filter below drops anything under
           * 30 characters as chrome, and those three are short. The page told
           * riders to bring a registration certificate and photographs and
           * said nothing about a licence or insurance.
           */
          const ordinalMatch = t.match(/^(\d{1,2})(?=[A-Z])/);
          const ordinal = ordinalMatch ? Number(ordinalMatch[1]) : null;
          const text = ordinal === null ? t : t.slice(ordinalMatch[0].length).trim();
          if (text) current.items.push({ text, icon, pair, ordinal });
        }
      }
      return out;
    })(),
  }));

  const base = {
    sourceName: SOURCE_NAME,
    sourceUrl: url,
    sourceType: "government",
    category: route.category,
    retrievedAt,
    lastVerifiedAt: retrievedAt,
    verificationStatus: "PENDING_REVIEW",
  };

  for (const t of new Set([...payload.items, ...payload.paras])) {
    seenOn.set(t, (seenOn.get(t) ?? 0) + 1);
  }
  raw.push({ route, base, payload, paginated });
}

/** Appears on 3+ routes → site furniture. */
const isFurniture = (t) => (seenOn.get(t) ?? 0) >= 3;

for (const { route, base, payload, paginated } of raw) {
  if (route.extract === "table") {
    const all = paginated?.rows ?? payload.rows.filter((r) => r.length > 3);
    const header = all[0] ?? [];
    /* Rows whose name cell is "N/A" are register entries with no publishable
       name — carried through as a count, never as a named property. */
    const body = all
      .slice(1)
      .filter((r) => r.some((c) => c.length > 1))
      .filter((r) => (r[1] ?? "").toUpperCase() !== "N/A");
    const unnamed = all.slice(1).length - body.length;
    records.push({
      ...base,
      kind: "establishment-register",
      title: payload.title,
      header,
      rows: body,
      count: body.length,
      unnamedEntries: unnamed,
      reportedTotal: paginated?.reported ?? null,
      pagesRead: paginated?.pages ?? 1,
    });
    process.stdout.write(
      `  ${route.path} … ${body.length} named of ${paginated?.reported ?? "?"} reported (${paginated?.pages ?? 1} pages)\n`,
    );
  } else if (route.extract === "permits") {
    const sections = (payload.sections ?? [])
      .map((sec) => ({
        heading: sec.heading,
        entries: sec.items
          .filter((it) => it.pair && it.pair.label && it.pair.detail)
          .map((it) => ({ label: it.pair.label, detail: it.pair.detail })),
        /*
         * A numbered item is a checklist entry and is kept whatever its
         * length; the 30-character floor only applies to unnumbered prose,
         * where it is still doing its job of filtering navigation chrome.
         */
        notes: sec.items
          .filter(
            (it) =>
              !it.pair &&
              (it.ordinal !== null || it.text.length > 30) &&
              !isChrome(it.text) &&
              !isFurniture(it.text),
          )
          .map((it) => it.text),
        prose: (sec.prose ?? []).filter(
          (t) => t.length > 20 && !isChrome(t) && !isFurniture(t),
        ),
      }))
      .filter(
        (sec) =>
          (sec.entries.length > 0 || sec.notes.length > 0 || sec.prose.length > 0) &&
          !/important links|information|contact us/i.test(sec.heading),
      );
    const paras = payload.paras.filter((t) => t.length > 60 && !isChrome(t) && !isFurniture(t));
    const total = sections.reduce((n, sec) => n + sec.entries.length + sec.notes.length, 0);
    records.push({ ...base, kind: "permits", title: payload.title, intro: paras, sections, count: total });
    process.stdout.write(`  ${route.path} … ${total} permit entries in ${sections.length} sections\n`);
  } else if (route.extract === "guidelines") {
    /*
     * Sections, not a flat list.
     *
     * A first pass flattened every list item on the page, which silently
     * stripped the thing that gives them meaning: the department groups them
     * under "Please Do" and "Please Don't". Read flat, "Throw garbage into
     * rivers, lakes or valleys" stops being a prohibition and becomes an
     * instruction. Each item now keeps the heading it sat under, and the
     * heading decides its polarity.
     */
    const headingSaysAvoid = /don'?t|avoid|never|restriction|prohibit/i;
    const sections = (payload.sections ?? [])
      .map((sec) => ({
        heading: sec.heading,
        items: sec.items
          .filter(
            (it) =>
              it.text.length > 15 &&
              it.text.length < 400 &&
              !isChrome(it.text) &&
              !isFurniture(it.text) &&
              /* Only items the department actually ticked or crossed. Anything
                 unmarked is navigation or a link, not guidance. */
              (it.icon === "check" || it.icon === "x"),
          )
          .map((it) => ({
            text: it.text,
            polarity:
              it.icon === "x" || headingSaysAvoid.test(sec.heading) ? "avoid" : "do",
          })),
      }))
      .filter((sec) => sec.items.length > 0 && !/important links|information|contact us/i.test(sec.heading));
    const total = sections.reduce((n, sec) => n + sec.items.length, 0);
    records.push({ ...base, kind: "guidelines", title: payload.title, sections, count: total });
    process.stdout.write(`  ${route.path} … ${total} guidelines in ${sections.length} sections\n`);
  } else {
    const paras = payload.paras.filter((t) => t.length > 60 && !isChrome(t) && !isFurniture(t));
    const items = payload.items.filter((t) => t.length > 25 && t.length < 400 && !isChrome(t) && !isFurniture(t));
    records.push({ ...base, kind: "prose", title: payload.title, headings: payload.headings, paragraphs: paras, items, count: paras.length + items.length });
    process.stdout.write(`  ${route.path} … ${paras.length} paragraphs, ${items.length} points\n`);
  }
}

await browser.close();

mkdirSync(OUT_DIR, { recursive: true });
const doc = {
  generatedAt: new Date().toISOString(),
  source: { name: SOURCE_NAME, origin: ORIGIN, type: "government" },
  note:
    "PENDING REVIEW. Nothing in this file is published. A curator must verify each record and move it into src/data before it reaches a visitor. The portal publishes no monastery or destination detail pages, so no monastery content is sourced here.",
  excludedRoutes: EXCLUDED,
  records,
};
writeFileSync(`${OUT_DIR}/sikkim-tourism-pending.json`, `${JSON.stringify(doc, null, 2)}\n`);

const total = records.reduce((n, r) => n + r.count, 0);
process.stdout.write(
  `\n${records.length} routes ingested, ${total} pending items, ${EXCLUDED.length} routes excluded as administrative.\nWrote ${OUT_DIR}/sikkim-tourism-pending.json\n`,
);
