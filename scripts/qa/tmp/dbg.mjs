import { chromium } from "playwright";
const b = await chromium.launch({channel:"chrome"});
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto("http://localhost:3000/stories",{waitUntil:"networkidle"});
const info = await p.evaluate(() => {
  return [...document.querySelectorAll("a[href^='/stories/']")].slice(0,4).map(a=>{
    const r=a.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const top=document.elementFromPoint(cx,cy);
    return {
      href:a.getAttribute("href"),
      box:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},
      center:{cx:Math.round(cx),cy:Math.round(cy)},
      topEl: top ? top.tagName+"."+String(top.className).slice(0,70) : null,
      topIsInsideLink: top ? a.contains(top) : false,
    };
  });
});
console.log(JSON.stringify(info,null,2));
await b.close();
