// Emoji shortcodes + palette (no deps). Type :fire: or tap the palette.
const MAP: Record<string, string> = {
  smile: "😊", laugh: "😂", wink: "😉", heart: "❤️", star: "⭐", fire: "🔥",
  check: "✅", cross: "❌", warn: "⚠️", info: "ℹ️", calendar: "📅", clock: "⏰",
  phone: "📞", mail: "📧", link: "🔗", pin: "📌", bulb: "💡", question: "❓",
  party: "🎉", rocket: "🚀", money: "💰", cart: "🛒", shop: "🏪", home: "🏠",
  car: "🚗", tools: "🛠️", memo: "📝", book: "📖", chart: "📊", هند: "🏠",
  thumbsup: "👍", thumbsdown: "👎", eyes: "👀", wave: "👋", pray: "🙏",
  target: "🎯", trophy: "🏆", gift: "🎁", bell: "🔔", lock: "🔒", key: "🔑",
  search: "🔍", zap: "⚡", bug: "🐞", tada: "🎉", idea: "💡", sleep: "😴",
  coffee: "☕", food: "🍕", health: "🏥", doctor: "👨‍⚕️", salon: "💇", gym: "💪",
  cake: "🎂", dog: "🐶", cat: "🐱", car2: "🚙", plane: "✈️", train: "🚂",
};

export const PALETTE = [...new Set(Object.values(MAP))].slice(0, 48);

export function expandShortcodes(text: string): string {
  return String(text ?? "").replace(/:([a-z0-9_+-]{2,20}):/gi, (m, k: string) =>
    MAP[k.toLowerCase()] ?? m);
}
