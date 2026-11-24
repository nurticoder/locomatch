import { extractStockNote } from "./capture-domain.js";
import { today, addDays } from "./domain.js";
let mode = "pick",
  method = "manual",
  note = "",
  extracted = {},
  photoURL = "",
  busy = false,
  progress = "",
  savedProduct = null,
  recognition = null,
  ocrWorker = null;
function productOptions(c) {
  const unique = c.state.products.filter(
    (p, index, all) => all.findIndex((v) => v.name === p.name) === index,
  );
  return unique
    .map(
      (p) =>
        `<option value="${c.esc(p.id)}" ${extracted.productId === p.id ? "selected" : ""}>${c.esc(c.name(p))}</option>`,
    )
    .join("");
}
export function capturePage(c) {
  const { t, esc, icon, button } = c;
  if (mode === "saved")
    return `<section class="capture-saved panel">${icon("check", 44)}<h1>${t("Your stock update is saved.", "已儲存你的庫存更新。")}</h1><p>${esc(savedProduct?.name)}<br><strong>${savedProduct?.quantity}</strong> ${t("jars added for staff review.", "罐，等待職員核實。")}</p><div class="notice green">${t("The sales team will check the details. Once approved, LoCoMatch finds matching customers and prepares their messages automatically.", "銷售團隊會核對資料。核實後，LoCoMatch 會自動配對合適客戶及準備訊息。")}</div><div class="button-row"><button class="btn primary" data-easy="again">${t("Add another update", "新增另一筆更新")}</button><button class="btn secondary" data-easy="review-saved">${t("Review as sales staff", "以銷售職員身份核實")}</button></div></section>`;
  if (mode === "pick")
    return `<div class="easy-heading"><span class="easy-kicker">${t("For production staff", "生產團隊專用")}</span><h1>${t("What did you make today?", "今日做咗啲乜？")}</h1><p>${t("Speak, take a photo, or type. We’ll help fill in the details.", "講一句、影張相，或者輸入文字。我們會協助填好資料。")}</p></div><div class="capture-options">${[
      [
        "voice",
        "mic",
        "Speak an update",
        "講出產品更新",
        "Use Cantonese. No typing needed.",
        "可用粵語，無需打字。",
      ],
      [
        "photo",
        "file",
        "Take or upload a photo",
        "拍照或上載照片",
        "Use a clear production sheet or label.",
        "使用清晰的生產記錄或標籤。",
      ],
      [
        "manual",
        "edit",
        "Type a short update",
        "輸入簡短更新",
        "Enter the product and quantity yourself.",
        "自行輸入產品及數量。",
      ],
    ]
      .map(
        ([id, ic, en, zh, desc, descZh]) =>
          `<button class="capture-option ${id}" data-easy="choose" data-method="${id}"><span class="capture-icon">${icon(ic, 34)}</span><strong>${t(en, zh)}</strong><span>${t(desc, descZh)}</span><span class="option-action">${t("Get started", "開始")}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="capture-foot"><div>${icon("shield", 23)}<p><strong>${t("You add the update. We handle the next steps.", "你負責更新，我們處理下一步。")}</strong><span>${t("A staff member checks each batch before it is used in a customer offer.", "每批產品會先由職員核實，再用於客戶供應建議。")}</span></p></div><button class="text-btn" data-easy="sales">${t("Open the sales workspace", "開啟銷售工作台")}</button></div>`;
  if (mode === "review")
    return `<div class="easy-heading"><button class="back-link" data-easy="back-input">${t("Back to your update", "返回更新")}</button><h1>${t("Does this look right?", "資料啱唔啱？")}</h1><p>${t("Check the product and quantity. Leave anything you don’t know for the sales team.", "核對產品及數量。不清楚的資料可留待銷售團隊處理。")}</p></div><form id="easy-stock-form" class="easy-review panel"><div class="form-grid"><label class="field"><span>${t("Product", "產品")}</span><select name="productId" id="easy-product"><option value="">${t("A new product", "新產品")}</option>${productOptions(c)}</select></label><label class="field"><span>${t("How many jars?", "有幾多罐？")}</span><input name="quantity" type="number" inputmode="numeric" required min="1" max="1000000" step="1" value="${extracted.quantity ?? ""}" autofocus></label><label class="field"><span>${t("Product name", "產品名稱")}</span><input name="name" required maxlength="100" value="${esc(extracted.name)}"></label><label class="field"><span>${t("Best before (if known)", "最佳食用日期（如知道）")}</span><input name="expiry" type="date" value="${esc(extracted.expiry || "")}"></label></div><details class="easy-more"><summary>${t("Price and other details", "價格及其他資料")}</summary><label class="field"><span>${t("Price per jar (HK$), if known", "每罐價格（HK$，如知道）")}</span><input name="price" type="number" min="0.01" max="100000" step="0.01" value="${extracted.price ?? ""}"></label><p class="muted">${t("For a known product, its existing price, storage and delivery settings are shown to the sales reviewer. A new batch still needs a new expiry and stock check.", "已知產品的現有價格、儲存及配送設定會顯示予銷售審閱者。新一批產品仍需重新核對到期日及庫存。")}</p></details><label class="checkbox-row confirmation"><input name="confirmed" type="checkbox"><span>${t("These jars are finished and ready now.", "這批產品已完成製作，現在可供應。")}</span></label><details class="source-transcript"><summary>${t("Your original update", "你的原始更新")}</summary><p>${esc(note) || t("Entered by hand.", "人手輸入。")}</p></details><p id="easy-error" role="alert"></p><button class="btn primary easy-save" type="submit" ${busy ? "disabled" : ""}>${busy ? t("Saving…", "儲存中…") : t("Save for staff review", "儲存以供職員核實")}</button><p class="easy-small">${t("The update will be saved to the shared database. It will not be promoted until verified.", "更新會儲存至共用資料庫，核實前不會用於推廣。")}</p></form>`;
  const voice = method === "voice",
    photo = method === "photo";
  return `<div class="easy-heading"><button class="back-link" data-easy="pick">${t("Choose another way", "選擇其他方法")}</button><h1>${voice ? t("Tell us what is ready.", "講下有乜產品做好。") : photo ? t("Show us your production sheet.", "影低你嘅生產記錄。") : t("Add a short stock note.", "輸入一段庫存記錄。")}</h1><p>${voice ? t("For example: “Forty jars of orange marmalade are ready.”", "例如：「四十罐橙 jam 做好啦。」") : photo ? t("Use a clear photo. Printed sheets work best.", "照片要清晰，以印刷文字記錄效果最佳。") : t("Include the product name and number of jars.", "請包括產品名稱及罐數。")}</p></div><section class="panel capture-input">${voice ? `<button class="record-button" data-easy="record">${icon("mic", 31)}<span>${t("Start speaking", "開始講")}</span></button><p class="easy-small">${t("Dictation uses your browser’s speech service. If it is unavailable, type below or use a photo.", "聽寫使用瀏覽器語音服務。如無法使用，可在下方輸入文字或上載照片。")}</p>` : ""}${photo ? `<label class="photo-drop"><span class="capture-icon">${icon("file", 30)}</span><strong>${t("Choose a photo or use your camera", "選擇照片或使用相機")}</strong><span>${t("JPG, PNG or WebP. Photo processing stays in this browser.", "JPG、PNG或WebP。照片只在此瀏覽器處理。")}</span><input id="stock-photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label>${photoURL ? `<img class="source-photo" src="${esc(photoURL)}" alt="${t("Your production sheet", "你的生產記錄")}">` : ""}<p class="easy-small">${t("The first photo scan downloads the recognition models. Photos are not sent to an OCR API.", "首次掃描會下載文字辨識模型，照片不會傳送至OCR API。")}</p>` : ""}<div id="capture-progress" role="status" aria-live="polite">${esc(progress)}</div><label class="field"><span>${photo ? t("Text read from your photo", "從照片讀取的文字") : voice ? t("What we heard (you can edit it)", "聽寫文字（可修改）") : t("Your stock note", "你的庫存記錄")}</span><textarea id="stock-note" rows="5" placeholder="${t("Orange marmalade, 40 jars. Best before 2027-05-01.", "香橙果醬，40罐。最佳食用日期：2027-05-01。")}">${esc(note)}</textarea></label><div class="capture-input-actions"><button class="btn secondary" data-easy="sample">${t("Use a sample note", "使用示範文字")}</button><button class="btn primary" data-easy="extract" ${busy ? "disabled" : ""}>${t("Check the details", "核對資料")}</button></div></section>`;
}
export function botPage(c) {
  const { t, esc, icon, name } = c,
    bot = c.state.bot || { history: [], outbox: [], sessions: {} },
    sessions = Object.entries(bot.sessions).filter(([, s]) => !s.simulation),
    outbox = [...bot.outbox].reverse();
  const labels = {
    cancelled: t("Cancelled after demo reset", "重設示範後已取消"),
    outdated: t("Facts changed, not sent", "資料已更改，未發送"),
    ready: t("Ready, not sent", "已準備，尚未發送"),
    sending: t("Sending", "發送中"),
    accepted: t("Accepted by Twilio", "Twilio已接收"),
    queued: t("Queued", "已排程"),
    sent: t("Sent", "已發送"),
    delivered: t("Delivered", "已送達"),
    read: t("Read", "已讀"),
    failed: t("Failed", "發送失敗"),
    undelivered: t("Not delivered", "未送達"),
    uncertain: t("Delivery uncertain; not retried", "送遞狀態不明，未重試"),
  };
  return `<div class="page-heading"><div><h1>${t("WhatsApp messages", "WhatsApp訊息")}</h1><p>${t("Latest stock in. Relevant offers out.", "更新最新庫存，發送合適供應。")}</p></div><div class="heading-actions"><button class="btn secondary" data-easy="refresh">${icon("refresh", 17)}${t("Refresh", "重新整理")}</button><button class="btn primary" data-easy="whatsapp-settings">${t("WhatsApp connection", "WhatsApp連線")}</button></div></div><div class="bot-overview"><section class="panel"><h2>${t("Try the real bot on your phone", "用手機試用真正的聊天機械人")}</h2><p>${t("After joining the Twilio test number, send these messages:", "加入Twilio測試號碼後，發送以下訊息：")}</p><div class="command-row"><code>JOIN b1</code><span>${t("Try the Harbour Pantry customer profile", "試用海港食品店客戶資料")}</span></div><div class="command-row"><code>OFFERS</code><span>${t("Get an offer using current verified stock", "根據目前已核實庫存取得供應建議")}</span></div><div class="command-row"><code>START</code><span>${t("Opt in to matching new-stock updates", "訂閱合適的新庫存更新")}</span></div><div class="command-row"><code>JOIN worker</code><span>${t("Report a batch as production staff", "以生產職員身份提交產品更新")}</span></div><p class="footnote">${t("Use STOP to opt out. Automatic updates require an active 24-hour WhatsApp reply window.", "發送STOP可退訂。自動更新須在WhatsApp的24小時回覆時段內進行。")}</p></section><section class="panel"><h2>${t("Test the flow here", "在此測試流程")}</h2><p>${t("This labelled simulator uses the same database and matching rules. It never sends a WhatsApp message.", "此模擬器使用相同資料庫及配對規則，並不發送WhatsApp訊息。")}</p><form id="bot-simulator"><label class="field"><span>${t("Test message", "測試訊息")}</span><input name="message" required maxlength="2000" placeholder="JOIN b1"></label><button class="btn secondary" type="submit">${t("Run simulation", "執行模擬")}</button></form><div id="sim-reply" class="sim-reply" role="status"></div></section></div><section class="section"><div class="section-head"><h2>${t("Connected demo customers", "已連線的示範客戶")}</h2><span class="badge neutral">${sessions.length}</span></div>${sessions.length ? `<div class="session-list">${sessions.map(([phone, s]) => `<div><strong>${esc(s.role === "worker" ? t("Production staff", "生產職員") : name(c.state.buyers.find((b) => b.id === s.buyerId) || { name: "Customer" }))}</strong><span>•••• ${esc(phone.slice(-4))}</span><span class="badge ${s.optIn ? "green" : "neutral"}">${s.optIn ? t("Updates enabled", "已訂閱更新") : t("Replies only", "只接收回覆")}</span></div>`).join("")}</div>` : `<p class="muted section-empty">${t("No phone has messaged this bot yet. Join the test number, then send JOIN b1.", "暫未有手機向此機械人發訊息。加入測試號碼後，發送JOIN b1。")}</p>`}</section><section class="section"><div class="section-head"><h2>${t("Automatically prepared offers", "自動準備的供應建議")}</h2><span class="badge neutral">${outbox.length}</span></div><p class="muted">${t("A verified stock update creates these offers. Actual delivery additionally needs customer opt-in, a current match, an active reply window and a configured connection.", "庫存核實後自動建立建議。實際發送還需要客戶訂閱、目前配對有效、回覆時段有效及連線已設定。")}</p>${outbox.length ? `<div class="table-wrap"><table><thead><tr><th>${t("Customer", "客戶")}</th><th>${t("Product", "產品")}</th><th>${t("Delivery status", "發送狀態")}</th><th>${t("Message", "訊息")}</th></tr></thead><tbody>${outbox.map((m) => `<tr><td>${esc(name(c.state.buyers.find((b) => b.id === m.buyerId) || { name: "Customer" }))}</td><td>${esc(name(c.state.products.find((p) => p.id === m.productId) || { name: "Product" }))}</td><td><span class="badge ${["delivered", "read", "sent"].includes(m.status) ? "green" : "neutral"}">${labels[m.status] || esc(m.status)}</span>${m.errorCode ? `<small>${t("Provider code", "服務商代碼")} ${esc(m.errorCode)}</small>` : ""}</td><td><details><summary>${t("Read message", "閱讀訊息")}</summary><pre class="message-body">${esc(m.body)}</pre></details></td></tr>`).join("")}</tbody></table></div>` : `<div class="empty panel"><h3>${t("Verify a batch to prepare matching offers.", "核實一批產品，即可自動準備合適建議。")}</h3><p>${t("Unverified stock never triggers a promotion.", "未核實庫存不會觸發推廣。")}</p></div>`}</section><section class="section panel"><h2>${t("Conversation history", "對話記錄")}</h2>${
    bot.history.length
      ? `<div class="chat-history">${[...bot.history]
          .reverse()
          .slice(0, 20)
          .map(
            (m) =>
              `<article class="chat-bubble ${m.direction}"><div><strong>${m.direction === "in" ? t("Incoming", "收到") : t("Bot reply", "機械人回覆")}</strong><span>${m.simulation ? t("Simulation", "模擬") : t("WhatsApp", "WhatsApp")} <span class="separator">/</span>•••• ${esc(m.phone.slice(-4))}</span></div><p>${esc(m.body)}</p></article>`,
          )
          .join("")}</div>`
      : `<p class="muted">${t("Incoming requests and generated replies will appear here.", "收到的要求及產生的回覆會在此顯示。")}</p>`
  }</section>`;
}
export async function showWhatsAppSettings(c) {
  const { t, esc } = c;
  let settings;
  try {
    settings = await c.api("/api/settings/whatsapp");
  } catch (e) {
    c.toast(e.message);
    return;
  }
  const d = c.showDialog(
    t("Connect WhatsApp testing", "連接WhatsApp測試"),
    `<p>${t("Copy these values from your Twilio console. The Auth Token is encrypted on the server and is never shown again. Do not paste it into chat.", "從Twilio控制台複製以下資料。Auth Token會在伺服器加密儲存，並不會再次顯示。請勿貼到聊天中。")}</p>${settings.configured ? `<div class="notice green">${t("Connection configured. Enter a new token only to replace it.", "連線已設定。只有更換Token時才需重新輸入。")}</div>` : ""}<form id="whatsapp-connection-form"><label class="field"><span>Twilio Account SID</span><input name="accountSid" required pattern="AC[a-fA-F0-9]{32}" value="${esc(settings.accountSid || "")}" autocomplete="off"></label><label class="field"><span>Twilio Auth Token</span><input name="authToken" type="password" required minlength="32" maxlength="32" autocomplete="new-password"></label><label class="field"><span>${t("WhatsApp test number (with country code)", "WhatsApp測試號碼（包括國家代碼）")}</span><input name="phone" type="tel" required value="${esc(settings.phone || "")}" placeholder="+1…"></label><p id="connection-error" role="alert"></p><button class="btn primary full" type="submit">${t("Verify and save connection", "核實並儲存連線")}</button></form><label class="field"><span>${t("Incoming webhook URL (HTTP POST)", "接收訊息網址（HTTP POST）")}</span><input value="${esc(settings.webhookUrl)}" readonly></label><p class="footnote">${t("Use this URL in Twilio’s Custom inbound-message settings. This app validates Twilio’s request signature before reading customer messages.", "在Twilio的Custom接收訊息設定中使用此網址。本應用會先驗證Twilio請求簽署，再讀取訊息。")}</p>`,
  );
  d.querySelector("#whatsapp-connection-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const f = new FormData(e.target);
      await c.api("/api/settings/whatsapp", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(f)),
      });
      e.target.elements.authToken.value = "";
      d.close();
      c.toast(
        t(
          "WhatsApp credentials verified and saved.",
          "WhatsApp憑證已核實及儲存。",
        ),
      );
      c.render();
    } catch (err) {
      d.querySelector("#connection-error").textContent = err.message;
      button.disabled = false;
    }
  };
}
export function bindEasy(c) {
  const { t, esc } = c;
  document.querySelectorAll("[data-easy]").forEach(
    (el) =>
      (el.onclick = async () => {
        const action = el.dataset.easy;
        if (action === "choose") {
          method = el.dataset.method;
          mode = "input";
          note = "";
          progress = "";
          extracted = {};
          photoURL = "";
          c.render();
        }
        if (action === "pick" || action === "again") {
          recognition?.abort();
          mode = "pick";
          progress = "";
          c.render();
        }
        if (action === "back-input") {
          mode = "input";
          c.render();
        }
        if (action === "sales") c.navigate("workspace");
        if (action === "refresh") await c.refresh();
        if (action === "whatsapp-settings") await showWhatsAppSettings(c);
        if (action === "review-saved") c.review(savedProduct.id);
        if (action === "sample") {
          note = `Orange marmalade 40 jars. Price HK$38. Best before ${addDays(today(), 120)}.`;
          const field = document.querySelector("#stock-note");
          if (field) field.value = note;
          c.toast(
            t(
              "Sample note loaded. Review it before saving.",
              "已載入示範文字，儲存前請核對。",
            ),
          );
        }
        if (action === "extract") {
          recognition?.stop();
          note = document.querySelector("#stock-note").value;
          extracted = extractStockNote(note, c.state.products);
          mode = "review";
          c.render();
          document.querySelector("[name=quantity]")?.focus();
        }
        if (action === "record") {
          const API =
            window.SpeechRecognition || window.webkitSpeechRecognition;
          if (!API) {
            document.querySelector("#capture-progress").textContent = t(
              "Speech recognition is unavailable here. Type your note or use a photo.",
              "此瀏覽器未能使用語音辨識。請輸入文字或上載照片。",
            );
            return;
          }
          if (recognition) {
            recognition.abort();
            recognition = null;
            el.querySelector("span").textContent = t(
              "Start speaking",
              "開始講",
            );
            return;
          }
          recognition = new API();
          recognition.lang = "yue-Hant-HK";
          recognition.interimResults = true;
          recognition.continuous = false;
          recognition.onresult = (e) => {
            const value = [...e.results].map((r) => r[0].transcript).join(" ");
            note = value;
            const field = document.querySelector("#stock-note");
            if (field) field.value = value;
          };
          recognition.onerror = () => {
            const p = document.querySelector("#capture-progress");
            if (p)
              p.textContent = t(
                "Dictation could not finish. Type below or use a photo.",
                "聽寫未能完成。請在下方輸入或上載照片。",
              );
          };
          recognition.onend = () => {
            recognition = null;
            const span = document.querySelector("[data-easy=record] span");
            if (span) span.textContent = t("Start speaking", "開始講");
          };
          recognition.start();
          el.querySelector("span").textContent = t(
            "Listening… tap to stop",
            "聆聽中…按一下停止",
          );
          document.querySelector("#capture-progress").textContent = t(
            "Speak one short update. Then check the text below.",
            "講一段簡短更新，再核對下方文字。",
          );
        }
      }),
  );
  const photo = document.querySelector("#stock-photo");
  if (photo)
    photo.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (
        file.size > 10 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.type)
      ) {
        c.toast(
          t(
            "Choose a JPG, PNG or WebP photo under 10 MB.",
            "請選擇少於10MB的JPG、PNG或WebP照片。",
          ),
        );
        return;
      }
      if (photoURL) URL.revokeObjectURL(photoURL);
      photoURL = URL.createObjectURL(file);
      busy = true;
      progress = t("Preparing photo recognition…", "準備照片辨識…");
      c.render();
      let timeout;
      try {
        const { createWorker } = await import("./vendor/ocr.js");
        ocrWorker = await createWorker(["eng", "chi_tra"], 1, {
          workerPath: new URL("./vendor/worker.min.js", location.href).href,
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
          langPath: "https://tessdata.projectnaptha.com/4.0.0",
          logger: (m) => {
            progress =
              (m.status === "recognizing text"
                ? t("Reading your photo", "正在讀取照片")
                : t("Loading recognition models", "載入文字辨識模型")) +
              " " +
              Math.round((m.progress || 0) * 100) +
              "%";
            const status = document.querySelector("#capture-progress");
            if (status) status.textContent = progress;
          },
        });
        timeout = setTimeout(() => ocrWorker?.terminate(), 120000);
        const result = await ocrWorker.recognize(file);
        note = result.data.text.trim().slice(0, 12000);
        progress = note
          ? t(
              "Photo read. Check and correct the text below.",
              "已讀取照片。請核對並修正下方文字。",
            )
          : t(
              "No clear text was found. Try a closer, brighter photo or type the note.",
              "未能找到清晰文字。請使用更近、更光的照片，或輸入文字。",
            );
      } catch {
        progress = t(
          "The photo could not be read. Check your connection, try a clearer photo, or type below.",
          "未能讀取照片。請檢查網絡、使用更清晰照片，或在下方輸入。",
        );
      } finally {
        clearTimeout(timeout);
        await ocrWorker?.terminate().catch(() => {});
        ocrWorker = null;
        busy = false;
        c.render();
      }
    };
  const noteField = document.querySelector("#stock-note");
  if (noteField) noteField.oninput = (e) => (note = e.target.value);
  const productSelect = document.querySelector("#easy-product");
  if (productSelect)
    productSelect.onchange = (e) => {
      const p = c.state.products.find((p) => p.id === e.target.value);
      document.querySelector("#easy-stock-form [name=name]").value =
        p?.name || "";
    };
  const form = document.querySelector("#easy-stock-form");
  if (form)
    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(form),
        base = c.state.products.find((p) => p.id === f.get("productId"));
      const p = {
        ...(base || {}),
        id: crypto.randomUUID(),
        name: f.get("name").trim(),
        nameZh: base?.nameZh || f.get("name").trim(),
        quantity: Number(f.get("quantity")),
        price:
          f.get("price") !== "" ? Number(f.get("price")) : (base?.price ?? ""),
        expiry: f.get("expiry"),
        available: today(),
        category: base?.category || "Preserves",
        storage: base?.storage || "Ambient",
        districts: base?.districts || [],
        delivery: base?.delivery || "",
        deliveryZh: base?.deliveryZh || "",
        leadDays: base?.leadDays ?? 3,
        source:
          method === "photo"
            ? "Photo production sheet (text checked by worker)"
            : method === "voice"
              ? "Cantonese production note (text checked by worker)"
              : "Worker stock note",
        sourceMethod: method,
        notes: note,
        status: "pending",
        confirmed: f.has("confirmed"),
        reviewer: "",
        verifiedAt: null,
        accent: base?.accent || "orange",
        unit: "jars",
      };
      busy = true;
      const submit = form.querySelector("[type=submit]");
      submit.disabled = true;
      submit.textContent = t("Saving…", "儲存中…");
      try {
        await c.addProduct(p);
        savedProduct = p;
        mode = "saved";
        busy = false;
        c.render();
      } catch (err) {
        busy = false;
        document.querySelector("#easy-error").textContent = err.message;
        submit.disabled = false;
        submit.textContent = t("Save for staff review", "儲存以供職員核實");
      }
    };
  const simulator = document.querySelector("#bot-simulator");
  if (simulator)
    simulator.onsubmit = async (e) => {
      e.preventDefault();
      const message = new FormData(simulator).get("message");
      const b = simulator.querySelector("button");
      b.disabled = true;
      try {
        await c.flush();
        const r = await c.api("/api/bot/simulate", {
          method: "POST",
          body: JSON.stringify({ message }),
        });
        c.acceptSnapshot(r);
        document.querySelector("#sim-reply").textContent = r.reply;
        simulator.reset();
      } catch (err) {
        document.querySelector("#sim-reply").textContent = err.message;
      } finally {
        b.disabled = false;
      }
    };
}
