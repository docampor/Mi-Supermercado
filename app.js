const STORAGE_KEY = "control-stock-v1";

const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2
});

const state = loadState();
let activeProductContext = "purchase";
let pendingListItemId = null;
let scannerCallback = null;
let scannerStream = null;
let scannerLoop = 0;
let deferredInstallPrompt = null;

const $ = (selector) => document.querySelector(selector);

const els = {
  installButton: $("#installButton"),
  purchaseSummary: $("#purchaseSummary"),
  purchaseItems: $("#purchaseItems"),
  purchaseHistory: $("#purchaseHistory"),
  productReport: $("#productReport"),
  reportSummary: $("#reportSummary"),
  shoppingList: $("#shoppingList"),
  stockList: $("#stockList"),
  stockSearchInput: $("#stockSearchInput"),
  reportMonthInput: $("#reportMonthInput"),
  toast: $("#toast"),
  productDialog: $("#productDialog"),
  productForm: $("#productForm"),
  productDialogMode: $("#productDialogMode"),
  barcodeInput: $("#barcodeInput"),
  productNameInput: $("#productNameInput"),
  quantityInput: $("#quantityInput"),
  unitPriceInput: $("#unitPriceInput"),
  promoEnabledInput: $("#promoEnabledInput"),
  promoBox: $("#promoBox"),
  promoQtyInput: $("#promoQtyInput"),
  promoPriceInput: $("#promoPriceInput"),
  productTotalPreview: $("#productTotalPreview"),
  scannerDialog: $("#scannerDialog"),
  scannerVideo: $("#scannerVideo"),
  scannerMessage: $("#scannerMessage"),
  manualBarcodeInput: $("#manualBarcodeInput")
};

init();

function init() {
  ensureActivePurchase();
  els.reportMonthInput.value = monthKey(new Date());
  bindEvents();
  render();
  registerServiceWorker();
}

function bindEvents() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  $("#newPurchaseButton").addEventListener("click", createNewPurchase);
  $("#scanPurchaseButton").addEventListener("click", () => scanForPurchase());
  $("#manualPurchaseButton").addEventListener("click", () => openProductDialog({ context: "purchase" }));
  $("#closePurchaseButton").addEventListener("click", closeActivePurchase);
  $("#shoppingListForm").addEventListener("submit", addShoppingListItem);
  $("#stockForm").addEventListener("submit", saveStockFromForm);
  $("#scanStockButton").addEventListener("click", scanForStock);
  $("#exportButton").addEventListener("click", exportExcel);
  $("#manualBarcodeForm").addEventListener("submit", submitManualBarcode);
  $("#closeScannerButton").addEventListener("click", closeScanner);
  $("#closeProductButton").addEventListener("click", () => els.productDialog.close());
  $("#cancelProductButton").addEventListener("click", () => els.productDialog.close());
  els.productForm.addEventListener("submit", saveProductEntry);
  els.promoEnabledInput.addEventListener("change", updatePromoVisibility);
  els.stockSearchInput.addEventListener("input", renderStock);
  els.reportMonthInput.addEventListener("change", renderReports);

  ["quantityInput", "unitPriceInput", "promoQtyInput", "promoPriceInput", "promoEnabledInput"].forEach((id) => {
    $(`#${id}`).addEventListener("input", updateTotalPreview);
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    els.installButton.hidden = true;
  });
}

function loadState() {
  const fallback = {
    products: [],
    purchases: [],
    shoppingList: [],
    stock: []
  };

  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render() {
  renderPurchase();
  renderShoppingList();
  renderStock();
  renderReports();
}

function showView(viewName) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#view-${viewName}`).classList.add("active");
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });
}

function ensureActivePurchase() {
  let purchase = getActivePurchase();
  if (!purchase) {
    purchase = {
      id: uid("purchase"),
      startedAt: new Date().toISOString(),
      closedAt: null,
      status: "open",
      items: []
    };
    state.purchases.unshift(purchase);
    saveState();
  }
  return purchase;
}

function getActivePurchase() {
  return state.purchases.find((purchase) => purchase.status === "open");
}

function createNewPurchase() {
  const active = getActivePurchase();
  if (active && active.items.length === 0) {
    toast("Ya tenes una compra nueva abierta.");
    return;
  }
  if (active) {
    active.status = "closed";
    active.closedAt = new Date().toISOString();
  }
  state.purchases.unshift({
    id: uid("purchase"),
    startedAt: new Date().toISOString(),
    closedAt: null,
    status: "open",
    items: []
  });
  saveState();
  render();
  toast("Compra nueva lista.");
}

function closeActivePurchase() {
  const active = getActivePurchase();
  if (!active) return;
  if (active.items.length === 0) {
    toast("La compra no tiene productos todavia.");
    return;
  }
  active.status = "closed";
  active.closedAt = new Date().toISOString();
  saveState();
  ensureActivePurchase();
  render();
  toast("Compra cerrada y guardada.");
}

function renderPurchase() {
  const active = ensureActivePurchase();
  const total = active.items.reduce((sum, item) => sum + item.total, 0);
  const units = active.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  els.purchaseSummary.innerHTML = [
    metric(currency.format(total), "Total actual"),
    metric(active.items.length, "Productos"),
    metric(formatNumber(units), "Unidades")
  ].join("");

  if (active.items.length === 0) {
    els.purchaseItems.innerHTML = emptyState("Escanea o carga manualmente el primer producto de esta compra.");
    return;
  }

  els.purchaseItems.innerHTML = active.items.map((item) => `
    <article class="item-card">
      <div class="item-main">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${item.barcode ? `Codigo ${escapeHtml(item.barcode)}` : "Sin codigo"}</small>
        </div>
        <div class="price">${currency.format(item.total)}</div>
      </div>
      <div class="item-meta">
        <span>${formatNumber(item.quantity)} x ${currency.format(item.unitPrice)}</span>
        ${item.promo?.enabled ? `<span>Promo ${formatNumber(item.promo.quantity)} por ${currency.format(item.promo.price)}</span>` : ""}
      </div>
      <div class="card-actions">
        <button class="secondary small" onclick="editPurchaseItem('${item.id}')">Editar</button>
        <button class="danger small" onclick="removePurchaseItem('${item.id}')">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function scanForPurchase(listItemId = null) {
  pendingListItemId = listItemId;
  openScanner((barcode) => {
    const product = findProductByBarcode(barcode);
    const listItem = pendingListItemId ? state.shoppingList.find((item) => item.id === pendingListItemId) : null;
    openProductDialog({
      context: "purchase",
      barcode,
      name: product?.name || listItem?.name || "",
      quantity: parseNumber(listItem?.quantity) || 1,
      unitPrice: product?.lastPrice || ""
    });
  });
}

function openProductDialog(options = {}) {
  const product = options.barcode ? findProductByBarcode(options.barcode) : null;
  activeProductContext = options.context || "purchase";
  els.productDialogMode.textContent = activeProductContext === "stock" ? "Stock" : "Compra";
  els.barcodeInput.value = options.barcode || "";
  els.productNameInput.value = options.name || product?.name || "";
  els.quantityInput.value = options.quantity || 1;
  els.unitPriceInput.value = options.unitPrice ?? product?.lastPrice ?? "";
  els.promoEnabledInput.checked = Boolean(options.promo?.enabled);
  els.promoQtyInput.value = options.promo?.quantity || "";
  els.promoPriceInput.value = options.promo?.price || "";
  els.productForm.dataset.editItemId = options.editItemId || "";
  updatePromoVisibility();
  updateTotalPreview();
  els.productDialog.showModal();
  setTimeout(() => {
    (els.productNameInput.value ? els.quantityInput : els.productNameInput).focus();
  }, 80);
}

function editPurchaseItem(itemId) {
  const active = getActivePurchase();
  const item = active?.items.find((entry) => entry.id === itemId);
  if (!item) return;
  openProductDialog({
    context: "purchase",
    editItemId: item.id,
    barcode: item.barcode,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    promo: item.promo
  });
}

function removePurchaseItem(itemId) {
  const active = getActivePurchase();
  if (!active) return;
  const item = active.items.find((entry) => entry.id === itemId);
  active.items = active.items.filter((entry) => entry.id !== itemId);
  if (item) adjustStock(item.name, item.barcode, -Number(item.quantity || 0), false);
  saveState();
  render();
}

function saveProductEntry(event) {
  event.preventDefault();
  const barcode = els.barcodeInput.value.trim();
  const name = els.productNameInput.value.trim();
  const quantity = parseNumber(els.quantityInput.value);
  const unitPrice = parseNumber(els.unitPriceInput.value);
  const promo = getPromoInput();

  if (!name || quantity <= 0 || unitPrice < 0) {
    toast("Revisa producto, cantidad y precio.");
    return;
  }

  const total = calculateTotal(quantity, unitPrice, promo);
  upsertProduct({ barcode, name, lastPrice: unitPrice });

  if (activeProductContext === "stock") {
    adjustStock(name, barcode, quantity, true);
    els.productDialog.close();
    render();
    toast("Stock actualizado.");
    return;
  }

  const active = ensureActivePurchase();
  const editItemId = els.productForm.dataset.editItemId;
  if (editItemId) {
    const existing = active.items.find((item) => item.id === editItemId);
    if (existing) {
      adjustStock(existing.name, existing.barcode, -Number(existing.quantity || 0), false);
      Object.assign(existing, { barcode, name, quantity, unitPrice, promo, total, updatedAt: new Date().toISOString() });
      adjustStock(name, barcode, quantity, false);
    }
  } else {
    active.items.push({
      id: uid("item"),
      barcode,
      name,
      quantity,
      unitPrice,
      promo,
      total,
      createdAt: new Date().toISOString()
    });
    adjustStock(name, barcode, quantity, false);
  }

  if (pendingListItemId) {
    state.shoppingList = state.shoppingList.filter((item) => item.id !== pendingListItemId);
    pendingListItemId = null;
  }

  saveState();
  els.productDialog.close();
  render();
  toast("Producto guardado en la compra.");
}

function updatePromoVisibility() {
  els.promoBox.hidden = !els.promoEnabledInput.checked;
  updateTotalPreview();
}

function getPromoInput() {
  const enabled = els.promoEnabledInput.checked;
  const quantity = parseNumber(els.promoQtyInput.value);
  const price = parseNumber(els.promoPriceInput.value);
  return {
    enabled: enabled && quantity > 1 && price >= 0,
    quantity,
    price
  };
}

function updateTotalPreview() {
  const quantity = parseNumber(els.quantityInput.value);
  const unitPrice = parseNumber(els.unitPriceInput.value);
  const promo = getPromoInput();
  els.productTotalPreview.textContent = currency.format(calculateTotal(quantity, unitPrice, promo));
}

function calculateTotal(quantity, unitPrice, promo) {
  if (!promo?.enabled || promo.quantity <= 1) {
    return roundMoney(quantity * unitPrice);
  }
  const groups = Math.floor(quantity / promo.quantity);
  const remainder = quantity - groups * promo.quantity;
  return roundMoney(groups * promo.price + remainder * unitPrice);
}

function upsertProduct({ barcode, name, lastPrice }) {
  const key = barcode || normalize(name);
  const product = state.products.find((entry) => (entry.barcode && entry.barcode === barcode) || normalize(entry.name) === normalize(name));
  if (product) {
    product.barcode = barcode || product.barcode;
    product.name = name;
    product.lastPrice = lastPrice;
    product.updatedAt = new Date().toISOString();
  } else {
    state.products.push({
      id: uid("product"),
      key,
      barcode,
      name,
      lastPrice,
      updatedAt: new Date().toISOString()
    });
  }
}

function findProductByBarcode(barcode) {
  return state.products.find((product) => product.barcode === barcode);
}

function addShoppingListItem(event) {
  event.preventDefault();
  const nameInput = $("#listNameInput");
  const qtyInput = $("#listQtyInput");
  const name = nameInput.value.trim();
  if (!name) return;
  state.shoppingList.unshift({
    id: uid("list"),
    name,
    quantity: qtyInput.value.trim(),
    checked: false,
    createdAt: new Date().toISOString()
  });
  nameInput.value = "";
  qtyInput.value = "";
  saveState();
  renderShoppingList();
}

function renderShoppingList() {
  if (state.shoppingList.length === 0) {
    els.shoppingList.innerHTML = emptyState("Tu lista esta vacia. Agrega lo que vayas recordando.");
    return;
  }

  els.shoppingList.innerHTML = state.shoppingList.map((item) => `
    <article class="item-card">
      <div class="item-main">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${item.quantity ? `Cantidad: ${escapeHtml(item.quantity)}` : "Sin cantidad"}</small>
        </div>
      </div>
      <div class="card-actions">
        <button class="primary small" onclick="scanForPurchase('${item.id}')">Escanear</button>
        <button class="secondary small" onclick="sendListItemToPurchase('${item.id}')">Comprar</button>
        <button class="secondary small" onclick="editListItem('${item.id}')">Editar</button>
        <button class="danger small" onclick="deleteListItem('${item.id}')">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function sendListItemToPurchase(itemId) {
  const item = state.shoppingList.find((entry) => entry.id === itemId);
  if (!item) return;
  pendingListItemId = item.id;
  openProductDialog({
    context: "purchase",
    name: item.name,
    quantity: parseNumber(item.quantity) || 1
  });
}

function deleteListItem(itemId) {
  state.shoppingList = state.shoppingList.filter((item) => item.id !== itemId);
  saveState();
  renderShoppingList();
}

function editListItem(itemId) {
  const item = state.shoppingList.find((entry) => entry.id === itemId);
  if (!item) return;
  const name = prompt("Producto", item.name);
  if (name === null) return;
  const quantity = prompt("Cantidad", item.quantity || "");
  item.name = name.trim() || item.name;
  item.quantity = quantity === null ? item.quantity : quantity.trim();
  saveState();
  renderShoppingList();
}

function saveStockFromForm(event) {
  event.preventDefault();
  const nameInput = $("#stockNameInput");
  const qtyInput = $("#stockQtyInput");
  const name = nameInput.value.trim();
  const quantity = parseNumber(qtyInput.value);
  if (!name || quantity < 0) return;
  adjustStock(name, "", quantity, true);
  nameInput.value = "";
  qtyInput.value = "";
  saveState();
  renderStock();
  toast("Stock guardado.");
}

function scanForStock() {
  openScanner((barcode) => {
    const product = findProductByBarcode(barcode);
    openProductDialog({
      context: "stock",
      barcode,
      name: product?.name || "",
      quantity: 1,
      unitPrice: product?.lastPrice || 0
    });
  });
}

function adjustStock(name, barcode, quantity, replace) {
  const normalized = normalize(name);
  const item = state.stock.find((entry) => (barcode && entry.barcode === barcode) || normalize(entry.name) === normalized);
  if (item) {
    item.barcode = barcode || item.barcode;
    item.name = name;
    item.quantity = replace ? quantity : Math.max(0, Number(item.quantity || 0) + quantity);
    item.updatedAt = new Date().toISOString();
  } else {
    state.stock.push({
      id: uid("stock"),
      barcode,
      name,
      quantity: Math.max(0, quantity),
      updatedAt: new Date().toISOString()
    });
  }
}

function renderStock() {
  const query = normalize(els.stockSearchInput.value);
  const rows = state.stock
    .filter((item) => !query || normalize(item.name).includes(query) || item.barcode?.includes(query))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  if (rows.length === 0) {
    els.stockList.innerHTML = emptyState(query ? "No encontre productos con esa busqueda." : "Todavia no cargaste stock.");
    return;
  }

  els.stockList.innerHTML = rows.map((item) => `
    <article class="item-card">
      <div class="item-main">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${item.barcode ? `Codigo ${escapeHtml(item.barcode)}` : "Sin codigo"}</small>
        </div>
        <div class="price">${formatNumber(item.quantity)}</div>
      </div>
      <div class="card-actions">
        <button class="secondary small" onclick="changeStock('${item.id}', 1)">+1</button>
        <button class="secondary small" onclick="changeStock('${item.id}', -1)">-1</button>
        <button class="danger small" onclick="deleteStock('${item.id}')">Eliminar</button>
      </div>
    </article>
  `).join("");
}

function changeStock(itemId, delta) {
  const item = state.stock.find((entry) => entry.id === itemId);
  if (!item) return;
  item.quantity = Math.max(0, Number(item.quantity || 0) + delta);
  item.updatedAt = new Date().toISOString();
  saveState();
  renderStock();
}

function deleteStock(itemId) {
  state.stock = state.stock.filter((item) => item.id !== itemId);
  saveState();
  renderStock();
}

function renderReports() {
  const selectedMonth = els.reportMonthInput.value || monthKey(new Date());
  const purchases = state.purchases
    .filter((purchase) => monthKey(new Date(purchase.startedAt)) === selectedMonth && purchase.items.length > 0)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  const total = purchases.reduce((sum, purchase) => sum + purchase.items.reduce((itemSum, item) => itemSum + item.total, 0), 0);
  const itemCount = purchases.reduce((sum, purchase) => sum + purchase.items.length, 0);
  els.reportSummary.innerHTML = [
    metric(currency.format(total), "Gasto del mes"),
    metric(purchases.length, "Compras"),
    metric(itemCount, "Productos")
  ].join("");

  els.purchaseHistory.innerHTML = purchases.length
    ? purchases.map(renderPurchaseHistoryCard).join("")
    : emptyState("No hay compras guardadas para este mes.");

  const byProduct = new Map();
  purchases.flatMap((purchase) => purchase.items).forEach((item) => {
    const key = normalize(item.name);
    const current = byProduct.get(key) || { name: item.name, quantity: 0, total: 0 };
    current.quantity += Number(item.quantity || 0);
    current.total += Number(item.total || 0);
    byProduct.set(key, current);
  });

  const productRows = Array.from(byProduct.values()).sort((a, b) => b.total - a.total);
  els.productReport.innerHTML = productRows.length
    ? productRows.map((item) => `
      <article class="item-card">
        <div class="item-main">
          <strong>${escapeHtml(item.name)}</strong>
          <div class="price">${currency.format(item.total)}</div>
        </div>
        <div class="item-meta"><span>Cantidad total: ${formatNumber(item.quantity)}</span></div>
      </article>
    `).join("")
    : emptyState("Cuando cargues compras, aca vas a ver el gasto por producto.");
}

function renderPurchaseHistoryCard(purchase) {
  const total = purchase.items.reduce((sum, item) => sum + item.total, 0);
  return `
    <article class="item-card">
      <div class="item-main">
        <div>
          <strong>${formatDateTime(purchase.startedAt)}</strong>
          <small>${purchase.items.length} productos</small>
        </div>
        <div class="price">${currency.format(total)}</div>
      </div>
    </article>
  `;
}

async function openScanner(callback) {
  scannerCallback = callback;
  els.manualBarcodeInput.value = "";
  els.scannerMessage.textContent = "Apunta al codigo de barras del producto.";
  els.scannerDialog.showModal();

  if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
    els.scannerMessage.textContent = "Este navegador no habilito el lector automatico. Podes ingresar el codigo manualmente.";
    els.manualBarcodeInput.focus();
    return;
  }

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    els.scannerVideo.srcObject = scannerStream;
    await els.scannerVideo.play();
    const detector = new BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"]
    });
    scanFrame(detector);
  } catch {
    els.scannerMessage.textContent = "No pude abrir la camara. Revisa el permiso o ingresa el codigo manualmente.";
    els.manualBarcodeInput.focus();
  }
}

async function scanFrame(detector) {
  if (!scannerStream) return;
  try {
    const codes = await detector.detect(els.scannerVideo);
    if (codes.length) {
      finishScan(codes[0].rawValue);
      return;
    }
  } catch {
    els.scannerMessage.textContent = "Estoy intentando leer el codigo. Si no avanza, cargalo manualmente.";
  }
  scannerLoop = requestAnimationFrame(() => scanFrame(detector));
}

function submitManualBarcode(event) {
  event.preventDefault();
  const code = els.manualBarcodeInput.value.trim();
  if (code) finishScan(code);
}

function finishScan(code) {
  const callback = scannerCallback;
  closeScanner();
  if (callback) callback(code);
}

function closeScanner() {
  if (scannerLoop) cancelAnimationFrame(scannerLoop);
  scannerLoop = 0;
  if (scannerStream) {
    scannerStream.getTracks().forEach((track) => track.stop());
    scannerStream = null;
  }
  els.scannerVideo.srcObject = null;
  if (els.scannerDialog.open) els.scannerDialog.close();
}

function exportExcel() {
  const purchases = state.purchases.filter((purchase) => purchase.items.length > 0);
  const rows = purchases.flatMap((purchase) => purchase.items.map((item) => ({
    fecha: formatDateTime(purchase.startedAt),
    codigo: item.barcode || "",
    producto: item.name,
    cantidad: item.quantity,
    precioUnitario: item.unitPrice,
    promocion: item.promo?.enabled ? `${item.promo.quantity} por ${item.promo.price}` : "",
    total: item.total
  })));

  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        ${tableHtml("Compras", rows, ["fecha", "codigo", "producto", "cantidad", "precioUnitario", "promocion", "total"])}
        ${tableHtml("Stock", state.stock, ["barcode", "name", "quantity", "updatedAt"])}
        ${tableHtml("Lista", state.shoppingList, ["name", "quantity", "createdAt"])}
      </body>
    </html>
  `;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(blob, `control-stock-${dateFileKey(new Date())}.xls`);
  toast("Archivo Excel generado.");
}

function tableHtml(title, rows, columns) {
  const body = rows.length
    ? rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "")}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${columns.length}">Sin datos</td></tr>`;
  return `
    <h2>${escapeHtml(title)}</h2>
    <table border="1">
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("")}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function metric(value, label) {
  return `<div class="metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function emptyState(text) {
  return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2300);
}

function parseNumber(value) {
  if (typeof value === "number") return value;
  const normalized = String(value || "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(value || 0));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function monthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dateFileKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

window.editPurchaseItem = editPurchaseItem;
window.removePurchaseItem = removePurchaseItem;
window.scanForPurchase = scanForPurchase;
window.sendListItemToPurchase = sendListItemToPurchase;
window.editListItem = editListItem;
window.deleteListItem = deleteListItem;
window.changeStock = changeStock;
window.deleteStock = deleteStock;
