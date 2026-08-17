import { chromium } from "playwright";
const b = await chromium.launch({channel:"chrome"});
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
p.on("console", m => console.log(`[${m.type()}]`, m.text().slice(0,700)));
p.on("pageerror", e => console.log("[pageerror]", String(e).slice(0,1500)));
await p.goto("http://localhost:3000/planner",{waitUntil:"networkidle"});
await p.waitForTimeout(3000);
await b.close();
