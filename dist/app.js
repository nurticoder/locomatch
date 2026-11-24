import {
  today,
  addDays,
  seedState,
  matchBuyer,
  productIssues,
  createMessage,
  parseCSV,
  csvCell,
} from "./domain.js";
const KEY = "locomatch.v1";
let storageOK = true,
  state;
try {
  const saved = localStorage.getItem(KEY);
  state = saved ? JSON.parse(saved) : seedState();
  if (
    state.version !== 1 ||
    !Array.isArray(state.products) ||
    !Array.isArray(state.buyers) ||
    !Array.isArray(state.drafts) ||
    !Array.isArray(state.audit) ||
    !Array.isArray(state.runs)
  )
    throw Error("Invalid data");
} catch {
  state = seedState();
}
let lang = "en";
try {
  lang = localStorage.getItem("locomatch.lang") === "zh" ? "zh" : "en";
} catch {
  storageOK = false;
}
let page = "workspace",
  stage = "board",
  selected = "p1",
  buyerId = "b1",
  draftId = null,
  search = "",
  filter = "all",
  started = null,
  showExcluded = false;
const $ = (s) => document.querySelector(s),
  t = (en, zh) => (lang === "zh" ? zh : en),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const name = (o) => (lang === "zh" ? o.nameZh || o.name : o.name);
const money = (n) =>
  new Intl.NumberFormat("en-HK", {
    style: "currency",
    currency: "HKD",
    maximumFractionDigits: 0,
  }).format(n);
const product = () =>
  state.products.find((p) => p.id === selected) || state.products[0];
const buyer = () => state.buyers.find((b) => b.id === buyerId);
const dateLabel = (d) =>
  new Intl.DateTimeFormat(lang === "zh" ? "zh-HK" : "en-HK", {
    day: "numeric",
    month: "short",
  }).format(new Date(d + "T00:00:00"));
const icon = (n, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{ grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', jar: '<path d="M7 4h10v4H7zM7 8c-2 1-2 3-2 5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6c0-2 0-4-2-5"/><path d="M5 12h14M5 17h14"/>', users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>', leaf: '<path d="M5 18C2 7 10 3 21 3c0 11-5 17-14 16M6 18 16 8"/>', check: '<path d="m5 12 4 4L19 6"/>', close: '<path d="m6 6 12 12M6 18 18 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/><path d="m8 12 3 3 5-6"/>', file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5"/>', search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>', download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>', mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>', book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v15"/>', refresh: '<path d="M20 7V2l-4 4a8 8 0 1 0 4 10M20 2h-5"/>', edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM14 5l5 5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>', box: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5l9 5"/>' }[n] || ""}</svg>`;
function jar(p, large = false) {
  const a = {
    orange: ["#e9a33a", "#f9d89a", "#d36d22"],
    roselle: ["#a25368", "#eccbd5", "#8e3f55"],
    chilli: ["#73935b", "#d8e5cb", "#53733e"],
    citrus: ["#d2ad42", "#f4e4a6", "#ac8a2b"],
  }[p.accent] || ["#e9a33a", "#f9d89a", "#d36d22"];
  return `<svg class="product-art ${large ? "large" : ""}" viewBox="0 0 160 180" role="img" aria-label="${esc(name(p))} ${t("illustration", "插圖")}"><ellipse cx="80" cy="166" rx="45" ry="7" fill="${a[0]}" opacity=".14"/><rect x="42" y="28" width="76" height="17" rx="5" fill="#324b3c"/><path d="M47 46h66l6 15v86c0 9-8 15-17 15H58c-10 0-17-6-17-15V61z" fill="${a[0]}"/><path d="M48 64v78" stroke="${a[1]}" stroke-width="4" opacity=".7" stroke-linecap="round"/><rect x="40" y="79" width="80" height="59" rx="2" fill="#fffdf4"/><text x="80" y="93" text-anchor="middle" font-family="Georgia,serif" font-size="8" fill="#34543c">LoCoFARMS</text><circle cx="80" cy="111" r="11" fill="${a[0]}"/><path d="M79 100q4-8 11-5-2 7-11 5" fill="#426b42"/><path d="M73 111h14M80 104v14" stroke="${a[2]}" stroke-width="1"/><text x="80" y="131" text-anchor="middle" font-family="Arial,sans-serif" font-size="5.5" fill="#34543c">LOCAL PRODUCE · DEMO</text></svg>`;
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    storageOK = false;
    toast(
      t(
        "Browser storage is full or unavailable. Export a backup before leaving.",
        "瀏覽器儲存空間不足或無法使用。離開前請匯出備份。",
      ),
    );
  }
}
function log(action, detail) {
  state.audit.unshift({
    id: crypto.randomUUID(),
    time: new Date().toISOString(),
    action,
    detail,
  });
  state.audit = state.audit.slice(0, 200);
  persist();
}
let toastTimer;
function toast(msg) {
  clearTimeout(toastTimer);
  $("#toast").textContent = msg;
  $("#toast").classList.add("visible");
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
function button(action, text, cls = "secondary", extra = "") {
  return `<button class="btn ${cls}" data-action="${action}" ${extra}>${text}</button>`;
}
function status(p) {
  const ready = p.status === "verified" && !productIssues(p).length;
  return `<span class="badge ${ready ? "green" : "amber"}">${icon(ready ? "check" : "clock", 14)}${ready ? t("Verified", "已核實") : t("Needs review", "待核實")}</span>`;
}
function shell() {
  const pending = state.products.filter(
    (p) => p.status !== "verified" || productIssues(p).length,
  ).length;
  const nav = [
    ["workspace", "grid", t("Workspace", "工作台")],
    ["products", "jar", t("Product records", "產品記錄")],
    ["buyers", "users", t("Buyer directory", "買家名錄")],
    ["outreach", "mail", t("Outreach", "客戶聯絡")],
  ];
  return `<aside class="sidebar"><a class="brand" href="#" data-nav="workspace"><img src="./mark.svg" alt="" width="39" height="39"><span>LoCoMatch<small>${t("Made for FarmShare", "為 FarmShare 而設")}</small></span></a><div class="workspace-label">${t("Your workbench", "你的工作台")}</div><nav aria-label="${t("Main navigation", "主選單")}">${nav.map(([id, ic, label]) => `<button class="nav-item ${page === id ? "active" : ""}" data-nav="${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${label}</span>${id === "products" && pending ? `<span class="nav-count">${pending}</span>` : ""}${id === "outreach" && state.drafts.length ? `<span class="nav-count">${state.drafts.length}</span>` : ""}</button>`).join("")}</nav><div class="sidebar-bottom"><button class="nav-item ${page === "guide" ? "active" : ""}" data-nav="guide">${icon("book")}<span>${t("Demo & pilot guide", "示範及試行指南")}</span></button><div class="partner"><div class="partner-icon">${icon("leaf", 23)}</div><div>FarmShare<small>CCAI9022 · ${t("Group 3", "第3組")}</small></div></div></div></aside><div class="app-body"><header class="topbar"><span>${t("FarmShare outreach workspace", "FarmShare 客戶聯絡工作台")}</span><div class="top-actions"><span class="demo-label">${t("Demo data", "示範資料")}</span><button class="lang-btn" data-action="language" aria-label="${t("Switch to Traditional Chinese", "切換至英文")}">${lang === "en" ? "繁體中文" : "English"}</button><span class="avatar" title="${t("Demo workspace, no sign-in", "示範工作台，無需登入")}">FS</span></div></header><main id="main" tabindex="-1">${!storageOK ? `<div class="notice amber">${t("Local saving is unavailable. Download a backup before leaving.", "無法在本機儲存，離開前請下載備份。")}</div>` : ""}${renderPage()}</main><footer>${icon("shield", 14)}<span>${t("Fictional products and buyers. Your changes stay in this browser.", "產品及買家均為虛構。更改只儲存在此瀏覽器。")}</span><button data-nav="guide">${t("About this prototype", "關於此原型")}</button></footer></div>`;
}
function render() {
  document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en-HK";
  $("#app").innerHTML = shell();
  bind();
}
function heading(title, desc, actions = "") {
  return `<div class="page-heading"><div><h1>${title}</h1><p>${desc}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</div>`;
}
function renderPage() {
  if (page === "workspace") return stage === "board" ? board() : workflow();
  if (page === "products") return productsPage();
  if (page === "buyers") return buyersPage();
  if (page === "outreach") return outreachPage();
  return guidePage();
}
function board() {
  const ready = state.products.filter(
      (p) => p.status === "verified" && !productIssues(p).length,
    ),
    pending = state.products.filter((p) => !ready.includes(p)),
    p =
      state.products.find((p) => p.id === "p1") ||
      ready[0] ||
      state.products[0];
  const matches = p
    ? state.buyers.map((b) => matchBuyer(p, b)).filter((m) => m.eligible)
    : [];
  return `${heading(t("Good food. Good connections.", "好食物，連繫好買家。"), t("Turn a verified product update into your next buyer offer.", "將已核實的產品更新，化成下一份買家供應建議。"), button("capture", icon("plus") + t("Add product update", "新增產品更新"), "primary"))}<div class="workflow-strip" aria-label="${t("How it works", "運作流程")}">${[
    ["file", "Capture", "收集"],
    ["shield", "Verify", "核實"],
    ["users", "Match", "配對"],
    ["edit", "Draft & review", "草擬及審閱"],
  ]
    .map(
      ([ic, en, zh], i) =>
        `<div>${icon(ic, 18)}<span>${t(en, zh)}</span>${i < 3 ? '<span class="step-line"></span>' : ""}</div>`,
    )
    .join(
      "",
    )}</div><div class="board-grid"><section class="featured"><div class="feature-top"><span class="section-tag">${t("Ready to offer", "可供聯絡")}</span>${p ? status(p) : ""}</div><div class="feature-body"><div class="feature-copy"><h2>${p ? esc(name(p)) : t("Add your first product", "新增首項產品")}</h2><p>${t("A small batch, ready for its next home.", "小批量好食物，準備走進下一間店。")}</p>${p ? `<div class="product-numbers"><div><strong>${p.quantity}</strong><span>${t("jars available", "罐可供應")}</span></div><div><strong>${money(p.price)}</strong><span>${t("per jar", "每罐")}</span></div><div><strong>${matches.length}</strong><span>${t("eligible buyers", "位合適買家")}</span></div></div>${button("select-match", t("Find suitable buyers", "尋找合適買家"), "primary", `data-id="${p.id}"`)}<span class="tiny-note">${t("You review every offer before sharing.", "每份建議均由你審閱後才分享。")}</span>` : ""}</div><div class="feature-art">${p ? jar(p, true) : ""}<span class="art-note">${t("Locally made, thoughtfully matched.", "本地製作，用心配對。")}</span></div></div><div class="feature-foot">${icon("shield", 17)}${t("Matches use stock, budget, shelf life and delivery rules.", "按庫存、預算、保質期及配送條件配對。")}</div></section><section class="review-panel"><div class="section-head"><h2>${t("A little attention first", "先處理這些事項")}</h2><span class="count-pill">${pending.length}</span></div><p>${t("These records need a staff check before outreach.", "這些記錄需經職員核實，才可用於聯絡買家。")}</p>${pending.map((p) => `<button class="review-item" data-action="verify" data-id="${p.id}"><span class="mini-product ${p.accent}">${icon("jar", 22)}</span><span><strong>${esc(name(p))}</strong><small>${!p.confirmed ? t("Confirm finished stock", "確認製成品庫存") : p.price === "" ? t("Approved price missing", "尚欠核准價格") : t("Check source details", "核對來源資料")}</small></span><span class="review-symbol">${icon("edit", 17)}</span></button>`).join("") || `<div class="empty compact">${icon("check", 28)}<h3>${t("All caught up", "全部已處理")}</h3><p>${t("Every product record is ready for matching.", "所有產品記錄均可配對。")}</p></div>`}<div class="tip"><span>${icon("info", 19)}</span><p>${t("An estimate is not available stock. Verification keeps offers useful.", "預估產量並非可售庫存。核實資料，建議才實用。")}</p></div></section></div><section class="section"><div class="section-head"><div><h2>${t("On the batch board", "產品一覽")}</h2><p>${ready.length} ${t("verified", "已核實")}<span class="separator">/</span>${pending.length} ${t("to review", "待核實")}</p></div><button class="text-btn" data-nav="products">${t("View product records", "查看產品記錄")}</button></div><div class="batch-grid">${state.products
    .slice(0, 4)
    .map(
      (p) =>
        `<button class="batch-card" data-action="${p.status === "verified" ? "select-match" : "verify"}" data-id="${p.id}"><div class="batch-art ${p.accent}">${jar(p)}</div><div class="batch-info">${status(p)}<h3>${esc(name(p))}</h3><p>${p.quantity} ${t("jars", "罐")}<span class="separator">/</span>${p.price ? money(p.price) : t("Price to confirm", "價格待確認")}</p><span class="batch-link">${p.status === "verified" ? t("Match buyers", "配對買家") : t("Review record", "核實記錄")}${icon(p.status === "verified" ? "users" : "edit", 16)}</span></div></button>`,
    )
    .join("")}</div></section>`;
}
function workflow() {
  const p = product();
  if (!p) {
    stage = "board";
    return board();
  }
  return `<button class="back-link" data-action="board">${t("Back to workspace", "返回工作台")}</button>${heading(stage === "verify" ? t("Check the facts once. Reuse them.", "核實一次，重複使用。") : stage === "match" ? t("The right offer starts with fit.", "合適的建議，始於合適的配對。") : t("A useful message, ready for your review.", "一份實用訊息，等待你的審閱。"), t("Capture, verify, match, then review. You stay in control.", "收集、核實、配對、審閱。每一步由你掌握。"))}<nav class="steps" aria-label="${t("Offer preparation", "準備供應建議")}">${[
    ["capture", "Capture", "收集"],
    ["verify", "Verify facts", "核實資料"],
    ["match", "Match buyers", "配對買家"],
    ["draft", "Draft & review", "草擬及審閱"],
  ]
    .map(
      ([id, en, zh], i) =>
        `<button class="step ${stage === id ? "current" : ""}" data-action="stage" data-stage="${id}" ${id === "draft" && !draftId ? "disabled" : ""} ${stage === id ? 'aria-current="step"' : ""}><span class="step-num">${i + 1}</span><span>${t(en, zh)}</span></button>`,
    )
    .join(
      "",
    )}</nav>${stage === "verify" ? verifyPage(p) : stage === "match" ? matchPage(p) : draftPage()}`;
}
function productSummary(p) {
  return `<aside class="summary-panel"><div class="summary-art ${p.accent}">${jar(p)}</div><div class="summary-content">${status(p)}<h2>${esc(name(p))}</h2><p class="muted">${esc(p.notes)}</p><dl><div><dt>${t("Available", "可供應")}</dt><dd>${p.quantity} ${t("jars", "罐")}</dd></div><div><dt>${t("Price per jar", "每罐價格")}</dt><dd>${p.price ? money(p.price) : t("Not confirmed", "待確認")}</dd></div><div><dt>${t("Best before", "最佳食用日期")}</dt><dd>${esc(p.expiry) || "—"}</dd></div><div><dt>${t("Storage", "儲存")}</dt><dd>${p.storage === "Chilled" ? t("Chilled", "冷藏") : t("Ambient", "室溫")}</dd></div></dl><div class="source-note">${icon("file", 17)}<span>${esc(p.source)}<small>${p.reviewer ? `${t("Checked by", "核實者")} ${esc(p.reviewer)}` : t("Awaiting staff verification", "等待職員核實")}</small></span></div>${button("edit-product", icon("edit", 16) + t("Edit product details", "編輯產品資料"), "quiet", `data-id="${p.id}"`)}</div></aside>`;
}
const issueZh = {
  "Product name is missing": "尚欠產品名稱",
  "Confirm a positive whole-number quantity": "請確認數量為正整數",
  "Approved price is missing": "尚欠核准價格",
  "Availability date is missing": "尚欠可供應日期",
  "A valid future expiry date is needed": "需要有效的未來到期日",
  "Expiry is before availability": "到期日早於可供應日期",
  "Storage requirements are missing": "尚欠儲存要求",
  "Delivery conditions are incomplete": "配送條件不完整",
  "Source record is missing": "尚欠來源記錄",
  "Finished stock has not been confirmed": "尚未確認製成品庫存",
};
function verifyPage(p) {
  const issues = productIssues(p);
  return `<div class="detail-layout">${productSummary(p)}<section class="panel"><div class="section-head"><h2>${t("Verify against the source", "與來源記錄核對")}</h2>${icon("shield", 22)}</div><p class="muted">${t("Only a named reviewer can mark this record as verified. A photo or transcript alone does not prove stock.", "必須由具名審閱者核實記錄。照片或文字記錄本身無法證明庫存。")}</p>${issues.length ? `<div class="notice amber"><strong>${t("Resolve before verification", "核實前請先處理")}</strong><ul>${issues.map((i) => `<li>${esc(lang === "zh" ? issueZh[i] || i : i)}</li>`).join("")}</ul>${button("edit-product", t("Complete product details", "補齊產品資料"), "secondary", `data-id="${p.id}"`)}</div>` : `<div class="notice green">${icon("check", 19)}${t("All required fields are complete. Check them against the operational record.", "所有必填資料已齊全。請與營運記錄核對。")}</div>`}<form id="verify-form"><label class="field"><span>${t("Reviewer name", "審閱者姓名")}</span><input name="reviewer" required maxlength="80" placeholder="${t("Your name", "你的姓名")}" value="${esc(p.reviewer)}"></label><div class="checklist">${[
    [
      "stock",
      t(
        "I confirmed finished stock and quantity against the source.",
        "我已與來源核對製成品庫存及數量。",
      ),
    ],
    [
      "facts",
      t(
        "I checked price, availability, expiry and storage.",
        "我已核對價格、供應日期、到期日及儲存方式。",
      ),
    ],
    [
      "delivery",
      t("I checked delivery areas and conditions.", "我已核對配送地區及條件。"),
    ],
  ]
    .map(
      ([id, label]) =>
        `<label class="checkbox-row"><input type="checkbox" name="${id}" required><span>${label}</span></label>`,
    )
    .join(
      "",
    )}</div><div class="form-footer"><p>${t("Verification makes this record available for matching.", "核實後，此記錄可用於配對。")}</p><button class="btn primary" type="submit" ${issues.length ? "disabled" : ""}>${icon("check", 18)}${t("Verify & find buyers", "核實並配對買家")}</button></div></form></section></div>`;
}
function matchPage(p) {
  const results = state.buyers.map((b) => matchBuyer(p, b)),
    eligible = results.filter((m) => m.eligible),
    excluded = results.filter((m) => !m.eligible);
  return `<div class="detail-layout">${productSummary(p)}<section><div class="match-header"><div><h2>${eligible.length} ${t("buyers meet every rule", "位買家符合所有條件")}</h2><p>${t("Each offer is checked separately. Stock is not reserved.", "每份建議獨立檢查，庫存尚未預留。")}</p></div><span class="badge neutral">${t("Rule-based matching", "規則配對")}</span></div>${p.status !== "verified" || productIssues(p).length ? `<div class="notice amber">${t("Verify this product before creating an offer.", "請先核實此產品，才可建立建議。")}${button("verify", t("Review product", "核實產品"), "secondary", `data-id="${p.id}"`)}</div>` : ""}<div class="buyer-matches">${eligible.map((m, i) => `<article class="match-card"><div class="match-card-top"><span class="buyer-avatar tone-${i % 3}">${esc(m.buyer.initials)}</span><div><h3>${esc(name(m.buyer))}</h3><p>${t(m.buyer.type, m.buyer.typeZh)}<span class="separator">/</span>${esc(m.buyer.district)}</p></div><span class="match-pass">${icon("check", 16)}${t("All checks passed", "全部通過")}</span></div><p class="buyer-note">${esc(t(m.buyer.notes, m.buyer.notesZh))}</p><div class="buyer-terms"><span><strong>${m.buyer.quantity}</strong> ${t("jars requested", "罐需求")}</span><span>${t("Budget", "預算")} <strong>${money(m.buyer.maxPrice)}</strong> ${t("/ jar", "／罐")}</span><span>${t("Subtotal", "產品金額")} <strong>${money(m.buyer.quantity * p.price)}</strong></span></div><div class="match-card-bottom"><details><summary>${t("Why this match?", "為何配對成功？")}</summary>${checksHTML(m)}</details>${button("new-draft", t("Prepare offer", "準備建議"), "primary", `data-buyer="${m.buyer.id}"`)}</div></article>`).join("") || `<div class="empty panel">${icon("users", 34)}<h3>${t("No eligible buyers yet", "暫無合適買家")}</h3><p>${t("Review the reasons below. Keep buyer requirements accurate.", "請查看下方原因，保持買家要求準確。")}</p></div>`}</div><details class="excluded" ${showExcluded ? "open" : ""}><summary>${t("Not eligible", "未符合條件")} (${excluded.length})<span>${t("See what did not fit", "查看未符合的原因")}</span></summary>${excluded.map((m) => `<div class="excluded-row"><div><strong>${esc(name(m.buyer))}</strong><p>${m.failed.map((c) => esc(t(c.label, c.zh))).join(", ")}</p></div><details><summary>${t("View checks", "查看檢查")}</summary>${checksHTML(m)}</details></div>`).join("")}</details><p class="muted footnote">${t("Buyers are fictional and authorisation is simulated for this demo. No match score is invented by AI.", "買家均為虛構，授權狀態僅供示範。配對結果並非由AI推測。")}</p></section></div>`;
}
function checksHTML(m) {
  return `<ul class="rule-checks">${m.checks.map((c) => `<li class="${c.ok ? "pass" : "fail"}"><span>${icon(c.ok ? "check" : "close", 16)}</span><div><strong>${t(c.label, c.zh)}</strong><small>${esc(c.detail)}</small></div></li>`).join("")}</ul>`;
}
const fingerprint = (p, b) => JSON.stringify([p, b]);
function draftIsCurrent(d) {
  const p = state.products.find((p) => p.id === d.productId),
    b = state.buyers.find((b) => b.id === d.buyerId);
  return (
    !!p &&
    !!b &&
    d.fingerprint === fingerprint(p, b) &&
    matchBuyer(p, b).eligible
  );
}
function draftPage() {
  const d = state.drafts.find((d) => d.id === draftId);
  if (!d) {
    stage = "match";
    return matchPage(product());
  }
  const p = state.products.find((p) => p.id === d.productId),
    b = state.buyers.find((b) => b.id === d.buyerId);
  const valid = draftIsCurrent(d);
  return `<div class="draft-layout"><section class="panel draft-editor"><div class="section-head"><div><span class="section-tag">${t("Offer draft", "供應建議草稿")}</span><h2>${esc(name(b))}</h2></div><span id="approval-status" class="badge ${d.approved && valid ? "green" : "amber"}">${t(d.approved && valid ? "Reviewed" : "Needs review", d.approved && valid ? "已審閱" : "待審閱")}</span></div><div class="draft-controls"><label class="field"><span>${t("Format", "格式")}</span><select id="draft-channel"><option value="email" ${d.channel === "email" ? "selected" : ""}>Email</option><option value="whatsapp" ${d.channel === "whatsapp" ? "selected" : ""}>WhatsApp</option></select></label><label class="field"><span>${t("Message language", "訊息語言")}</span><select id="draft-language"><option value="en" ${d.language === "en" ? "selected" : ""}>English</option><option value="zh" ${d.language === "zh" ? "selected" : ""}>繁體中文</option></select></label></div><div class="template-note">${icon("file", 16)}${t("Built from verified facts using a reusable template.", "使用範本，根據已核實資料草擬。")}</div>${!valid ? `<div class="notice amber" role="alert">${t("The product or buyer record changed. Recheck the match and prepare a fresh draft.", "產品或買家資料已更改。請重新配對及建立草稿。")}${button("select-match", t("Recheck match", "重新配對"), "secondary", `data-id="${d.productId}"`)}</div>` : ""}<label class="field"><span class="sr-only">${t("Edit offer message", "編輯建議訊息")}</span><textarea id="message-editor" rows="19" ${valid ? "" : "disabled"}>${esc(d.message)}</textarea></label><div class="editor-footer"><span id="save-status" role="status" aria-live="polite">${t("Saved in this browser", "已儲存在此瀏覽器")}</span><span>${t("Editing clears approval.", "編輯後須重新審閱。")}</span></div></section><aside><section class="panel offer-facts"><h2>${t("Facts behind this offer", "這份建議的資料依據")}</h2><div class="offer-product">${jar(p)}<div><strong>${esc(name(p))}</strong><small>${d.quantity} ${t("jars", "罐")}<span class="separator">/</span>${money(p.price)} ${t("each", "每罐")}</small></div></div><dl><div><dt>${t("Product subtotal", "產品金額")}</dt><dd>${money(d.quantity * p.price)}</dd></div><div><dt>${t("Best before", "最佳食用日期")}</dt><dd>${p.expiry}</dd></div><div><dt>${t("Source", "來源")}</dt><dd>${esc(p.source)}</dd></div></dl><p class="muted">${t("No environmental, food-safety or sales claims are added.", "不會加入未經核實的環境、食安或銷售聲明。")}</p></section><section class="panel approval-panel"><h2>${t("Your review comes last", "最後由你審閱")}</h2><p>${t("Check the edited message against these facts before sharing.", "分享前，請將編輯後的訊息與這些資料核對。")}</p><form id="approve-form"><label class="field"><span>${t("Sales reviewer", "銷售審閱者")}</span><input name="reviewer" required maxlength="80" value="${esc(d.approvedBy || "")}" placeholder="${t("Your name", "你的姓名")}"></label><div class="checklist">${[t("Buyer and outreach permission checked", "已核對買家及聯絡授權"), t("Stock, price and dates are accurate", "庫存、價格及日期準確"), t("Delivery terms and wording checked", "已核對配送條件及內容")].map((label, i) => `<label class="checkbox-row"><input name="check${i}" type="checkbox" required ${d.approved && valid ? "checked" : ""}><span>${label}</span></label>`).join("")}</div><button class="btn primary full" type="submit" ${!valid ? "disabled" : ""}>${icon("check", 18)}${t(d.approved ? "Approve again" : "Approve message", d.approved ? "再次批准" : "批准訊息")}</button></form><div class="export-actions">${button("copy", t("Copy message", "複製訊息"), "secondary", d.approved && valid ? "" : "disabled")}${button("download-offer", icon("download", 16) + t("Download", "下載"), "secondary", d.approved && valid ? "" : "disabled")}${d.channel === "whatsapp" ? button("whatsapp", t("Open WhatsApp", "開啟 WhatsApp"), "secondary full", d.approved && valid ? "" : "disabled") : ""}</div><p class="footnote">${t("Nothing is sent automatically. Opening WhatsApp lets you choose a recipient and send there.", "不會自動發送訊息。開啟 WhatsApp 後，由你選擇收件者並發送。")}</p>${d.approved && valid ? button("contacted", t("Record contact / follow-up", "記錄聯絡及跟進"), "quiet full", `data-id="${d.id}"`) : ""}</section></aside></div>`;
}
function productsPage() {
  const list = state.products.filter(
    (p) =>
      (filter === "all" ||
        (filter === "verified"
          ? p.status === "verified" && !productIssues(p).length
          : p.status !== "verified" || productIssues(p).length)) &&
      `${p.name} ${p.nameZh}`.toLowerCase().includes(search.toLowerCase()),
  );
  return `${heading(t("Product records", "產品記錄"), t("A small, reliable set of facts for outreach.", "一組精簡可靠的資料，支援客戶聯絡。"), button("import", icon("download", 18) + t("Import CSV", "匯入CSV"), "secondary") + button("capture", icon("plus", 18) + t("Add update", "新增更新"), "primary"))}<div class="toolbar"><label class="search-box">${icon("search", 19)}<input id="product-search" type="search" aria-label="${t("Search products", "搜尋產品")}" placeholder="${t("Search product records", "搜尋產品記錄")}" value="${esc(search)}"></label><label class="field inline-field"><span class="sr-only">${t("Record status", "記錄狀態")}</span><select id="product-filter"><option value="all" ${filter === "all" ? "selected" : ""}>${t("All records", "所有記錄")}</option><option value="verified" ${filter === "verified" ? "selected" : ""}>${t("Verified", "已核實")}</option><option value="pending" ${filter === "pending" ? "selected" : ""}>${t("Needs review", "待核實")}</option></select></label>${button("sample-csv", t("CSV template", "CSV範本"), "quiet")}</div><div class="table-wrap"><table><thead><tr>${[t("Product", "產品"), t("Stock / price", "庫存／價格"), t("Best before", "最佳食用日期"), t("Status", "狀態"), t("Next action", "下一步")].map((v) => `<th scope="col">${v}</th>`).join("")}</tr></thead><tbody>${list.map((p) => `<tr><td><div class="table-product"><span class="mini-product ${p.accent}">${icon("jar", 23)}</span><div><strong>${esc(name(p))}</strong><small>${esc(p.source)}</small></div></div></td><td><strong>${p.quantity} ${t("jars", "罐")}</strong><small>${p.price ? money(p.price) : t("Price missing", "尚欠價格")}</small></td><td>${esc(p.expiry) || "—"}<small>${p.storage === "Chilled" ? t("Chilled", "冷藏") : t("Ambient", "室溫")}</small></td><td>${status(p)}</td><td>${button(p.status === "verified" && !productIssues(p).length ? "select-match" : "verify", p.status === "verified" && !productIssues(p).length ? t("Match buyers", "配對買家") : t("Review record", "核實記錄"), "secondary", `data-id="${p.id}"`)}</td></tr>`).join("") || `<tr><td colspan="5"><div class="empty"><h3>${t("No products found", "找不到產品")}</h3><p>${t("Try another search or add a product update.", "請嘗試其他搜尋字詞，或新增產品更新。")}</p></div></td></tr>`}</tbody></table></div><div class="notice neutral">${icon("info", 19)}${t("Imports and edits always require fresh staff verification. Existing ERP records remain your source of truth.", "所有匯入及修改均須重新核實。現有ERP記錄仍是資料依據。")}</div>`;
}
function buyersPage() {
  return `${heading(t("People worth knowing", "值得連繫的買家"), t("Ten fictional profiles to test realistic purchasing requirements.", "十個虛構買家，測試不同的採購要求。"), button("add-buyer", icon("plus", 18) + t("Add buyer", "新增買家"), "primary"))}<div class="notice neutral">${icon("shield", 19)}${t("Only authorised buyers who have not opted out can receive an outreach-ready offer.", "只有已獲授權且未退訂的買家，才可建立供聯絡的建議。")}</div><div class="directory-grid">${state.buyers.map((b, i) => `<article class="panel buyer-profile"><div class="match-card-top"><span class="buyer-avatar tone-${i % 3}">${esc(b.initials)}</span><div><h2>${esc(name(b))}</h2><p>${t(b.type, b.typeZh)}</p></div></div><p>${esc(t(b.notes, b.notesZh))}</p><dl><div><dt>${t("Buys", "採購")}</dt><dd>${b.categories.map((c) => t(c, c === "Sauces" ? "醬料" : "果醬")).join(", ")}</dd></div><div><dt>${t("Usual quantity", "一般數量")}</dt><dd>${b.quantity} ${t("jars", "罐")}</dd></div><div><dt>${t("Budget / jar", "每罐預算")}</dt><dd>${money(b.maxPrice)}</dd></div><div><dt>${t("Delivery area", "配送地區")}</dt><dd>${esc(b.district)}</dd></div><div><dt>${t("Minimum shelf life", "最低保質期")}</dt><dd>${b.minShelfDays} ${t("days", "天")}</dd></div></dl><div class="profile-footer"><span class="badge ${b.authorised && !b.suppressed ? "green" : "amber"}">${b.suppressed ? t("Opted out", "已退訂") : b.authorised ? t("Authorised", "已獲授權") : t("Permission needed", "尚待授權")}</span>${button("edit-buyer", t("Edit profile", "編輯資料"), "quiet", `data-id="${b.id}"`)}</div></article>`).join("")}</div>`;
}
function outreachPage() {
  return `${heading(t("Keep the conversation going", "讓對話持續下去"), t("Drafts, reviewed offers and the next follow-up, in one place.", "草稿、已審閱建議及下次跟進，盡在一處。"), button("export-outreach", icon("download", 18) + t("Export activity", "匯出活動"), "secondary"))}${
    !state.drafts.length
      ? `<section class="empty panel large-empty"><div class="empty-icon">${icon("mail", 34)}</div><h2>${t("Your first offer starts with a product.", "第一份建議，由產品開始。")}</h2><p>${t("Choose a verified batch, find a suitable buyer and prepare a message.", "選擇已核實產品、配對合適買家，再準備訊息。")}</p>${button("board", t("Go to workspace", "前往工作台"), "primary")}</section>`
      : `<div class="table-wrap"><table><thead><tr>${[t("Buyer / product", "買家／產品"), t("Offer status", "建議狀態"), t("Follow-up", "跟進"), t("Actions", "操作")].map((v) => `<th scope="col">${v}</th>`).join("")}</tr></thead><tbody>${[
          ...state.drafts,
        ]
          .reverse()
          .map((d) => {
            const b = state.buyers.find((b) => b.id === d.buyerId),
              p = state.products.find((p) => p.id === d.productId),
              current = draftIsCurrent(d);
            return `<tr><td><strong>${esc(name(b))}</strong><small>${esc(name(p))}<span class="separator">/</span>${d.quantity} ${t("jars", "罐")}</small></td><td><span class="badge ${d.approved && current ? "green" : "amber"}">${!current ? t("Outdated facts", "資料已變更") : d.approved ? t("Reviewed", "已審閱") : t("Draft", "草稿")}</span><small>${esc(d.contactStatus || t("Not contacted", "未聯絡"))}</small></td><td>${d.followUp ? esc(d.followUp) : "—"}${d.followUp && d.followUp <= today() ? `<small class="due">${t("Follow-up due", "需要跟進")}</small>` : ""}</td><td><div class="row-actions">${button("open-draft", t("Open offer", "開啟建議"), "secondary", `data-id="${d.id}"`)}${button("contacted", t("Update follow-up", "更新跟進"), "quiet", `data-id="${d.id}"`)}</div></td></tr>`;
          })
          .join("")}</tbody></table></div>`
  }<div class="notice neutral">${icon("info", 19)}${t("Contact status is recorded manually. It does not confirm that a message was delivered or that an order was placed.", "聯絡狀態由人手記錄，不代表訊息已送達或訂單已成立。")}</div>`;
}
function guidePage() {
  return `${heading(t("A small pilot. A clear test.", "小規模試行，清晰地驗證。"), t("Use this guide for tomorrow’s demonstration and the next real-world pilot.", "用於明天示範，以及下一步的實際試行。"), button("reset", icon("refresh", 17) + t("Reset demo", "重設示範"), "secondary"))}<div class="guide-grid"><section class="panel"><h2>${t("Your three-minute demo", "三分鐘示範流程")}</h2><ol class="demo-script"><li><strong>${t("Start with a real constraint", "由實際限制開始")}</strong><p>${t("Open Roselle jam. Its missing price blocks verification. Complete the price from a sample source and check the record.", "開啟洛神花果醬。尚欠價格會阻止核實。參考示範來源補齊價格，再核實記錄。")}</p></li><li><strong>${t("Explain why a buyer fits", "解釋買家為何合適")}</strong><p>${t("Match Orange marmalade. Open “Why this match?” and show budget, quantity, shelf life and delivery. Compare an excluded buyer.", "配對香橙果醬。開啟「為何配對成功？」展示預算、數量、保質期及配送條件，再比較不合適的買家。")}</p></li><li><strong>${t("Keep the last decision human", "最後決定由人作出")}</strong><p>${t("Prepare an English or Chinese offer. Edit it, complete the review checklist, then copy or download. Record a follow-up.", "準備中英文建議、編輯內容、完成審閱清單，再複製或下載，最後記錄跟進。")}</p></li></ol>${button("board", t("Start from the workspace", "由工作台開始"), "primary")}</section><section class="panel"><h2>${t("What this MVP does", "MVP提供的功能")}</h2><ul class="plain-list"><li>${t("Forms and CSV import with source tracking", "表格、CSV匯入及來源記錄")}</li><li>${t("Named verification and visible missing fields", "具名核實及顯示欠缺資料")}</li><li>${t("Eight transparent matching checks per buyer", "每位買家八項透明配對檢查")}</li><li>${t("Editable English / Traditional Chinese templates", "可編輯的英文及繁體中文範本")}</li><li>${t("Approval-gated export and WhatsApp handoff", "批准後匯出及交接至WhatsApp")}</li><li>${t("Local draft storage, follow-ups and an audit trail", "本機草稿儲存、跟進及操作記錄")}</li></ul><div class="notice amber"><strong>${t("Be precise about the AI", "準確說明AI功能")}</strong><p>${t("Drafts use deterministic templates, not a live language model. Cantonese dictation depends on your browser’s speech service. Photo OCR, live ERP sync and automatic messaging are not implemented.", "草稿使用固定範本，並非即時語言模型。粵語聽寫視乎瀏覽器語音服務支援。尚未實作照片OCR、即時ERP同步或自動發送訊息。")}</p></div></section><section class="panel"><h2>${t("Measure the work, not the promise", "量度實際工作，不靠承諾")}</h2><p>${t("Time from starting a product workflow to first message approval is recorded below. This is demo interaction time, not a validated saving.", "由開啟產品流程至首次批准訊息的時間記錄如下。這是示範操作時間，並非已驗證的節省。")}</p><div class="pilot-stat"><strong>${state.runs.length}</strong><span>${t("completed demo offers", "份完成示範建議")}</span></div>${state.runs.length ? `<ul class="plain-list">${state.runs.map((r) => `<li>${esc(r.product)}: ${Math.round(r.seconds)} ${t("seconds", "秒")}</li>`).join("")}</ul>` : ""}<p class="muted">${t("Before a real pilot, measure the full spreadsheet workflow including capture, corrections, verification and review. Compare accuracy and total staff time on equivalent offers.", "實際試行前，量度整個試算表流程，包括收集、修正、核實及審閱。用相同建議比較準確度及職員總工時。")}</p></section><section class="panel"><h2>${t("Your data and the next step", "資料及下一步")}</h2><p>${t("This is a single-browser demonstration. It has no shared database, staff authentication or stock reservation. Use fictional records until an authorised deployment is ready.", "此示範只在單一瀏覽器運作，沒有共用資料庫、職員登入或庫存預留。正式授權部署前，請使用虛構資料。")}</p><div class="button-row">${button("backup", icon("download", 16) + t("Download backup", "下載備份"), "secondary")}${button("export-audit", t("Export audit trail", "匯出操作記錄"), "secondary")}</div><h3>${t("Suggested pilot scope", "建議試行範圍")}</h3><p>${t("One product category, about ten authorised buyers, one named reviewer. Add real AI drafting and OCR only after the verified workflow proves useful.", "一個產品類別、約十位已授權買家及一位具名審閱者。先驗證流程實用，再加入真正AI草擬及OCR。")}</p></section></div><section class="panel audit-panel"><h2>${t("Recent activity", "最近操作")}</h2>${
    state.audit.length
      ? `<ul class="audit-list">${state.audit
          .slice(0, 12)
          .map(
            (a) =>
              `<li><span>${icon("clock", 16)}${new Date(a.time).toLocaleTimeString(lang === "zh" ? "zh-HK" : "en-HK", { timeZone: "Asia/Hong_Kong", hour: "2-digit", minute: "2-digit" })}</span><div><strong>${esc(a.action)}</strong><small>${esc(a.detail)}</small></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${t("Your verification, matching and review actions will appear here.", "核實、配對及審閱操作會顯示於此。")}</p>`
  }</section>`;
}
function showDialog(title, html, wide = false) {
  const d = $("#dialog");
  d.className = wide ? "wide" : "";
  d.innerHTML = `<div class="dialog-head"><h2 id="dialog-title">${title}</h2><button class="icon-btn" data-close aria-label="${t("Close dialog", "關閉對話框")}">${icon("close")}</button></div>${html}`;
  d.querySelector("[data-close]").onclick = () => d.close();
  d.showModal();
  return d;
}
function inputField(label, key, value = "", type = "text", extra = "") {
  return `<label class="field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function productForm(p = null) {
  const q = p || {
    name: "",
    nameZh: "",
    quantity: "",
    price: "",
    available: today(),
    expiry: "",
    storage: "Ambient",
    category: "Preserves",
    source: "",
    delivery: "",
    districts: [],
    confirmed: false,
    notes: "",
    leadDays: 3,
  };
  const d = showDialog(
    p
      ? t("Edit product details", "編輯產品資料")
      : t("Add a product update", "新增產品更新"),
    `<div class="dialog-intro"><p>${t("Keep the fields that matter for a buyer offer. Save first, then verify against the source.", "只記錄供應建議所需資料。先儲存，再與來源核對。")}</p>${!p ? `<div class="button-row">${button("voice-input", icon("mic", 17) + t("Cantonese note", "粵語記錄"), "secondary")}${button("import", icon("file", 17) + t("Import CSV instead", "改用CSV匯入"), "quiet")}</div>` : ""}</div><form id="product-form"><div class="form-grid">${inputField(t("Product name (English)", "產品英文名稱"), "name", q.name, "text", 'required maxlength="100"')}${inputField(t("Product name (Traditional Chinese)", "產品中文名稱"), "nameZh", q.nameZh, "text", 'maxlength="100"')}<label class="field"><span>${t("Category", "類別")}</span><select name="category"><option value="Preserves" ${q.category === "Preserves" ? "selected" : ""}>${t("Preserves", "果醬")}</option><option value="Sauces" ${q.category === "Sauces" ? "selected" : ""}>${t("Sauces", "醬料")}</option></select></label>${inputField(t("Quantity (jars)", "數量（罐）"), "quantity", q.quantity, "number", 'required min="1" max="1000000" step="1"')}${inputField(t("Approved price per jar (HK$)", "核准每罐價格（HK$）"), "price", q.price, "number", 'min="0.01" max="100000" step="0.01"')}${inputField(t("Available from", "可供應日期"), "available", q.available, "date", "required")}${inputField(t("Best before", "最佳食用日期"), "expiry", q.expiry, "date", "required")}<label class="field"><span>${t("Storage", "儲存方式")}</span><select name="storage"><option value="Ambient" ${q.storage === "Ambient" ? "selected" : ""}>${t("Ambient", "室溫")}</option><option value="Chilled" ${q.storage === "Chilled" ? "selected" : ""}>${t("Chilled (0–4°C)", "冷藏（0–4°C）")}</option></select></label>${inputField(t("Delivery lead time (days)", "配送準備時間（天）"), "leadDays", q.leadDays, "number", 'required min="0" max="365" step="1"')}${inputField(t("Source record reference", "來源記錄編號"), "source", q.source, "text", 'required maxlength="180"')}</div><fieldset class="districts"><legend>${t("Delivery areas", "配送地區")}</legend>${["Hong Kong Island", "Kowloon", "New Territories"].map((v, i) => `<label class="checkbox-row"><input name="district" type="checkbox" value="${v}" ${q.districts.includes(v) ? "checked" : ""}><span>${t(v, ["香港島", "九龍", "新界"][i])}</span></label>`).join("")}</fieldset><label class="field"><span>${t("Delivery terms (English)", "配送條件（英文）")}</span><textarea name="delivery" rows="2" required maxlength="600">${esc(q.delivery)}</textarea></label><label class="field"><span>${t("Delivery terms (Chinese, optional)", "配送條件（中文，選填）")}</span><textarea name="deliveryZh" rows="2" maxlength="600">${esc(q.deliveryZh || "")}</textarea></label><label class="field"><span>${t("Product notes / label information", "產品備註／標籤資料")}</span><textarea name="notes" rows="2" maxlength="1000">${esc(q.notes)}</textarea></label><label class="checkbox-row confirmation"><input name="confirmed" type="checkbox" ${q.confirmed ? "checked" : ""}><span>${t("This is confirmed finished stock, not an estimated harvest.", "這是已確認的製成品庫存，並非預估收成。")}</span></label><p id="form-error" role="alert"></p><div class="form-footer"><p>${t("Saving requires a fresh verification.", "儲存後需重新核實。")}</p><button class="btn primary" type="submit">${t("Save for verification", "儲存以供核實")}</button></div></form>`,
    true,
  );
  d.querySelector("#product-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (!f.getAll("district").length) {
      $("#form-error").textContent = t(
        "Select at least one delivery area.",
        "請選擇至少一個配送地區。",
      );
      return;
    }
    if (f.get("expiry") < f.get("available")) {
      $("#form-error").textContent = t(
        "Best-before date must be after availability.",
        "最佳食用日期須在可供應日期之後。",
      );
      return;
    }
    const obj = {
      ...q,
      id: p?.id || crypto.randomUUID(),
      name: f.get("name").trim(),
      nameZh: f.get("nameZh").trim(),
      category: f.get("category"),
      quantity: Number(f.get("quantity")),
      price: f.get("price") === "" ? "" : Number(f.get("price")),
      available: f.get("available"),
      expiry: f.get("expiry"),
      storage: f.get("storage"),
      leadDays: Number(f.get("leadDays")),
      source: f.get("source").trim(),
      districts: f.getAll("district"),
      delivery: f.get("delivery").trim(),
      deliveryZh: f.get("deliveryZh").trim(),
      notes: f.get("notes").trim(),
      confirmed: f.has("confirmed"),
      status: "pending",
      reviewer: "",
      verifiedAt: null,
      accent: p?.accent || "orange",
      unit: "jars",
    };
    if (p) state.products[state.products.findIndex((v) => v.id === p.id)] = obj;
    else state.products.push(obj);
    selected = obj.id;
    stage = "verify";
    page = "workspace";
    draftId = null;
    started = { productId: obj.id, time: Date.now() };
    log("Product saved for verification", obj.name);
    d.close();
    render();
    focusMain();
    toast(
      t(
        "Saved. Check the record before matching.",
        "已儲存。配對前請核實記錄。",
      ),
    );
  };
  d.querySelectorAll("[data-action]").forEach(
    (b) =>
      (b.onclick = () => {
        d.close();
        act(b.dataset.action, b.dataset);
      }),
  );
}
function importDialog() {
  const d = showDialog(
    t("Import existing records", "匯入現有記錄"),
    `<p>${t("Use a CSV export or the sample template. Each imported row stays pending until a named staff member verifies it.", "使用CSV匯出檔或示範範本。所有匯入記錄須由具名職員核實。")}</p>${button("sample-csv", icon("download", 16) + t("Download CSV template", "下載CSV範本"), "secondary")}<label class="file-drop"><strong>${icon("file", 24)}${t("Choose a CSV file", "選擇CSV檔案")}</strong><span>${t("UTF-8 CSV, up to 100 rows and 1 MB", "UTF-8 CSV，最多100行及1MB")}</span><input type="file" id="csv-file" accept=".csv,text/csv"></label><div id="import-preview"></div><p id="import-error" role="alert"></p><div class="dialog-actions"><button class="btn primary" id="confirm-import" disabled>${t("Import as unverified records", "匯入為待核實記錄")}</button></div>`,
  );
  let rows = [];
  d.querySelector("[data-action]").onclick = sampleCSV;
  $("#csv-file").onchange = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 1000000) throw Error("File must be smaller than 1 MB.");
      rows = parseCSV(await file.text());
      $("#import-error").textContent = "";
      $("#import-preview").innerHTML =
        `<div class="notice green">${rows.length} ${t("records ready to import", "筆記錄可匯入")}</div><ul class="plain-list">${rows
          .slice(0, 6)
          .map(
            (p) => `<li>${esc(p.name)} — ${p.quantity} ${t("jars", "罐")}</li>`,
          )
          .join("")}</ul>`;
      $("#confirm-import").disabled = false;
    } catch (err) {
      rows = [];
      $("#import-error").textContent = err.message;
      $("#confirm-import").disabled = true;
    }
  };
  $("#confirm-import").onclick = () => {
    state.products.push(...rows);
    log("CSV imported", `${rows.length} unverified product records`);
    page = "products";
    filter = "pending";
    search = "";
    d.close();
    render();
    toast(
      t(
        "Imported. Every row needs verification.",
        "已匯入。每筆記錄均需核實。",
      ),
    );
  };
}
function sampleCSV() {
  const headers = [
    "name",
    "nameZh",
    "category",
    "quantity",
    "price",
    "available",
    "expiry",
    "storage",
    "districts",
    "delivery",
    "source",
    "leadDays",
    "notes",
  ];
  const p = seedState().products[0];
  download(
    "locomatch-product-template.csv",
    "\uFEFF" +
      headers.map(csvCell).join(",") +
      "\n" +
      headers
        .map((h) => csvCell(h === "districts" ? p.districts.join("|") : p[h]))
        .join(","),
    "text/csv;charset=utf-8",
  );
}
function voiceDialog() {
  const d = showDialog(
    t("Cantonese production note", "粵語生產記錄"),
    `<p>${t("Speak or paste a short Cantonese update. This prototype extracts a quantity and product hint only; price and other facts still need verification.", "說出或貼上簡短粵語更新。此原型僅提取數量及產品提示；價格及其他資料仍需核實。")}</p><div class="notice neutral">${t("Optional dictation uses your browser’s speech provider and may send audio to that provider. You can type instead.", "選用聽寫功能會使用瀏覽器語音服務，音訊或會傳送至該服務供應商。你亦可直接輸入。")}</div><label class="field"><span>${t("Production note", "生產記錄")}</span><textarea id="voice-note" rows="3" placeholder="四十罐橙 jam 入庫啦">四十罐橙 jam 入庫啦</textarea></label><div class="button-row">${button("dictate", icon("mic", 18) + t("Start dictation", "開始聽寫"), "secondary")}<button class="btn primary" id="extract-note">${t("Review extracted fields", "核對提取資料")}</button></div><p id="voice-status" role="status">${t("Sample text shown. No audio has been recorded.", "現顯示示範文字，尚未錄音。")}</p>`,
  );
  let recognition;
  d.querySelector("[data-action]").onclick = () => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      $("#voice-status").textContent = t(
        "Dictation is unavailable in this browser. Type or paste your note.",
        "此瀏覽器不支援聽寫。請輸入或貼上記錄。",
      );
      return;
    }
    recognition = new API();
    recognition.lang = "yue-Hant-HK";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const el = $("#voice-note");
      if (el) el.value = e.results[0][0].transcript;
    };
    recognition.onerror = () => {
      const el = $("#voice-status");
      if (el)
        el.textContent = t(
          "Dictation could not finish. Type or paste your note.",
          "無法完成聽寫，請輸入或貼上記錄。",
        );
    };
    recognition.onend = () => {
      const el = $("#voice-status");
      if (el)
        el.textContent = t(
          "Dictation ended. Review the text before continuing.",
          "聽寫已結束，請先核對文字。",
        );
    };
    recognition.start();
    $("#voice-status").textContent = t(
      "Listening. Speak one short update.",
      "聆聽中。請說出一段簡短更新。",
    );
  };
  d.addEventListener("close", () => recognition?.abort(), { once: true });
  $("#extract-note").onclick = () => {
    const note = $("#voice-note").value;
    const numeric = note.match(/(\d+)\s*(?:罐|樽|jars?)/i);
    const cn = note.match(/([一二三四五六七八九十百兩]+)\s*[罐樽]/);
    let quantity = numeric ? Number(numeric[1]) : "";
    if (!quantity && cn) {
      const nums = {
        一: 1,
        二: 2,
        兩: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9,
      };
      let result = 0,
        temp = 0;
      for (const c of cn[1]) {
        if (c === "十" || c === "百") {
          result += (temp || 1) * (c === "十" ? 10 : 100);
          temp = 0;
        } else temp = nums[c] || 0;
      }
      quantity = result + temp;
    }
    const isOrange = /橙|marmalade|orange/i.test(note);
    d.close();
    productForm();
    const f = $("#product-form");
    f.elements.name.value = isOrange ? "Orange marmalade" : "";
    f.elements.nameZh.value = isOrange ? "本地香橙果醬" : "";
    f.elements.quantity.value = quantity;
    f.elements.source.value = "Cantonese note (unverified)";
    f.elements.notes.value = note;
    toast(
      t(
        "Review the suggested fields. Other facts have not been inferred.",
        "請核對建議欄位，其他資料未作推測。",
      ),
    );
  };
}
function buyerForm(b = null) {
  const q = b || {
    name: "",
    nameZh: "",
    categories: ["Preserves"],
    quantity: 24,
    maxPrice: 45,
    minShelfDays: 30,
    district: "Hong Kong Island",
    storage: ["Ambient"],
    leadDays: 5,
    authorised: false,
    suppressed: false,
    purpose: "Retail shelves",
    notes: "",
    type: "Business buyer",
    typeZh: "企業買家",
  };
  const d = showDialog(
    b
      ? t("Edit buyer profile", "編輯買家資料")
      : t("Add buyer profile", "新增買家資料"),
    `<p>${t("Use only approved customer information. Changing a buyer invalidates any earlier offer approval.", "僅使用獲准的客戶資料。更改買家資料後，先前建議須重新審閱。")}</p><form id="buyer-form"><div class="form-grid">${inputField(t("Buyer name", "買家名稱"), "name", q.name, "text", 'required maxlength="100"')}${inputField(t("Chinese name", "中文名稱"), "nameZh", q.nameZh, "text", 'maxlength="100"')}${inputField(t("Usual order (jars)", "一般訂購數量（罐）"), "quantity", q.quantity, "number", 'required min="1" max="1000000" step="1"')}${inputField(t("Maximum price per jar (HK$)", "每罐價格上限（HK$）"), "maxPrice", q.maxPrice, "number", 'required min="0.01" max="100000" step="0.01"')}${inputField(t("Minimum shelf life on arrival (days)", "到貨最低保質期（天）"), "minShelfDays", q.minShelfDays, "number", 'required min="0" max="3650" step="1"')}${inputField(t("Delivery needed within (days)", "需要多少天內送貨"), "leadDays", q.leadDays, "number", 'required min="0" max="365" step="1"')}<label class="field"><span>${t("Product interest", "產品類別")}</span><select name="category"><option value="Preserves" ${q.categories[0] === "Preserves" ? "selected" : ""}>${t("Preserves", "果醬")}</option><option value="Sauces" ${q.categories[0] === "Sauces" ? "selected" : ""}>${t("Sauces", "醬料")}</option></select></label><label class="field"><span>${t("Delivery district", "配送地區")}</span><select name="district">${["Hong Kong Island", "Kowloon", "New Territories"].map((v) => `<option ${q.district === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>${inputField(t("Purchasing purpose", "採購用途"), "purpose", q.purpose, "text", 'required maxlength="180"')}</div><label class="field"><span>${t("Buyer notes", "買家備註")}</span><textarea name="notes" rows="2" maxlength="1000">${esc(q.notes)}</textarea></label><label class="checkbox-row"><input type="checkbox" name="chilled" ${q.storage.includes("Chilled") ? "checked" : ""}><span>${t("Can accept chilled products (ambient accepted by default)", "可接收冷藏產品（預設可接收室溫產品）")}</span></label><label class="checkbox-row"><input type="checkbox" name="authorised" ${q.authorised ? "checked" : ""}><span>${t("Outreach authorisation has been recorded", "已記錄客戶聯絡授權")}</span></label><label class="checkbox-row"><input type="checkbox" name="suppressed" ${q.suppressed ? "checked" : ""}><span>${t("Buyer has opted out of outreach", "買家已選擇不接收推廣")}</span></label><div class="dialog-actions"><button class="btn primary" type="submit">${t("Save buyer", "儲存買家")}</button></div></form>`,
    true,
  );
  $("#buyer-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const obj = {
      ...q,
      id: b?.id || crypto.randomUUID(),
      name: f.get("name").trim(),
      nameZh: f.get("nameZh").trim(),
      quantity: Number(f.get("quantity")),
      maxPrice: Number(f.get("maxPrice")),
      minShelfDays: Number(f.get("minShelfDays")),
      leadDays: Number(f.get("leadDays")),
      categories: [f.get("category")],
      district: f.get("district"),
      purpose: f.get("purpose").trim(),
      purposeZh:
        b && b.purpose === f.get("purpose").trim()
          ? b.purposeZh
          : f.get("purpose").trim(),
      notes: f.get("notes").trim(),
      notesZh:
        b && b.notes === f.get("notes").trim()
          ? b.notesZh
          : f.get("notes").trim(),
      storage: f.has("chilled") ? ["Ambient", "Chilled"] : ["Ambient"],
      authorised: f.has("authorised"),
      suppressed: f.has("suppressed"),
      initials: f
        .get("name")
        .trim()
        .split(/\s+/)
        .map((v) => v[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    if (b) state.buyers[state.buyers.findIndex((v) => v.id === b.id)] = obj;
    else state.buyers.push(obj);
    log("Buyer profile updated", obj.name);
    d.close();
    render();
    toast(
      t(
        "Buyer saved. Existing offers need a fresh check.",
        "買家已儲存。現有建議需重新核對。",
      ),
    );
  };
}
function followUpDialog(id) {
  const offer = state.drafts.find((v) => v.id === id);
  const d = showDialog(
    t("Record contact and follow-up", "記錄聯絡及跟進"),
    `<p>${t("Record what actually happened outside LoCoMatch. This does not send a message.", "記錄在 LoCoMatch 以外實際發生的聯絡。此操作不會發送訊息。")}</p><form id="followup-form"><label class="field"><span>${t("Contact status", "聯絡狀態")}</span><select name="status">${["Not contacted", "Contacted", "Replied", "Trial order", "Closed"].map((v) => `<option value="${v}" ${offer.contactStatus === v ? "selected" : ""}>${t(v, { "Not contacted": "未聯絡", Contacted: "已聯絡", Replied: "已回覆", "Trial order": "試訂單", Closed: "已結束" }[v])}</option>`).join("")}</select></label>${inputField(t("Contact date", "聯絡日期"), "contactDate", offer.contactDate || today(), "date")}${inputField(t("Next follow-up", "下次跟進"), "followUp", offer.followUp || addDays(today(), 3), "date")}<label class="field"><span>${t("Notes", "備註")}</span><textarea name="note" rows="3" maxlength="1000">${esc(offer.note || "")}</textarea></label><div class="dialog-actions"><button class="btn primary" type="submit">${t("Save follow-up", "儲存跟進")}</button></div></form>`,
  );
  $("#followup-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    Object.assign(offer, {
      contactStatus: f.get("status"),
      contactDate: f.get("contactDate"),
      followUp: f.get("followUp"),
      note: f.get("note"),
    });
    log(
      "Follow-up updated",
      state.buyers.find((b) => b.id === offer.buyerId).name +
        ": " +
        offer.contactStatus,
    );
    d.close();
    render();
    toast(t("Follow-up saved.", "跟進已儲存。"));
  };
}
function download(filename, text, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV(filename, headers, rows) {
  download(
    filename,
    "\uFEFF" +
      [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
function focusMain() {
  $("#main")?.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function openDraft(id) {
  const d = state.drafts.find((d) => d.id === id);
  draftId = id;
  selected = d.productId;
  buyerId = d.buyerId;
  page = "workspace";
  stage = "draft";
  render();
  focusMain();
}
function act(action, data = {}) {
  const p = product();
  if (action === "language") {
    lang = lang === "en" ? "zh" : "en";
    try {
      localStorage.setItem("locomatch.lang", lang);
    } catch {}
    render();
    return;
  }
  if (action === "capture") {
    productForm();
    return;
  }
  if (action === "edit-product") {
    productForm(state.products.find((p) => p.id === data.id));
    return;
  }
  if (action === "import") {
    importDialog();
    return;
  }
  if (action === "voice-input") {
    voiceDialog();
    return;
  }
  if (action === "sample-csv") {
    sampleCSV();
    return;
  }
  if (action === "add-buyer" || action === "edit-buyer") {
    buyerForm(state.buyers.find((b) => b.id === data.id) || null);
    return;
  }
  if (action === "board") {
    page = "workspace";
    stage = "board";
    render();
    focusMain();
    return;
  }
  if (action === "select-match" || action === "verify") {
    selected = data.id || selected;
    page = "workspace";
    stage = action === "verify" ? "verify" : "match";
    draftId = null;
    if (!started || started.productId !== selected)
      started = { productId: selected, time: Date.now() };
    if (action === "select-match") log("Buyer rules checked", product().name);
    render();
    focusMain();
    return;
  }
  if (action === "stage") {
    if (data.stage === "capture") {
      productForm(p);
      return;
    }
    stage = data.stage;
    render();
    focusMain();
    return;
  }
  if (action === "new-draft") {
    const b = state.buyers.find((b) => b.id === data.buyer);
    try {
      const d = {
        id: crypto.randomUUID(),
        productId: p.id,
        buyerId: b.id,
        quantity: b.quantity,
        language: lang,
        channel: "email",
        message: createMessage(p, b, { language: lang }),
        fingerprint: fingerprint(p, b),
        approved: false,
        createdAt: new Date().toISOString(),
        startedAt: started?.productId === p.id ? started.time : Date.now(),
      };
      state.drafts.push(d);
      log("Offer drafted", p.name + " / " + b.name);
      openDraft(d.id);
    } catch (err) {
      toast(err.message);
    }
    return;
  }
  if (action === "open-draft") {
    openDraft(data.id);
    return;
  }
  if (action === "contacted") {
    followUpDialog(data.id || draftId);
    return;
  }
  if (["copy", "download-offer", "whatsapp"].includes(action)) {
    const d = state.drafts.find((d) => d.id === draftId);
    if (!d?.approved || !draftIsCurrent(d)) {
      toast(
        t(
          "Review and approve the current offer first.",
          "請先審閱及批准最新建議。",
        ),
      );
      return;
    }
    if (action === "copy") {
      navigator.clipboard
        ?.writeText(d.message)
        .then(() => toast(t("Message copied.", "訊息已複製。")))
        .catch(() =>
          toast(
            t(
              "Copy unavailable. Use Download instead.",
              "無法複製，請使用下載。",
            ),
          ),
        );
    }
    if (action === "download-offer") download("locomatch-offer.txt", d.message);
    if (action === "whatsapp")
      window.open(
        "https://wa.me/?text=" + encodeURIComponent(d.message),
        "_blank",
        "noopener,noreferrer",
      );
    log(
      "Approved offer exported",
      action + " / " + state.buyers.find((b) => b.id === d.buyerId).name,
    );
    return;
  }
  if (action === "backup") {
    download(
      "locomatch-demo-backup.json",
      JSON.stringify(state, null, 2),
      "application/json",
    );
    toast(t("Backup downloaded.", "已下載備份。"));
    return;
  }
  if (action === "export-audit") {
    exportCSV(
      "locomatch-audit.csv",
      ["time", "action", "detail"],
      state.audit.map((a) => [a.time, a.action, a.detail]),
    );
    return;
  }
  if (action === "export-outreach") {
    exportCSV(
      "locomatch-outreach.csv",
      [
        "buyer",
        "product",
        "approved",
        "facts_current",
        "status",
        "contact_date",
        "follow_up",
        "notes",
      ],
      state.drafts.map((d) => [
        state.buyers.find((b) => b.id === d.buyerId)?.name,
        state.products.find((p) => p.id === d.productId)?.name,
        d.approved,
        draftIsCurrent(d),
        d.contactStatus || "Not contacted",
        d.contactDate || "",
        d.followUp || "",
        d.note || "",
      ]),
    );
    return;
  }
  if (action === "reset") {
    const d = showDialog(
      t("Reset this demo?", "重設此示範？"),
      `<p>${t("This replaces this browser’s product records, buyers, drafts and activity with the original demo. Download a backup first if you want to keep them.", "此操作將以原始示範取代此瀏覽器的產品、買家、草稿及操作記錄。如需保留，請先下載備份。")}</p><div class="button-row">${button("backup", t("Download backup", "下載備份"), "secondary")}<button class="btn danger" id="confirm-reset">${t("Reset demo data", "重設示範資料")}</button></div>`,
    );
    d.querySelector("[data-action]").onclick = () => act("backup");
    $("#confirm-reset").onclick = () => {
      state = seedState();
      persist();
      selected = "p1";
      draftId = null;
      stage = "board";
      page = "workspace";
      started = null;
      d.close();
      render();
      toast(t("Demo reset. Ready to present.", "示範已重設，可開始展示。"));
    };
  }
}
function bind() {
  document.querySelectorAll("[data-nav]").forEach(
    (el) =>
      (el.onclick = (e) => {
        e.preventDefault();
        page = el.dataset.nav;
        stage = "board";
        search = "";
        filter = "all";
        render();
        focusMain();
      }),
  );
  document
    .querySelectorAll("[data-action]")
    .forEach((el) => (el.onclick = () => act(el.dataset.action, el.dataset)));
  if ($("#verify-form"))
    $("#verify-form").onsubmit = (e) => {
      e.preventDefault();
      const p = product(),
        f = new FormData(e.target);
      if (productIssues(p).length) {
        toast(t("Complete the missing facts first.", "請先補齊資料。"));
        return;
      }
      const reviewer = f.get("reviewer").trim();
      if (!reviewer) {
        toast(t("Enter the reviewer’s name.", "請輸入審閱者姓名。"));
        return;
      }
      p.status = "verified";
      p.reviewer = reviewer;
      p.verifiedAt = new Date().toISOString();
      log("Product verified", p.name + " / " + p.reviewer);
      stage = "match";
      render();
      focusMain();
      toast(
        t(
          "Verified. Matching rules have been checked.",
          "已核實，配對條件已檢查。",
        ),
      );
    };
  if ($("#product-search"))
    $("#product-search").oninput = (e) => {
      const pos = e.target.selectionStart;
      search = e.target.value;
      render();
      $("#product-search").focus();
      if (pos !== null) $("#product-search").setSelectionRange(pos, pos);
    };
  if ($("#product-filter"))
    $("#product-filter").onchange = (e) => {
      filter = e.target.value;
      render();
    };
  const d = state.drafts.find((d) => d.id === draftId);
  const clearApproval = (resetChecks = false) => {
    d.approved = false;
    d.approvedBy = "";
    d.approvedAt = null;
    persist();
    const badge = $("#approval-status");
    badge.className = "badge amber";
    badge.textContent = t("Needs review", "待審閱");
    $("#approve-form button[type=submit]").innerHTML =
      icon("check", 18) + t("Approve message", "批准訊息");
    document
      .querySelectorAll(
        '[data-action="copy"],[data-action="download-offer"],[data-action="whatsapp"]',
      )
      .forEach((b) => (b.disabled = true));
    if (resetChecks) {
      $("#approve-form")
        .querySelectorAll('input[type="checkbox"]')
        .forEach((b) => (b.checked = false));
    }
  };
  if ($("#message-editor")) {
    $("#message-editor").oninput = (e) => {
      d.message = e.target.value;
      clearApproval(true);
      $("#save-status").textContent = t(
        "Changes saved. Review again before sharing.",
        "已儲存更改。分享前請重新審閱。",
      );
    };
    $("#approve-form").oninput = (e) => {
      if (d.approved) clearApproval(e.target.type !== "checkbox");
    };
  }
  ["draft-channel", "draft-language"].forEach((id) => {
    if ($("#" + id))
      $("#" + id).onchange = (e) => {
        try {
          const p = product(),
            b = state.buyers.find((b) => b.id === d.buyerId),
            channel = id === "draft-channel" ? e.target.value : d.channel,
            language = id === "draft-language" ? e.target.value : d.language;
          const dlg = showDialog(
            t("Rebuild this draft?", "重新建立草稿？"),
            `<p>${t("Changing format or language replaces your edited message with a fresh template and clears approval.", "更改格式或語言將以新範本取代已編輯的訊息，並清除批准。")}</p><button class="btn primary" id="rebuild-draft">${t("Rebuild draft", "重新建立草稿")}</button>`,
          );
          dlg.addEventListener("close", () => render(), { once: true });
          $("#rebuild-draft").onclick = () => {
            d.message = createMessage(p, b, { language, channel });
            d.language = language;
            d.channel = channel;
            d.approved = false;
            d.approvedBy = "";
            persist();
            dlg.close();
          };
        } catch (err) {
          toast(err.message);
          render();
        }
      };
  });
  if ($("#approve-form"))
    $("#approve-form").onsubmit = (e) => {
      e.preventDefault();
      if (!draftIsCurrent(d)) {
        toast(
          t(
            "Facts changed. Prepare a fresh offer.",
            "資料已更改，請重新建立建議。",
          ),
        );
        return;
      }
      const f = new FormData(e.target),
        reviewer = f.get("reviewer").trim();
      if (!reviewer || !d.message.trim()) {
        toast(
          t("Add a reviewer name and message.", "請輸入審閱者姓名及訊息。"),
        );
        return;
      }
      d.approved = true;
      d.approvedBy = reviewer;
      d.approvedAt = new Date().toISOString();
      if (!d.timed) {
        state.runs.push({
          product: product().name,
          seconds: (Date.now() - d.startedAt) / 1000,
          time: d.approvedAt,
        });
        d.timed = true;
      }
      log(
        "Message approved",
        state.buyers.find((b) => b.id === d.buyerId).name + " / " + reviewer,
      );
      render();
      toast(
        t(
          "Approved. You can now copy or download this offer.",
          "已批准。現在可複製或下載建議。",
        ),
      );
    };
}
render();
