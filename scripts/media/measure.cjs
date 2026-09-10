const sharp = require("sharp");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  const p = join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.(jpg|jpeg|png)$/i.test(e.name)) files.push(p); } };
walk("public/images");
(async () => {
  let over = 0, bytes = 0; const widths = {};
  for (const f of files) {
    bytes += statSync(f).size;
    try {
      const m = await sharp(f).metadata();
      const w = m.width ?? 0;
      const band = w > 2400 ? ">2400" : w > 1920 ? "1921-2400" : w > 1200 ? "1201-1920" : "<=1200";
      widths[band] = (widths[band] || 0) + 1;
      if (w > 1920) over++;
    } catch {}
  }
  console.log("  files:", files.length, "| total:", (bytes / 1048576).toFixed(0), "MB");
  console.log("  wider than 1920px:", over);
  console.log("  width bands:", JSON.stringify(widths));
})();
