import { chromium } from "playwright";
const b = await chromium.launch({channel:"chrome"});
const p = await (await b.newContext()).newPage();
const out = await p.evaluate(() => {
  const inr=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0});
  const c=new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',notation:'compact',maximumFractionDigits:1});
  const show=s=>JSON.stringify(s)+'  codepoints:'+[...s].map(ch=>ch.codePointAt(0).toString(16)).join(',');
  return ['BROWSER formatPrice(30000): '+show(inr.format(30000)),
          'BROWSER compact(5000):      '+show(c.format(5000)),
          'BROWSER compact(200000):    '+show(c.format(200000))].join('\n');
});
console.log(out);
await b.close();
