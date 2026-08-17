import { chromium } from "playwright";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const axePath = require.resolve("axe-core/axe.min.js");
const BASE="http://localhost:3001";
const b = await chromium.launch({channel:"chrome"});
for (const route of ["/","/monasteries","/monasteries/rumtek","/hotels","/preservation"]) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  const p = await ctx.newPage();
  try{
    await p.goto(BASE+route,{waitUntil:"domcontentloaded",timeout:30000});
    await p.waitForTimeout(2500);
    await p.addScriptTag({path:axePath});
    const v = await p.evaluate(async()=>{
      const r = await axe.run(document,{resultTypes:["violations"],
        runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}});
      return r.violations.map(x=>({id:x.id,impact:x.impact,n:x.nodes.length,
        help:x.help, t:x.nodes.slice(0,2).map(n=>n.target.join(" ")).join(" | ")}));
    });
    const bad=v.filter(x=>["critical","serious"].includes(x.impact));
    console.log(`${bad.length?"FAIL":"ok  "} ${route.padEnd(24)} total:${v.length} serious+:${bad.length}`);
    v.forEach(x=>console.log(`      [${x.impact}] ${x.id} x${x.n} — ${x.help}\n          ${x.t.slice(0,110)}`));
  }catch(e){console.log("ERR",route,String(e).split("\n")[0].slice(0,80));}
  await ctx.close();
}
await b.close();
