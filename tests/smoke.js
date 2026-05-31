const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

const root = process.cwd();
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 8765;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

const server = http.createServer((req, res) => {
  const cleanPath = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html";
  const filePath = path.resolve(root, cleanPath);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end("No encontrado");
    return;
  }

  res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

async function run() {
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "es-AR",
    acceptDownloads: true
  });
  const page = await context.newPage();
  const messages = [];

  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Cargar manual" }).click();
  await page.getByPlaceholder("Nombre del producto").fill("Fideos");
  await page.locator("#quantityInput").fill("2");
  await page.locator("#unitPriceInput").fill("1250");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.getByRole("button", { name: "Lista" }).click();
  await page.getByPlaceholder("Mayonesa, fideos, limpiador...").fill("Mayonesa");
  await page.locator("#listQtyInput").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();

  await page.getByRole("button", { name: "Stock" }).click();
  await page.locator("#stockNameInput").fill("Arroz");
  await page.locator("#stockQtyInput").fill("3");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.getByRole("button", { name: "Informes" }).click();
  await page.waitForTimeout(300);

  const bodyText = await page.locator("body").innerText();
  const checks = {
    appTitle: bodyText.includes("Control de Stock"),
    reportsVisible: bodyText.includes("Informes") && bodyText.includes("Compras del mes"),
    purchaseSaved: bodyText.includes("Fideos")
  };

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Excel" }).click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();

  await browser.close();
  server.close();

  console.log(JSON.stringify({ checks, suggestedFilename, messages }, null, 2));

  if (!Object.values(checks).every(Boolean) || messages.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  server.close();
  console.error(error);
  process.exit(1);
});
