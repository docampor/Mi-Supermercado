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
    acceptDownloads: true,
    serviceWorkers: "block"
  });
  const page = await context.newPage();
  const messages = [];
  const testBarcode = "7791234567890";
  const missingPhotoBarcode = "7790520028655";
  const catalogBarcode = "7790990003039";
  const newCatalogBarcodes = ["7793253003807", "7791130963633"];
  const brandSourceBarcodes = ["7793253003814", "7791130963343"];
  let productRouteHit = false;

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("Service Worker registration blocked by Playwright")) return;
    if (["error", "warning"].includes(msg.type())) messages.push(`${msg.type()}: ${text}`);
  });
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  await page.route(/https:\/\/(static\.openfoodfacts\.org|http2\.mlstatic\.com|images\.pricely\.ar|go-upc\.s3\.amazonaws\.com)\/.*/, (route) => {
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=", "base64")
    });
  });
  await page.route(/https:\/\/r\.jina\.ai\/https:\/\/go-upc\.com\/search\?q=.*/, (route) => {
    const url = route.request().url();
    if (url.includes(testBarcode)) {
      productRouteHit = true;
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=utf-8",
        body: [
          `Title: Salsa lista Marca Test 500 g \u2014 EAN ${testBarcode} \u2014 Go-UPC`,
          "",
          `URL Source: https://go-upc.com/search?q=${testBarcode}`,
          "",
          "Markdown Content:",
          "![Image 1: Photo of Salsa lista Marca Test](https://go-upc.s3.amazonaws.com/images/test-salsa.png)"
        ].join("\n")
      });
      return;
    }
    route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "Title: Search Results — Go-UPC\n\nMarkdown Content:\nNo product result."
    });
  });
  await page.route(new RegExp(`https://world\\.openfoodfacts\\.org/api/v0/product/${testBarcode}\\.json.*`), (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        product: {
          code: testBarcode,
          product_name: "Salsa lista",
          brands: "Marca Test",
          quantity: "500 g",
          categories: "Salsas",
          image_front_small_url: "https://static.openfoodfacts.org/images/products/779/123/456/7890/front_es.3.100.jpg"
        }
      })
    });
  });
  await page.route(new RegExp(`https://world\\.openfoodfacts\\.org/api/v0/product/${missingPhotoBarcode}\\.json.*`), (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        product: {
          code: missingPhotoBarcode,
          product_name: "Raid mata moscas",
          brands: "Raid"
        }
      })
    });
  });
  await page.route(new RegExp(`https://world\\.openproductsfacts\\.org/api/v0/product/${missingPhotoBarcode}\\.json.*`), (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
  });
  await page.route(new RegExp(`https://world\\.openfoodfacts\\.org/api/v3/product/${missingPhotoBarcode}.*`), (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
  });
  await page.route(/https:\/\/api\.mercadolibre\.com\/sites\/MLA\/search.*/, (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") || "";
    if (query.includes("raid") && query.includes("mata")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              title: "Raid Mata Moscas Y Mosquitos 380 Ml",
              thumbnail: "https://http2.mlstatic.com/D_12345-I.jpg"
            }
          ]
        })
      });
      return;
    }
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ results: [] }) });
  });
  await page.route(/https:\/\/world\.openfoodfacts\.org\/api\/v0\/product\/9999999999999\.json.*/, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
  });
  await page.route(/https:\/\/world\.openproductsfacts\.org\/api\/v0\/product\/9999999999999\.json.*/, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
  });
  await page.route(/https:\/\/world\.openfoodfacts\.org\/api\/v3\/product\/9999999999999.*/, (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
  });
  for (const barcode of brandSourceBarcodes) {
    await page.route(new RegExp(`https://world\\.openfoodfacts\\.org/api/v0/product/${barcode}\\.json.*`), (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
    });
    await page.route(new RegExp(`https://world\\.openproductsfacts\\.org/api/v0/product/${barcode}\\.json.*`), (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
    });
    await page.route(new RegExp(`https://world\\.openfoodfacts\\.org/api/v3/product/${barcode}.*`), (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ product: null }) });
    });
  }
  await page.route("https://datos.produccion.gob.ar/api/3/action/package_show?id=sepa-precios", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        result: {
          resources: [
            {
              name: "Viernes",
              format: "ZIP",
              url: "https://datos.produccion.gob.ar/sepa_viernes.zip",
              last_modified: "2026-06-01T12:00:00"
            }
          ]
        }
      })
    });
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
  await page.evaluate((barcode) => localStorage.setItem("control-stock-v1", JSON.stringify({
    products: [
      {
        id: "old-raid",
        barcode,
        name: "raid - mata miscas",
        lastPrice: 2000,
        metadata: { brand: "raid" },
        updatedAt: new Date().toISOString()
      }
    ],
    purchases: [],
    shoppingList: [],
    stock: []
  })), missingPhotoBarcode);
  await page.reload({ waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Cargar manual" }).click();
  await page.locator("#barcodeInput").fill(testBarcode);
  await page.evaluate(() => window.fillProductFromBarcode(true));
  try {
    await page.waitForFunction(() => document.querySelector("#productNameInput").value.includes("Salsa lista"), null, { timeout: 5000 });
  } catch (error) {
    const debug = await page.evaluate(() => ({
      online: navigator.onLine,
      barcode: document.querySelector("#barcodeInput").value,
      name: document.querySelector("#productNameInput").value,
      lookup: document.querySelector("#productLookupInfo").textContent
    }));
    throw new Error(`No autocomplete: route=${productRouteHit} debug=${JSON.stringify(debug)}`);
  }
  const lookupImageSrc = await page.locator(".lookup-image").getAttribute("src");
  await page.locator("#quantityInput").evaluate((input) => {
    input.value = "2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#unitPriceInput").evaluate((input) => {
    input.value = "1250";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#productForm button[type='submit']").click();
  try {
    await page.locator("#productDialog").waitFor({ state: "hidden", timeout: 5000 });
  } catch (error) {
    const debug = await page.evaluate(() => ({
      valid: document.querySelector("#productForm").checkValidity(),
      name: document.querySelector("#productNameInput").value,
      quantity: document.querySelector("#quantityInput").value,
      unitPrice: document.querySelector("#unitPriceInput").value,
      total: document.querySelector("#productTotalPreview").textContent
    }));
    throw new Error(`Dialog did not close after save: ${JSON.stringify(debug)}`);
  }

  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.getByPlaceholder("Mayonesa, fideos, limpiador...").fill("Mayonesa");
  await page.locator("#listQtyInput").fill("1");
  await page.getByRole("button", { name: "Agregar" }).click();
  const listActionText = await page.locator("#shoppingList").innerText();

  await page.getByRole("button", { name: "Compra", exact: true }).click();
  await page.getByRole("button", { name: "Cargar manual" }).click();
  await page.locator("#barcodeInput").fill(missingPhotoBarcode);
  await page.evaluate(() => window.fillProductFromBarcode(true));
  await page.waitForFunction(() => document.querySelector("#productNameInput").value.includes("Raid"), null, { timeout: 5000 });
  const fallbackImageSrc = await page.locator(".lookup-image").getAttribute("src");
  await page.locator("#closeProductButton").click();
  await page.locator("#productDialog").waitFor({ state: "hidden", timeout: 5000 });

  await page.getByRole("button", { name: "Cargar manual" }).click();
  await page.locator("#barcodeInput").fill(catalogBarcode);
  await page.evaluate(() => window.fillProductFromBarcode(true));
  await page.waitForFunction(() => document.querySelector("#productNameInput").value.includes("Magistral"), null, { timeout: 5000 });
  const catalogImageSrc = await page.locator(".lookup-image").getAttribute("src");
  const catalogLookupText = await page.locator("#productLookupInfo").innerText();
  const catalogPriceText = await page.locator(".price-reference").innerText();
  await page.locator("#closeProductButton").click();

  const newCatalogResults = [];
  for (const barcode of newCatalogBarcodes) {
    await page.getByRole("button", { name: "Cargar manual" }).click();
    await page.locator("#barcodeInput").fill(barcode);
    await page.evaluate(() => window.fillProductFromBarcode(true));
    await page.waitForFunction(() => document.querySelector("#productNameInput").value.trim().length > 0, null, { timeout: 5000 });
    newCatalogResults.push({
      barcode,
      image: Boolean(await page.locator(".lookup-image").getAttribute("src")),
      price: (await page.locator(".price-reference").innerText()).includes("$")
    });
    await page.locator("#closeProductButton").click();
  }

  const brandSourceResults = [];
  for (const barcode of brandSourceBarcodes) {
    await page.getByRole("button", { name: "Cargar manual" }).click();
    await page.locator("#barcodeInput").fill(barcode);
    await page.evaluate(() => window.fillProductFromBarcode(true));
    await page.waitForFunction(() => document.querySelector("#productNameInput").value.trim().length > 0, null, { timeout: 5000 });
    const sourceText = await page.locator("#productLookupInfo").innerText();
    brandSourceResults.push({
      barcode,
      found: !sourceText.includes("Producto no encontrado") && (
        sourceText.includes("Fuente marca") ||
        sourceText.includes("Go-UPC") ||
        sourceText.includes("Ayudin") ||
        sourceText.includes("Procenex")
      )
    });
    await page.locator("#closeProductButton").click();
  }

  await page.getByRole("button", { name: "Cargar manual" }).click();
  await page.locator("#productNameInput").fill("fideos matarazzo");
  await page.locator("#barcodeInput").fill("9999999999999");
  await page.evaluate(() => window.fillProductFromBarcode(true));
  try {
    await page.waitForFunction(() => document.querySelector("#productLookupInfo").textContent.includes("Molinos"), null, { timeout: 5000 });
  } catch (error) {
    throw new Error(await page.locator("#productLookupInfo").innerText());
  }
  const brandDatabaseText = await page.locator("#productLookupInfo").innerText();
  await page.evaluate(() => window.closeProductDialog());
  await page.locator("#productDialog").waitFor({ state: "hidden", timeout: 5000 });

  await page.getByRole("button", { name: "Stock" }).click();
  await page.locator("#stockNameInput").fill("Arroz");
  await page.locator("#stockQtyInput").fill("3");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.locator("#stockNameInput").fill("Leche");
  await page.locator("#stockQtyInput").fill("1");
  await page.locator("#stockMinInput").fill("2");
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForFunction(() => document.querySelector("#lowStockPanel:not([hidden])")?.textContent.includes("Leche"), null, { timeout: 5000 });
  const lowStockText = await page.locator("#lowStockPanel").innerText();
  await page.locator("#addLowStockToListButton").click();
  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("#shoppingList")?.textContent.includes("Leche"), null, { timeout: 5000 });
  const restockListText = await page.locator("#shoppingList").innerText();

  await page.getByRole("button", { name: "Informes" }).click();
  await page.waitForTimeout(300);

  const bodyText = await page.locator("body").innerText();
  const productThumbCountBeforeImport = await page.locator(".product-thumb").count();
  const backupDownloadPromise = page.waitForEvent("download");
  await page.locator("#exportBackupButton").click();
  const backupDownload = await backupDownloadPromise;
  const backupFilename = backupDownload.suggestedFilename();

  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("#backupFileInput").setInputFiles({
    name: "control-stock-backup-test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      app: "control-stock",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        products: [],
        purchases: [],
        shoppingList: [
          {
            id: "list-imported",
            name: "Cafe importado",
            quantity: "2",
            checked: false,
            createdAt: new Date().toISOString()
          }
        ],
        stock: [
          {
            id: "stock-imported",
            name: "Yerba importada",
            barcode: "",
            quantity: 1,
            updatedAt: new Date().toISOString()
          }
        ]
      }
    }))
  });
  await page.waitForFunction(() => {
    const data = JSON.parse(localStorage.getItem("control-stock-v1") || "{}");
    return data.shoppingList?.some((item) => item.name === "Cafe importado") &&
      data.stock?.some((item) => item.name === "Yerba importada");
  }, null, { timeout: 5000 });
  const importedState = await page.evaluate(() => JSON.parse(localStorage.getItem("control-stock-v1") || "{}"));

  const checks = {
    appTitle: bodyText.includes("Control de Stock"),
    reportsVisible: bodyText.includes("Informes") && bodyText.includes("Compras del mes"),
    purchaseSaved: bodyText.includes("Salsa lista"),
    listScanActionVisible: listActionText.includes("Escanear codigo") && listActionText.includes("Cargar sin escanear"),
    lowStockVisible: lowStockText.includes("Para reponer") && lowStockText.includes("Leche") && lowStockText.includes("Minimo"),
    restockListAdded: restockListText.includes("Leche") && restockListText.includes("Escanear codigo"),
    backupExported: backupFilename.endsWith(".json") && backupFilename.includes("control-stock-backup"),
    backupImported: importedState.shoppingList.some((item) => item.name === "Cafe importado") &&
      importedState.stock.some((item) => item.name === "Yerba importada"),
    scannerUsesRetailFormatsOnly: await page.evaluate(() => {
      const source = window.openScanner.toString();
      return source.includes("ean_13") && source.includes("upc_a") && !source.includes("code_128") && !source.includes("code_39") &&
        Boolean(document.querySelector("#scannerResult")) && Boolean(document.querySelector("#scannerConfirmActions"));
    }),
    lookupImageVisible: Boolean(lookupImageSrc),
    goUpcSourceVisible: lookupImageSrc.includes("go-upc"),
    fallbackImageVisible: Boolean(fallbackImageSrc),
    catalogImageVisible: Boolean(catalogImageSrc),
    catalogDataNotStale: catalogLookupText.includes("Magistral") && !catalogLookupText.includes("Raid"),
    priceReferenceVisible: catalogPriceText.includes("SEPA") && catalogPriceText.includes("Precios Claros") && catalogPriceText.includes("$"),
    sepaDatasetVisible: brandDatabaseText.includes("SEPA") || catalogPriceText.includes("SEPA"),
    newCatalogProductsVisible: newCatalogResults.every((item) => item.image && item.price),
    brandSourcesVisible: brandSourceResults.every((item) => item.found),
    brandDatabaseVisible: brandDatabaseText.includes("Matarazzo") && brandDatabaseText.includes("Molinos"),
    imageSaved: productThumbCountBeforeImport > 0
  };

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar Excel" }).click();
  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();

  await browser.close();
  server.close();

  console.log(JSON.stringify({ checks, suggestedFilename, backupFilename, messages }, null, 2));

  if (!Object.values(checks).every(Boolean) || messages.length) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  server.close();
  console.error(error);
  process.exit(1);
});
