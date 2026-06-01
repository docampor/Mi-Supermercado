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
let barcodeLookupTimer = 0;

const ARGENTINA_PRODUCT_CATALOG = {
  "7790990003039": {
    barcode: "7790990003039",
    name: "Magistral - Detergente Ultra Limon 500 ml",
    lastPrice: "",
    metadata: {
      brand: "Magistral",
      quantityLabel: "500 ml",
      category: "Limpieza / Detergente",
      productType: "catalogo argentino",
      imageUrl: "https://images.pricely.ar/images/1/7790990003039.webp",
      source: "Catalogo argentino + Pricely",
      priceReference: {
        bestPrice: 2800.85,
        averagePrice: 4437.61,
        dealPrice: 2999.93,
        source: "Pricely",
        url: "https://pricely.ar/product/7790990003039",
        checkedAt: "2026-05-31"
      }
    }
  },
  "7790520028655": {
    barcode: "7790520028655",
    name: "Raid - Mata Moscas y Mosquitos Aerosol 380 ml",
    lastPrice: "",
    metadata: {
      brand: "Raid",
      quantityLabel: "380 ml",
      category: "Limpieza / Insecticida",
      productType: "catalogo argentino",
      imageUrl: "https://acdn-us.mitiendanube.com/stores/006/012/520/products/farmamix_raid_7790520028655_1-8653a94dea2216754e17642355231076-1024-1024.webp",
      source: "Catalogo argentino + Farmamix",
      priceReference: {
        bestPrice: 5700,
        averagePrice: 7084.14,
        dealPrice: 7160,
        source: "Pricely",
        url: "https://pricely.ar/product/7790520028655",
        checkedAt: "2026-05-31"
      }
    }
  },
  "7793253003807": {
    barcode: "7793253003807",
    name: "Ayudin - Lavandina en Gel Citrica 700 ml",
    lastPrice: "",
    metadata: {
      brand: "Ayudin",
      quantityLabel: "700 ml",
      category: "Limpieza / Lavandina en gel",
      productType: "catalogo argentino",
      imageUrl: "https://images.pricely.ar/images/1/7793253003807.webp",
      source: "Catalogo argentino + Pricely",
      priceReference: {
        bestPrice: 2161.25,
        averagePrice: 3737.86,
        dealPrice: 2325.01,
        source: "Pricely",
        url: "https://pricely.ar/product/7793253003807",
        checkedAt: "2026-05-31"
      }
    }
  },
  "7791130963633": {
    barcode: "7791130963633",
    name: "Procenex - Limpia Pisos Frescura de Gardenia 1.8 l",
    lastPrice: "",
    metadata: {
      brand: "Procenex",
      quantityLabel: "1.8 l",
      category: "Limpieza / Limpia pisos",
      productType: "catalogo argentino",
      imageUrl: "https://images.pricely.ar/images/1/7791130963633.webp",
      source: "Catalogo argentino + Pricely",
      priceReference: {
        bestPrice: 3150,
        averagePrice: 4321.66,
        dealPrice: 3150,
        source: "Pricely",
        url: "https://pricely.ar/product/7791130963633",
        checkedAt: "2026-05-31"
      }
    }
  }
};

const AYUDIN_BRAND_PRODUCTS = {
  "7793253000400": "Ayudin Maxima Pureza 1 l",
  "7790132098459": "Ayudin Lavandina Original 1 l",
  "7793253006709": "Ayudin Lavandina Original 2 l",
  "7793253006716": "Ayudin Lavandina Original 4 l",
  "7793253003715": "Ayudin Lavanda Triple Poder 1 l",
  "7793253003722": "Ayudin Lavanda Triple Poder 2 l",
  "7793253003739": "Ayudin Lavanda Triple Poder 4 l",
  "7793253003746": "Ayudin Pureza del Glaciar Triple Poder 1 l",
  "7793253003753": "Ayudin Pureza del Glaciar Triple Poder 2 l",
  "7793253003760": "Ayudin Pureza del Glaciar Triple Poder 4 l",
  "7793253003777": "Ayudin Antisplash 1 l",
  "7793253003784": "Ayudin Antisplash 2 l",
  "7793253003791": "Ayudin Lavandina Gel Expert Original 700 ml",
  "7793253003807": "Ayudin Lavandina Gel Expert Citrica 700 ml",
  "7793253003814": "Ayudin Lavandina Gel Expert Floral 700 ml",
  "7793253003821": "Ayudin Lavandina Gel Expert Menta 700 ml",
  "7793253003838": "Ayudin Lavandina Gel Expert Lavanda 700 ml",
  "7793253005856": "Ayudin Lavandina en Gel Original 500 ml",
  "7793253005863": "Ayudin Lavandina en Gel Citrica 500 ml",
  "7793253003869": "Ayudin Lavandina en Gel Original 1.5 l",
  "7793253003876": "Ayudin Lavandina en Gel Citrica 1.5 l",
  "7793253004699": "Ayudin Limpiador Desinfectante Lavanda 900 ml",
  "7793253004729": "Ayudin Limpiador Desinfectante Marina 900 ml",
  "7793253004743": "Ayudin Limpiador Desinfectante Floral 900 ml",
  "7793253004705": "Ayudin Limpiador Desinfectante Lavanda 1.8 l",
  "7793253004736": "Ayudin Limpiador Desinfectante Marina 1.8 l",
  "7793253004750": "Ayudin Limpiador Desinfectante Floral 1.8 l",
  "7793253005054": "Ayudin Aerosol Desinfectante Expert Original 332 cc",
  "7793253005061": "Ayudin Aerosol Desinfectante Expert Frescura Matinal 332 cc",
  "7793253005078": "Ayudin Aerosol Desinfectante Expert Bebe 332 cc",
  "7793253005337": "Ayudin Aerosol Desinfectante Expert Original 482 cc"
};

const PROCENEX_BRAND_PRODUCTS = {
  "7791130963633": "Procenex Limpia Pisos Frescura de Gardenia 1.8 l",
  "7791130963343": "Procenex Limpiador Liquido Brisa Floral 900 ml"
};

const ARGENTINA_BRAND_DATABASE = [
  {
    company: "Grupo Arcor",
    category: "Alimentos",
    brands: ["Arcor", "BC", "La Campagnola", "Salsati", "Presto Pronta", "Prestopronta", "Nereida", "Godet", "Bagley", "Chocolinas", "Rumba", "Sonrisas", "Criollitas", "Opera", "Cereal Mix", "Mogul", "Bon o Bon", "Cofler", "Aguila", "Tofi", "Rocklets", "Menthoplus", "Topline"]
  },
  {
    company: "Nestle",
    category: "Alimentos",
    brands: ["Nestle", "Nescafe", "Dolca", "Nesquik", "KitKat", "Kit Kat", "Crunch", "Baton", "Suflair", "Garoto", "Nido", "Svelty", "La Lechera", "Nestum", "Maggi", "Fitness", "Frigor", "Eco de los Andes", "Glaciar", "Nespresso", "Purina"]
  },
  {
    company: "Unilever",
    category: "Alimentos y cuidado personal",
    brands: ["Hellmann's", "Hellmanns", "Knorr", "Maizena", "Savora", "Magnum", "Cornetto", "Dove", "Axe", "Rexona", "Lux", "Sedal", "Suave", "Clear", "Tresemme", "Cif", "Vim", "Comfort", "Ala", "Skip", "Drive"]
  },
  {
    company: "Molinos Rio de la Plata",
    category: "Alimentos",
    brands: ["Matarazzo", "Lucchetti", "Granja del Sol", "Gallo", "Gallo Snacks", "Cocinero", "Exquisita", "La Saltena", "La Salteña", "Don Vicente", "Favorita", "Lira", "Nobleza Gaucha", "Canale", "Terrabusi"]
  },
  {
    company: "Mondelez",
    category: "Alimentos",
    brands: ["Oreo", "Pepitos", "Melba", "Variedad", "Terrabusi", "Tita", "Rhodesia", "Milka", "Shot", "Cadbury", "Beldent", "Halls", "Tang", "Clight", "Royal"]
  },
  {
    company: "Mastellone Hnos.",
    category: "Lacteos",
    brands: ["La Serenisima", "La Serenísima", "Ser", "Cindor", "Finlandia", "Casancrem", "Armonia", "Armonía", "Quesabores"]
  },
  {
    company: "Danone",
    category: "Lacteos y bebidas",
    brands: ["Danone", "Actimel", "Activia", "Danonino", "Ser", "Villavicencio", "Villa del Sur", "Levite"]
  },
  {
    company: "PepsiCo",
    category: "Bebidas y snacks",
    brands: ["Pepsi", "Seven Up", "7Up", "Mirinda", "Gatorade", "Paso de los Toros", "Toddy", "Quaker", "Lay's", "Lays", "Doritos", "Cheetos", "Twistos", "Pehuamar"]
  },
  {
    company: "Coca-Cola",
    category: "Bebidas",
    brands: ["Coca Cola", "Coca-Cola", "Sprite", "Fanta", "Schweppes", "Cepita", "Aquarius", "Powerade", "Bonaqua"]
  },
  {
    company: "Grupo Ayudin",
    category: "Limpieza",
    brands: ["Ayudin", "Ayudín", "Poett", "Trenet", "Selton", "Arco Iris"]
  },
  {
    company: "Procenex",
    category: "Limpieza",
    brands: ["Procenex"]
  },
  {
    company: "SC Johnson",
    category: "Limpieza",
    brands: ["Raid", "Glade", "Mr Musculo", "Mr. Musculo", "Fuyi", "Off", "Ziploc", "Blem", "Echo"]
  },
  {
    company: "Procter & Gamble",
    category: "Limpieza y cuidado personal",
    brands: ["Magistral", "Ariel", "Ace", "Downy", "Pantene", "Head & Shoulders", "H&S", "Gillette", "Oral-B", "Always", "Pampers"]
  },
  {
    company: "Reckitt",
    category: "Limpieza y cuidado personal",
    brands: ["Vanish", "Lysoform", "Harpic", "Woolite", "Dettol", "Finish", "Air Wick", "Veet", "Strepsils"]
  },
  {
    company: "Alicorp",
    category: "Alimentos y cuidado personal",
    brands: ["AlaCena", "Cocinero", "Plusbelle", "Zorro", "Okebon", "Fanacoa"]
  }
];

const SEPA_DATASET_API = "https://datos.produccion.gob.ar/api/3/action/package_show?id=sepa-precios";
let sepaDatasetReferencePromise = null;

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
  productLookupInfo: $("#productLookupInfo"),
  productPhotoInput: $("#productPhotoInput"),
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
  document.addEventListener("error", handleImageError, true);
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
  $("#lookupProductButton").addEventListener("click", () => fillProductFromBarcode(true));
  els.productPhotoInput.addEventListener("change", saveProductPhoto);
  els.barcodeInput.addEventListener("change", fillProductFromBarcode);
  els.barcodeInput.addEventListener("blur", fillProductFromBarcode);
  els.barcodeInput.addEventListener("input", queueBarcodeLookup);
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

function handleImageError(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) return;

  if (target.classList.contains("lookup-image")) {
    const button = document.createElement("button");
    button.className = "lookup-image placeholder";
    button.type = "button";
    button.id = "productPhotoTrigger";
    button.textContent = "Sin foto";
    button.addEventListener("click", () => els.productPhotoInput.click());
    target.replaceWith(button);
    return;
  }

  if (target.classList.contains("product-thumb")) {
    target.remove();
  }
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
        <div class="item-identity">
          ${productImage(item.metadata?.imageUrl, item.name)}
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${item.barcode ? `Codigo ${escapeHtml(item.barcode)}` : "Sin codigo"}</small>
          </div>
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
  openScanner(async (barcode) => {
    const product = await resolveBarcodeProduct(barcode, { refreshMissingImage: true });
    const listItem = pendingListItemId ? state.shoppingList.find((item) => item.id === pendingListItemId) : null;
    openProductDialog({
      context: "purchase",
      barcode,
      name: product?.name || listItem?.name || "",
      quantity: parseNumber(listItem?.quantity) || 1,
      unitPrice: product?.lastPrice || "",
      productInfo: product
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
  els.productForm.dataset.productMetadata = JSON.stringify(options.productInfo?.metadata || product?.metadata || {});
  els.productPhotoInput.value = "";
  renderLookupInfo(options.productInfo || product);
  updatePromoVisibility();
  updateTotalPreview();
  els.productDialog.showModal();
  setTimeout(() => {
    (els.productNameInput.value ? els.quantityInput : els.productNameInput).focus();
  }, 80);
}

function queueBarcodeLookup() {
  clearTimeout(barcodeLookupTimer);
  const barcode = els.barcodeInput.value.trim();
  if (barcode.length < 8) return;
  barcodeLookupTimer = setTimeout(fillProductFromBarcode, 450);
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
  const metadata = readProductMetadata();

  if (!name || quantity <= 0 || unitPrice < 0) {
    toast("Revisa producto, cantidad y precio.");
    return;
  }

  const total = calculateTotal(quantity, unitPrice, promo);
  upsertProduct({ barcode, name, lastPrice: unitPrice, metadata });

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
      Object.assign(existing, { barcode, name, quantity, unitPrice, promo, total, metadata, updatedAt: new Date().toISOString() });
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
      metadata,
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

function upsertProduct({ barcode, name, lastPrice, metadata = {} }) {
  const key = barcode || normalize(name);
  metadata = enrichMetadataWithBrand(name, metadata);
  const product = state.products.find((entry) => (entry.barcode && entry.barcode === barcode) || normalize(entry.name) === normalize(name));
  if (product) {
    product.barcode = barcode || product.barcode;
    product.name = name;
    product.lastPrice = lastPrice;
    product.metadata = { ...(product.metadata || {}), ...metadata };
    product.updatedAt = new Date().toISOString();
  } else {
    state.products.push({
      id: uid("product"),
      key,
      barcode,
      name,
      lastPrice,
      metadata,
      updatedAt: new Date().toISOString()
    });
  }
}

function findProductByBarcode(barcode) {
  return state.products.find((product) => product.barcode === barcode);
}

async function resolveBarcodeProduct(barcode, options = {}) {
  const localProduct = findProductByBarcode(barcode);
  const catalogProduct = findArgentinaCatalogProduct(barcode);
  const shouldRefreshImage = options.refreshMissingImage && localProduct?.name && !localProduct.metadata?.imageUrl;
  if (catalogProduct && (!localProduct?.name || !localProduct.metadata?.imageUrl)) {
    const mergedProduct = mergeProductData(localProduct, catalogProduct);
    upsertProduct(mergedProduct);
    saveState();
    return { ...mergedProduct, source: localProduct?.name ? "local" : "catalog" };
  }
  if (localProduct?.name && !shouldRefreshImage) return { ...localProduct, source: "local" };

  toast("Buscando datos del producto...");
  const typedHint = els.productNameInput?.value?.trim();
  const hintProduct = typedHint ? { barcode, name: typedHint, metadata: enrichMetadataWithBrand(typedHint, {}) } : null;
  const externalProduct = await fetchExternalProduct(barcode, { product: mergeProductData(localProduct, hintProduct) });
  if (externalProduct) {
    const mergedProduct = mergeProductData(mergeProductData(localProduct, hintProduct), externalProduct);
    upsertProduct(mergedProduct);
    saveState();
    toast(mergedProduct.metadata?.imageUrl ? "Producto e imagen encontrados." : "Producto encontrado sin imagen.");
    return { ...mergedProduct, source: localProduct ? "local" : "online" };
  }

  if (localProduct?.name) {
    const mergedProduct = mergeProductData(localProduct, catalogProduct);
    toast(mergedProduct.metadata?.imageUrl ? "Producto local actualizado con imagen." : "Producto local encontrado. La base consultada no trajo imagen.");
    return { ...mergedProduct, source: "local" };
  }

  if (catalogProduct) return { ...catalogProduct, source: "catalog" };
  if (hintProduct?.name) {
    return {
      barcode,
      name: hintProduct.name,
      lastPrice: "",
      metadata: enrichMetadataWithBrand(hintProduct.name, hintProduct.metadata || {}),
      source: "brand-database"
    };
  }

  toast("No encontre datos para ese codigo. Podés cargarlo una vez y queda aprendido.");
  return { barcode, name: "", metadata: {}, source: "missing" };
}

function findArgentinaCatalogProduct(barcode) {
  const product = ARGENTINA_PRODUCT_CATALOG[barcode];
  if (product) return JSON.parse(JSON.stringify(product));
  return findArgentinaBrandSourceProduct(barcode);
}

function findArgentinaBrandSourceProduct(barcode) {
  const ayudinName = AYUDIN_BRAND_PRODUCTS[barcode];
  if (ayudinName || isAyudinFamilyCode(barcode)) {
    return buildBrandSourceProduct({
      barcode,
      name: ayudinName || "Grupo Ayudin - Producto de limpieza",
      brand: detectAyudinBrand(ayudinName || barcode),
      category: detectCleaningCategory(ayudinName || "Producto de limpieza"),
      source: ayudinName ? "Fuente marca: Grupo Ayudin" : "Fuente marca: Grupo Ayudin por familia EAN"
    });
  }

  const procenexName = PROCENEX_BRAND_PRODUCTS[barcode];
  if (procenexName || isProcenexFamilyCode(barcode)) {
    return buildBrandSourceProduct({
      barcode,
      name: procenexName || "Procenex - Producto de limpieza",
      brand: "Procenex",
      category: detectCleaningCategory(procenexName || "Producto de limpieza"),
      source: procenexName ? "Fuente marca: Procenex" : "Fuente marca: Procenex por familia EAN"
    });
  }

  return null;
}

function buildBrandSourceProduct({ barcode, name, brand, category, source }) {
  return {
    barcode,
    name,
    lastPrice: "",
    metadata: {
      brand,
      quantityLabel: extractQuantityLabel(name),
      category,
      productType: "fuente de marca argentina",
      imageUrl: `https://images.pricely.ar/images/1/${barcode}.webp`,
      source,
      priceReference: {
        source: "Pricely",
        url: `https://pricely.ar/product/${barcode}`
      }
    }
  };
}

function isAyudinFamilyCode(barcode) {
  return /^77932530/.test(barcode) || /^779013209/.test(barcode);
}

function isProcenexFamilyCode(barcode) {
  return /^779113096/.test(barcode);
}

function detectAyudinBrand(name) {
  const normalized = normalize(name);
  if (normalized.includes("poett")) return "Poett";
  if (normalized.includes("selton")) return "Selton";
  if (normalized.includes("trenet")) return "Trenet";
  if (normalized.includes("arco iris")) return "Arco Iris";
  return "Ayudin";
}

function detectCleaningCategory(name) {
  const normalized = normalize(name);
  if (normalized.includes("lavandina")) return "Limpieza / Lavandina";
  if (normalized.includes("desinfectante")) return "Limpieza / Desinfectante";
  if (normalized.includes("limpiador") || normalized.includes("procenex")) return "Limpieza / Limpiador";
  if (normalized.includes("aerosol") || normalized.includes("repelente") || normalized.includes("selton")) return "Limpieza / Insecticida";
  return "Limpieza";
}

function extractQuantityLabel(name) {
  const match = String(name || "").match(/\b\d+(?:[.,]\d+)?\s?(ml|cc|l|lt|lts|g|kg)\b/i);
  return match ? match[0].replace("lt", "l").replace("lts", "l") : "";
}

function mergeProductData(baseProduct, newProduct) {
  if (!baseProduct) return newProduct;
  if (!newProduct) return baseProduct;
  const mergedName = chooseBetterName(baseProduct.name, newProduct.name);
  return {
    ...baseProduct,
    barcode: baseProduct.barcode || newProduct.barcode,
    name: mergedName,
    lastPrice: baseProduct.lastPrice || newProduct.lastPrice,
    metadata: enrichMetadataWithBrand(mergedName, {
      ...(baseProduct.metadata || {}),
      ...(newProduct.metadata || {}),
      imageUrl: baseProduct.metadata?.imageUrl || newProduct.metadata?.imageUrl || ""
    })
  };
}

function chooseBetterName(currentName, candidateName) {
  if (!currentName) return candidateName || "";
  if (!candidateName) return currentName;
  return candidateName.length > currentName.length ? candidateName : currentName;
}

function findBrandInfo(text) {
  const normalizedText = ` ${normalize(text)} `;
  if (!normalizedText.trim()) return null;

  for (const entry of ARGENTINA_BRAND_DATABASE) {
    for (const brand of entry.brands) {
      const normalizedBrand = normalize(brand);
      if (!normalizedBrand) continue;
      const brandPattern = new RegExp(`(^|\\s)${escapeRegExp(normalizedBrand).replaceAll("\\ ", "\\s+")}(\\s|$)`);
      if (brandPattern.test(normalizedText)) {
        return {
          company: entry.company,
          brand: canonicalBrandName(brand),
          category: entry.category
        };
      }
    }
  }
  return null;
}

function enrichMetadataWithBrand(name, metadata = {}) {
  const brandInfo = findBrandInfo([metadata.brand, name].filter(Boolean).join(" "));
  if (!brandInfo) return metadata;
  return {
    ...metadata,
    brand: metadata.brand || brandInfo.brand,
    company: metadata.company || brandInfo.company,
    category: metadata.category || brandInfo.category,
    brandSource: metadata.brandSource || "Base de marcas Argentina"
  };
}

function canonicalBrandName(brand) {
  const normalized = normalize(brand);
  const aliases = {
    hellmanns: "Hellmann's",
    "la serenisma": "La Serenisima",
    "la serenisima": "La Serenisima",
    ayudin: "Ayudin",
    "mr musculo": "Mr Musculo",
    "h s": "Head & Shoulders",
    lays: "Lay's"
  };
  return aliases[normalized] || brand;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchExternalProduct(barcode, hints = {}) {
  if (!barcode || !navigator.onLine) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  const fields = [
    "code",
    "product_name",
    "abbreviated_product_name",
    "generic_name",
    "brands",
    "quantity",
    "categories",
    "product_type",
    "image_url",
    "image_small_url",
    "image_thumb_url",
    "image_front_url",
    "image_front_small_url",
    "image_front_thumb_url",
    "image_front_display_url",
    "selected_images"
  ].join(",");
  const urls = [
    `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`,
    `https://world.openproductsfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(fields)}`,
    `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(barcode)}?product_type=all&cc=ar&lc=es&fields=${encodeURIComponent(fields)}`
  ];

  try {
    let bestProduct = null;
    const priceReference = findArgentinaCatalogProduct(barcode)?.metadata?.priceReference || await fetchSepaDatasetReference(controller.signal);
    for (const url of urls) {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      const product = data.product;
      if (!product) continue;

      const name = cleanProductName(product);
      if (!name) continue;
      if (hints.product?.name && scoreMarketplaceTitle(searchTokens(hints.product.name), name) < 0.35) continue;

      const foundProduct = {
        barcode,
        name,
        lastPrice: "",
        metadata: enrichMetadataWithBrand(name, {
          brand: firstText(product.brands),
          quantityLabel: firstText(product.quantity),
          category: firstText(product.categories),
          productType: firstText(product.product_type),
          imageUrl: extractProductImage(product),
          source: url.includes("openproductsfacts") ? "Open Products Facts" : "Open Food Facts",
          priceReference
        })
      };
      if (foundProduct.metadata.imageUrl) return foundProduct;
      bestProduct = bestProduct || foundProduct;
    }
    const marketplaceProduct = await fetchMercadoLibreProduct(barcode, controller.signal, bestProduct || hints.product);
    if (marketplaceProduct?.metadata?.imageUrl) {
      return bestProduct
        ? {
            ...bestProduct,
          metadata: enrichMetadataWithBrand(bestProduct.name, {
            ...bestProduct.metadata,
            imageUrl: marketplaceProduct.metadata.imageUrl,
            source: `${bestProduct.metadata.source} + Mercado Libre`,
            priceReference: bestProduct.metadata.priceReference || priceReference
          })
          }
        : marketplaceProduct;
    }
    if (marketplaceProduct && priceReference) {
      marketplaceProduct.metadata.priceReference = priceReference;
    }
    return bestProduct || marketplaceProduct || (priceReference ? { barcode, name: "", lastPrice: "", metadata: { priceReference, source: "Pricely" } } : null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSepaDatasetReference(signal) {
  sepaDatasetReferencePromise = sepaDatasetReferencePromise || fetch(SEPA_DATASET_API, { signal, cache: "no-store" })
    .then((response) => response.ok ? response.json() : null)
    .then((data) => {
      const resources = data?.result?.resources || [];
      const latest = resources
        .filter((resource) => String(resource.format || "").toLowerCase() === "zip" && resource.url)
        .sort((a, b) => new Date(b.last_modified || 0) - new Date(a.last_modified || 0))[0];

      if (!latest) return null;
      return {
        source: "SEPA / Datos Abiertos",
        url: latest.url,
        checkedAt: latest.last_modified ? latest.last_modified.slice(0, 10) : "",
        datasetName: latest.name || "Base SEPA",
        official: true
      };
    })
    .catch(() => null);

  return sepaDatasetReferencePromise;
}

async function fetchPriceReference(barcode, signal) {
  try {
    const url = `https://pricely.ar/product/${encodeURIComponent(barcode)}`;
    const response = await fetch(url, { signal, cache: "no-store" });
    if (!response.ok) return null;
    const html = await response.text();
    const bestPrice = extractPriceAfterLabel(html, "Mejor precio");
    if (!bestPrice) return null;

    return {
      bestPrice,
      averagePrice: extractPriceAfterLabel(html, "Promedio"),
      dealPrice: extractPriceAfterLabel(html, "Con descuentos"),
      source: "Pricely",
      url,
      checkedAt: new Date().toISOString().slice(0, 10)
    };
  } catch {
    return null;
  }
}

function extractPriceAfterLabel(html, label) {
  const index = html.indexOf(label);
  if (index < 0) return null;
  const chunk = html.slice(index, index + 420).replace(/<[^>]+>/g, " ");
  const match = chunk.match(/\$\s*([0-9.]+)\s*,\s*([0-9]{2})/);
  if (!match) return null;
  return Number(`${match[1].replaceAll(".", "")}.${match[2]}`);
}

async function fetchMercadoLibreProduct(barcode, signal, hintProduct = null) {
  try {
    const queries = buildMercadoLibreQueries(barcode, hintProduct);
    for (const query of queries) {
      const url = `https://api.mercadolibre.com/sites/MLA/search?q=${encodeURIComponent(query)}&limit=8`;
      const response = await fetch(url, { signal, cache: "no-store" });
      if (!response.ok) continue;
      const data = await response.json();
      const result = pickMercadoLibreResult(query, data.results || []);
      if (!result?.title) continue;

      return {
        barcode,
        name: cleanMarketplaceTitle(result.title),
        lastPrice: "",
        metadata: enrichMetadataWithBrand(result.title, {
          brand: hintProduct?.metadata?.brand || "",
          quantityLabel: hintProduct?.metadata?.quantityLabel || "",
          category: hintProduct?.metadata?.category || "",
          productType: "marketplace",
          imageUrl: improveMercadoLibreImage(result.thumbnail || result.secure_thumbnail || ""),
          source: `Mercado Libre (${query})`
        })
      };
    }
    return null;
  } catch {
    return null;
  }
}

function buildMercadoLibreQueries(barcode, hintProduct) {
  const brand = hintProduct?.metadata?.brand || "";
  const company = hintProduct?.metadata?.company || "";
  const name = hintProduct?.name || "";
  const brandInfo = findBrandInfo(`${brand} ${name}`);
  const detectedBrand = brandInfo?.brand || brand;
  return uniqueValues([
    simplifyProductSearch(`${detectedBrand} ${name}`),
    simplifyProductSearch(name),
    simplifyProductSearch(removePackaging(name)),
    simplifyProductSearch(`${detectedBrand} ${removePackaging(name)}`),
    simplifyProductSearch(`${company} ${removePackaging(name)}`),
    barcode
  ]).filter((query) => query && query.length >= 4);
}

function pickMercadoLibreResult(query, results) {
  const queryTokens = searchTokens(query);
  const isBarcode = /^\d{8,14}$/.test(query.trim());

  if (isBarcode) {
    return results.find((item) => item.thumbnail || item.secure_thumbnail) || results[0] || null;
  }

  const scored = results
    .map((item) => ({
      item,
      score: scoreMarketplaceTitle(queryTokens, item.title || "") + (item.thumbnail || item.secure_thumbnail ? 0.15 : 0)
    }))
    .filter((entry) => entry.score >= 0.48)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item || null;
}

function scoreMarketplaceTitle(queryTokens, title) {
  if (!queryTokens.length || !title) return 0;
  const titleTokens = searchTokens(title);
  const hits = queryTokens.filter((token) => titleTokens.some((titleToken) => titleToken.includes(token) || token.includes(titleToken))).length;
  return hits / queryTokens.length;
}

function searchTokens(value) {
  const stopwords = new Set(["de", "del", "la", "el", "los", "las", "y", "x", "por", "con", "sin", "para", "ml", "gr", "g", "cc"]);
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

function simplifyProductSearch(value) {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removePackaging(value) {
  return String(value || "")
    .replace(/\b\d+([.,]\d+)?\s?(ml|cc|l|litro|litros|g|gr|kg|kilo|kilos|un|unidad|unidades)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueValues(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalize(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanMarketplaceTitle(title) {
  return String(title || "").replace(/\s+/g, " ").trim();
}

function improveMercadoLibreImage(url) {
  return String(url || "").replace("-I.jpg", "-O.jpg").replace("-I.webp", "-O.webp");
}

function cleanProductName(product) {
  const baseName = firstText(product.product_name) || firstText(product.abbreviated_product_name) || firstText(product.generic_name);
  const brand = firstText(product.brands);
  const quantity = firstText(product.quantity);
  return [brand, baseName, quantity].filter(Boolean).join(" - ");
}

function firstText(value) {
  return String(value || "").split(",")[0].trim();
}

function extractProductImage(product) {
  const direct =
    firstText(product.image_front_display_url) ||
    firstText(product.image_front_small_url) ||
    firstText(product.image_front_thumb_url) ||
    firstText(product.image_front_url) ||
    firstText(product.image_small_url) ||
    firstText(product.image_thumb_url) ||
    firstText(product.image_url);
  if (direct) return direct;

  const selectedUrl = findFirstImageUrl(product.selected_images);
  if (selectedUrl) return selectedUrl;

  return "";
}

function findFirstImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value.startsWith("http") ? value : "";
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstImageUrl(item);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const preferredKeys = ["es", "en", "display", "small", "front", "url"];
    for (const key of preferredKeys) {
      const found = findFirstImageUrl(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = findFirstImageUrl(item);
      if (found) return found;
    }
  }
  return "";
}

async function fillProductFromBarcode(force = false) {
  clearTimeout(barcodeLookupTimer);
  const barcode = els.barcodeInput.value.trim();
  if (!barcode || (!force && els.productNameInput.value.trim())) return;
  renderLookupInfo({
    name: els.productNameInput.value.trim() || "Buscando producto...",
    metadata: { source: "consulta online" },
    loading: true
  });
  const product = await resolveBarcodeProduct(barcode, { refreshMissingImage: true });
  if (product?.name) {
    els.productNameInput.value = product.name;
    els.productForm.dataset.productMetadata = JSON.stringify(product.metadata || {});
  }
  renderLookupInfo(product);
}

async function saveProductPhoto() {
  const file = els.productPhotoInput.files?.[0];
  if (!file) return;

  try {
    const imageUrl = await resizeImageFile(file);
    const metadata = readProductMetadata();
    metadata.imageUrl = imageUrl;
    metadata.source = metadata.source || "foto local";
    els.productForm.dataset.productMetadata = JSON.stringify(metadata);
    renderLookupInfo({
      name: els.productNameInput.value.trim() || "Producto con foto",
      metadata,
      source: "local"
    });
    toast("Foto agregada al producto.");
  } catch {
    toast("No pude cargar esa foto. Proba con otra imagen.");
  }
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 480;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = reject;
      image.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readProductMetadata() {
  try {
    return JSON.parse(els.productForm.dataset.productMetadata || "{}");
  } catch {
    return {};
  }
}

function renderLookupInfo(product) {
  if (!product) {
    els.productLookupInfo.hidden = true;
    els.productLookupInfo.innerHTML = "";
    return;
  }

  const metadata = product?.metadata || {};
  const hasInfo = product?.name || metadata.brand || metadata.quantityLabel || metadata.category || metadata.imageUrl;

  const source = product.loading
    ? "consulta online"
    : product.source === "local"
      ? "catalogo local"
      : product.source === "missing"
        ? "sin resultado"
        : metadata.source || "datos guardados";
  const details = [
    metadata.company ? `Empresa: ${metadata.company}` : "",
    metadata.brand ? `Marca: ${metadata.brand}` : "",
    metadata.quantityLabel ? `Presentacion: ${metadata.quantityLabel}` : "",
    metadata.category ? `Categoria: ${metadata.category}` : ""
  ].filter(Boolean);

  els.productLookupInfo.hidden = false;
  els.productLookupInfo.innerHTML = `
    ${metadata.imageUrl ? `<img class="lookup-image" src="${escapeHtml(metadata.imageUrl)}" alt="${escapeHtml(product.name || "Producto")}">` : `<button class="lookup-image placeholder" type="button" id="productPhotoTrigger">Sin foto</button>`}
    <div class="lookup-copy">
      <strong>${escapeHtml(product.name || (hasInfo ? "Producto encontrado" : "Producto no encontrado"))}</strong>
      ${details.length ? `<small>${escapeHtml(details.join(" | "))}</small>` : ""}
      ${!metadata.imageUrl && hasInfo && !product.loading ? "<small>Imagen no disponible en la base consultada.</small>" : ""}
      ${!hasInfo ? "<small>Podés cargarlo manualmente y quedará guardado para la próxima.</small>" : ""}
      <small>Fuente: ${escapeHtml(source)}</small>
      ${priceReferenceHtml(metadata.priceReference, product)}
    </div>
  `;
  $("#productPhotoTrigger")?.addEventListener("click", () => els.productPhotoInput.click());
}

function priceReferenceHtml(reference, product) {
  const officialUrl = officialPriceUrl(product?.barcode || product?.metadata?.barcode || "");
  if (!reference?.bestPrice) {
    const referenceUrl = reference?.url || officialUrl;
    if (!referenceUrl) return "";
    const checkedAt = reference?.checkedAt ? `Actualizado: ${escapeHtml(reference.checkedAt)}` : "";
    return `
      <div class="price-reference">
        <small>Fuente principal: SEPA / Precios Claros</small>
        <strong>Consultar precio oficial</strong>
        <small>SEPA publica precios diarios por comercio, ubicación, precio de lista y promociones.</small>
        ${checkedAt ? `<small>${checkedAt}</small>` : ""}
        <small><a href="${escapeHtml(referenceUrl)}" target="_blank" rel="noopener">${reference?.official ? "Descargar base SEPA oficial" : "Abrir Precios Claros"}</a></small>
      </div>
    `;
  }

  const checkedAt = reference.checkedAt ? `Actualizado: ${escapeHtml(reference.checkedAt)}` : "";
  const average = reference.averagePrice ? `Promedio: ${currency.format(reference.averagePrice)}` : "";
  const details = [average, checkedAt].filter(Boolean).join(" | ");
  return `
    <div class="price-reference">
      <small>Fuente principal: SEPA / Precios Claros</small>
      <strong>Comparar precio oficial</strong>
      ${officialUrl ? `<small><a href="${escapeHtml(officialUrl)}" target="_blank" rel="noopener">Abrir Precios Claros</a></small>` : ""}
      <small>Referencia auxiliar encontrada: ${currency.format(reference.bestPrice)}</small>
      ${details ? `<small>${details}</small>` : ""}
      ${reference.url ? `<small><a href="${escapeHtml(reference.url)}" target="_blank" rel="noopener">Ver referencia auxiliar: ${escapeHtml(reference.source || "referencia")}</a></small>` : ""}
    </div>
  `;
}

function officialPriceUrl(barcode) {
  return barcode ? "https://www.preciosclaros.gob.ar/#!/buscar-productos" : "";
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
  openScanner(async (barcode) => {
    const product = await resolveBarcodeProduct(barcode, { refreshMissingImage: true });
    openProductDialog({
      context: "stock",
      barcode,
      name: product?.name || "",
      quantity: 1,
      unitPrice: product?.lastPrice || 0,
      productInfo: product
    });
  });
}

function adjustStock(name, barcode, quantity, replace) {
  const normalized = normalize(name);
  const item = state.stock.find((entry) => (barcode && entry.barcode === barcode) || normalize(entry.name) === normalized);
  const product = barcode ? findProductByBarcode(barcode) : state.products.find((entry) => normalize(entry.name) === normalized);
  if (item) {
    item.barcode = barcode || item.barcode;
    item.name = name;
    item.quantity = replace ? quantity : Math.max(0, Number(item.quantity || 0) + quantity);
    item.metadata = { ...(item.metadata || {}), ...(product?.metadata || {}) };
    item.updatedAt = new Date().toISOString();
  } else {
    state.stock.push({
      id: uid("stock"),
      barcode,
      name,
      quantity: Math.max(0, quantity),
      metadata: product?.metadata || {},
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
        <div class="item-identity">
          ${productImage(item.metadata?.imageUrl, item.name)}
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${item.barcode ? `Codigo ${escapeHtml(item.barcode)}` : "Sin codigo"}</small>
          </div>
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
    marca: item.metadata?.brand || "",
    presentacion: item.metadata?.quantityLabel || "",
    categoria: item.metadata?.category || "",
    cantidad: item.quantity,
    precioUnitario: item.unitPrice,
    promocion: item.promo?.enabled ? `${item.promo.quantity} por ${item.promo.price}` : "",
    total: item.total
  })));

  const html = `
    <html>
      <head><meta charset="utf-8"></head>
      <body>
        ${tableHtml("Compras", rows, ["fecha", "codigo", "producto", "marca", "presentacion", "categoria", "cantidad", "precioUnitario", "promocion", "total"])}
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

function productImage(url, name) {
  if (!url) return "";
  return `<img class="product-thumb" src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy">`;
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
window.fillProductFromBarcode = fillProductFromBarcode;
