import { seedState, today, addDays } from "./domain.js";

export const demoChoices = [
  { id: "small", quantity: 40, en: "40 jars", zh: "40罐" },
  { id: "large", quantity: 120, en: "120 jars", zh: "120罐" },
];

// These are supplied classroom facts, never inferred from a real stock update.
export function demoStock(choice = "small") {
  const preset = demoChoices.find((p) => p.id === choice) || demoChoices[0];
  return {
    ...seedState().products[0],
    id: `quick-demo-${preset.id}`,
    quantity: preset.quantity,
    expiry: addDays(today(), 120),
    verifiedAt: `${today()}T00:00:00.000Z`,
    source: "Pre-checked classroom sample",
    sourceMethod: "demo",
    demoOnly: true,
    notes: "200 g per jar. Pre-filled classroom example, not a real stock report.",
  };
}
