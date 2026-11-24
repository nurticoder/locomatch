import { today, isDate } from "./domain.js";
export function chineseNumber(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const n = {
    零: 0,
    〇: 0,
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
    part = 0;
  for (const c of value) {
    if (c === "十" || c === "百" || c === "千") {
      result += (part || 1) * { 十: 10, 百: 100, 千: 1000 }[c];
      part = 0;
    } else if (c in n) part = n[c];
    else return null;
  }
  return result + part;
}
export function extractStockNote(text, products = []) {
  const clean = String(text || "").slice(0, 12000),
    lower = clean.toLowerCase();
  const known =
    products.find((p) =>
      [p.name, p.nameZh, ...(p.aliases || [])]
        .filter(Boolean)
        .some((n) => lower.includes(n.toLowerCase())),
    ) ||
    (/橙|orange|marmalade/.test(lower)
      ? products.find((p) => p.name === "Orange marmalade")
      : null) ||
    (/洛神|roselle/.test(lower)
      ? products.find((p) => p.name === "Roselle jam")
      : null);
  const quantityMatch =
    clean.match(
      /([\d零〇一二兩三四五六七八九十百千]+)\s*(?:罐|樽|瓶|jars?)/i,
    ) || clean.match(/(?:quantity|數量|庫存|stock)\s*[:：]?\s*(\d+)/i);
  const priceMatch = clean.match(
    /(?:HK\$|\$|價格|售價|price)\s*[:：]?\s*(\d+(?:\.\d{1,2})?)/i,
  );
  const dateMatch = clean.match(
    /(?:best\s*before|expiry|expires?|到期|有效期|最佳食用日期)\s*[:：]?\s*(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/i,
  );
  const expiry = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : "";
  const labelled = clean.match(/(?:product|產品)\s*[:：]\s*([^\n]+)/i);
  return {
    productId: known?.id || "",
    name: known?.name || labelled?.[1]?.trim() || "",
    nameZh: known?.nameZh || "",
    quantity: quantityMatch ? chineseNumber(quantityMatch[1]) : null,
    price: priceMatch ? Number(priceMatch[1]) : null,
    expiry: isDate(expiry) ? expiry : "",
    text: clean,
    available: today(),
  };
}
