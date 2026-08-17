import { chromium } from "playwright";

const b = await chromium.launch({ channel: "chrome" });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto("http://localhost:3000/", { waitUntil: "networkidle" });

// Slow, human-like scroll all the way down.
await p.evaluate(async () => {
  await new Promise((r) => {
    let y = 0;
    const step = () => {
      y += 400;
      scrollTo(0, y);
      if (y < document.body.scrollHeight) setTimeout(step, 250);
      else setTimeout(r, 1500);
    };
    step();
  });
});
await p.waitForTimeout(2500);

const diag = await p.evaluate(() => {
  return [...document.querySelectorAll("img")]
    .filter((el) => !el.complete || el.naturalWidth === 0)
    .map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      // Walk up looking for whatever is suppressing it.
      const chain = [];
      let n = el.parentElement;
      for (let i = 0; i < 6 && n; i++, n = n.parentElement) {
        const s = getComputedStyle(n);
        chain.push(
          `${n.tagName.toLowerCase()}[${String(n.className).slice(0, 45)}] op=${s.opacity} vis=${s.visibility} disp=${s.display} tr=${s.transform.slice(0, 22)} ch=${s.contentVisibility ?? "-"}`,
        );
      }
      return {
        src: decodeURIComponent(el.currentSrc || el.src).split("url=")[1]?.slice(0, 38),
        complete: el.complete,
        naturalWidth: el.naturalWidth,
        loading: el.getAttribute("loading"),
        box: `${Math.round(r.width)}x${Math.round(r.height)} @y=${Math.round(r.top + scrollY)}`,
        selfOpacity: cs.opacity,
        chain,
      };
    });
});

console.log(`scrollHeight=${await p.evaluate(() => document.body.scrollHeight)}`);
console.log(`incomplete images: ${diag.length}\n`);
for (const d of diag) {
  console.log(`- ${d.src}  complete=${d.complete} nW=${d.naturalWidth} loading=${d.loading} box=${d.box} selfOp=${d.selfOpacity}`);
  d.chain.forEach((c) => console.log(`     ^ ${c}`));
  console.log();
}
await b.close();
