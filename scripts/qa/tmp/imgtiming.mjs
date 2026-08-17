import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const routes = ["/", "/stories", "/monasteries"];
const b = await chromium.launch({ channel: "chrome" });

for (const route of routes) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });

  // Scroll the whole page so every lazy image is asked for.
  await page.evaluate(async () => {
    await new Promise((r) => {
      let y = 0;
      const step = () => {
        y += innerHeight * 0.8;
        scrollTo(0, y);
        if (y < document.body.scrollHeight) setTimeout(step, 200);
        else setTimeout(r, 300);
      };
      step();
    });
  });

  // Wait until every image reports complete, or give up at 30s.
  let settled = null;
  for (let i = 0; i < 60; i++) {
    const s = await page.evaluate(() => {
      const imgs = [...document.querySelectorAll("img")];
      return {
        total: imgs.length,
        done: imgs.filter((x) => x.complete && x.naturalWidth > 0).length,
        broken: imgs.filter((x) => x.complete && x.naturalWidth === 0).length,
      };
    });
    if (s.done + s.broken >= s.total) {
      settled = { ...s, ms: Date.now() - t0 };
      break;
    }
    await page.waitForTimeout(500);
  }
  const final = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll("img")];
    return {
      total: imgs.length,
      done: imgs.filter((x) => x.complete && x.naturalWidth > 0).length,
      broken: imgs.filter((x) => x.complete && x.naturalWidth === 0).length,
      bytes: performance
        .getEntriesByType("resource")
        .filter((r) => r.name.includes("/_next/image"))
        .reduce((a, r) => a + (r.transferSize || 0), 0),
      slowest: performance
        .getEntriesByType("resource")
        .filter((r) => r.name.includes("/_next/image"))
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 3)
        .map((r) => `${Math.round(r.duration)}ms ${decodeURIComponent(r.name).split("url=")[1]?.slice(0, 40)}`),
    };
  });
  console.log(
    `${route.padEnd(14)} imgs=${final.total} loaded=${final.done} broken=${final.broken} ` +
      `allSettledAt=${settled ? settled.ms + "ms" : ">30s"} imgBytes=${(final.bytes / 1024 / 1024).toFixed(1)}MB`,
  );
  final.slowest.forEach((s) => console.log(`     slowest: ${s}`));
  await ctx.close();
}
await b.close();
