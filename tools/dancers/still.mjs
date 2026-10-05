// Render one frame of a dance to PNG, on the splash card's colour.
//   node still.mjs DANCE.json FRAME OUT.png [scale]
// Needs playwright-core and lottie_light.min.js (from lottie-web) beside it.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
const [file, frame, out, scale = "4"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
const page = await browser.newPage({ viewport: { width: 500, height: 800 }, deviceScaleFactor: Number(scale) });
await page.setContent(`<html><body style="margin:0;background:#ececaa"><div id="s" style="width:500px;height:800px"></div></body></html>`);
await page.addScriptTag({ content: readFileSync(new URL("./lottie_light.min.js", import.meta.url), "utf8") });
await page.evaluate(([d, f]) => { const a = lottie.loadAnimation({ container: document.getElementById("s"), renderer: "svg", loop: false, autoplay: false, animationData: JSON.parse(d) }); a.goToAndStop(Number(f), true); }, [readFileSync(file, "utf8"), frame]);
await page.screenshot({ path: out });
await browser.close();
