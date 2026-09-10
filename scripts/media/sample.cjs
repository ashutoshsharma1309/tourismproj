const sharp = require("sharp");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.(jpg|jpeg)$/i.test(e.name)) files.push(p); } };
walk("public/images");
const sample = files.sort((a,b)=>statSync(b).size-statSync(a).size).slice(0, 12);
(async () => {
  let before = 0, jpegAfter = 0, avifAfter = 0;
  for (const f of sample) {
    const b = statSync(f).size; before += b;
    const j = await sharp(f).resize(1920, null, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    const a = await sharp(f).resize(1920, null, { fit: "inside", withoutEnlargement: true })
      .avif({ quality: 62 }).toBuffer();
    jpegAfter += j.length; avifAfter += a.length;
  }
  const mb = (n) => (n / 1048576).toFixed(1);
  console.log(`  sample of ${sample.length} largest`);
  console.log(`  before        ${mb(before)} MB`);
  console.log(`  jpeg q72      ${mb(jpegAfter)} MB  (${Math.round((1-jpegAfter/before)*100)}% smaller)`);
  console.log(`  avif q62      ${mb(avifAfter)} MB  (${Math.round((1-avifAfter/before)*100)}% smaller)`);
})();
