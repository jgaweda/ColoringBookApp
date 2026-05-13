// PWA end-to-end smoke test using Playwright/Chromium.
// Verifies the home view, navigation, canvas mount, bucket fill, brush
// strokes, and undo state. Run via:
//   cd web && python3 -m http.server 8765 &
//   npx --yes playwright@latest install --with-deps chromium
//   node web/tests/smoke.mjs
import { chromium } from "playwright";

const URL = process.env.URL || "http://127.0.0.1:8765/";

(async () => {
  let bad = 0;
  const errors = [];
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 1024 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();

  // Ignore expected 404s for line-art that hasn't been generated yet — the
  // app falls back to a procedural placeholder for those pages.
  const isExpected = (txt) =>
    /404 .*assets\/line-art\//.test(txt) ||
    /Failed to load resource.*404/.test(txt);
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (isExpected(m.text())) return;
    errors.push(`[console] ${m.text()}`);
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("/assets/line-art/")) return;
    errors.push(`[requestfailed] ${url} — ${req.failure()?.errorText}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

  await page.goto(URL, { waitUntil: "networkidle" });

  // Home view — all 15 categories visible.
  await page.waitForSelector(".categories", { timeout: 5000 });
  const rows = await page.$$eval(".category-row", (els) => els.length);
  assert("home shows 15 category rows", rows === 15, `got ${rows}`);

  // Navigate Unicorns → page picker → first page.
  const unicornCard = await page.$("button.cat-hero[aria-label='Unicorns']");
  assert("unicorns hero card present", !!unicornCard);
  await unicornCard.click();
  await page.waitForSelector(".picker-grid", { timeout: 5000 });
  const pageCount = await page.$$eval(".picker-card", (els) => els.length);
  assert("picker shows 6 unicorn pages", pageCount === 6, `got ${pageCount}`);

  await page.click(".picker-card");
  await page.waitForSelector(".stage canvas.line-art", { timeout: 5000 });
  const dims = await page.$$eval(".stage canvas", (els) => els.map((c) => ({ w: c.width, h: c.height })));
  assert("3 canvases mounted", dims.length === 3, `got ${dims.length}`);
  assert("canvases sized", dims.every((d) => d.w > 0 && d.h > 0), JSON.stringify(dims));

  // Bucket-fill: try several tap points so the test isn't flaky against
  // images where the obvious center happens to be a line-art pixel.
  const stage = await page.$(".stage");
  const box = await stage.boundingBox();
  const taps = [
    [0.05, 0.05],  // background corner — the catch-all
    [0.5, 0.5],
    [0.25, 0.75],
    [0.85, 0.15],
  ];
  let filled = false;
  for (const [tx, ty] of taps) {
    await page.mouse.click(box.x + box.width * tx, box.y + box.height * ty);
    await page.waitForTimeout(150);
    filled = await page.evaluate(() => {
      const c = document.querySelector(".stage canvas.paint");
      const ctx = c.getContext("2d");
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
      return false;
    });
    if (filled) break;
  }
  assert("bucket-fill painted at least one pixel", filled);

  // Brush mode: drag a stroke, verify pixels and undo state.
  await page.click("button[data-tool='brush']");
  await page.waitForTimeout(100);
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 200, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  const brushNonEmpty = await page.evaluate(() => {
    const c = document.querySelector(".stage canvas.brush");
    const ctx = c.getContext("2d");
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
    return n;
  });
  assert("brush stroke produced pixels", brushNonEmpty > 50, `n=${brushNonEmpty}`);
  const undoEnabled = await page.$eval("button[data-action='undo']", (b) => !b.disabled);
  assert("undo button enabled after stroke", undoEnabled);

  // Parental gate: tap Share, expect the gate dialog to open with a target hint.
  await page.click("button[data-action='share']");
  await page.waitForSelector("dialog.parental-gate", { timeout: 3000 });
  const gateText = await page.$eval("dialog.parental-gate p", (el) => el.textContent);
  assert("parental gate shown with target prompt", /Press and hold/.test(gateText));
  // Cancel out of the gate without solving it.
  await page.click("dialog.parental-gate [data-action='cancel']");
  await page.waitForFunction(() => !document.querySelector("dialog.parental-gate"), { timeout: 2000 });

  // Settings nav is also gated.
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.click("button[data-action='settings']");
  await page.waitForSelector("button.big-btn", { timeout: 3000 });
  const lockedHeader = await page.$eval(".locked-pane h2", (el) => el.textContent);
  assert("settings page is gated for grown-ups", /grown-ups/i.test(lockedHeader));

  await browser.close();

  if (errors.length) {
    console.error("\nUnexpected errors:");
    errors.forEach((e) => console.error("  " + e));
  }
  if (bad === 0 && errors.length === 0) {
    console.log("\n  PASS — all assertions ok, no console errors");
    process.exit(0);
  } else {
    console.error(`\n  FAIL — ${bad} assertion(s), ${errors.length} unexpected error(s)`);
    process.exit(1);
  }

  function assert(name, cond, detail) {
    if (cond) console.log(`  ok    ${name}`);
    else { bad++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
  }
})().catch((e) => {
  console.error("THREW:", e);
  process.exit(2);
});
