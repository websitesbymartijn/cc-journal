export const MANTRAS = [
  "Plan the trade. Trade the plan.",
  "Be late rather than too early.",
  "Capital preservation comes first.",
  "Process over outcome — always.",
  "The chart will be there tomorrow.",
  "Patience is a position.",
  "Risk first, return second.",
  "No trade is a trade.",
  "Confluence over conviction.",
  "Trust your levels. Respect your stop.",
  "The market owes you nothing.",
  "Smaller size, sharper edge.",
  "One A+ setup beats ten B-grade trades.",
  "Sit on your hands when in doubt.",
  "Execution is the edge.",
  "Boredom is bullish — for your account.",
  "Every red day is tuition. Pay it once.",
  "Take a cookie. Don't be greedy.",
  "Setup, trigger, size — in that order.",
  "Cash is a position.",
  "Sleep well, trade well.",
  "You are not the hunter.",
  "Less is more.",
  "The best traders fold the most hands.",
  "Stick to the level. Skip the noise.",
  "Don't fight the tape.",
  "Drawdowns are data, not destiny.",
  "Your stop is a tool, not a suggestion.",
  "Trade your size, not your ego.",
  "The next trade is the only one that matters.",
];

export function todayMantra() {
  const d = new Date();
  const day = Math.floor(d.getTime() / (1000 * 60 * 60 * 24));
  return MANTRAS[day % MANTRAS.length];
}

export function randomMantra() {
  return MANTRAS[Math.floor(Math.random() * MANTRAS.length)];
}
