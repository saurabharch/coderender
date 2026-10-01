// Offline trainer: brain.js LSTM on rollout data.json.
// Retrain: npm i -D brain.js && node scripts/train-censor.js
// HONEST RESULT (2026-10-01): the LSTM collapses to the majority class on this
// 853-row set in every configuration tried (imbalanced, balanced, binary+clean,
// forced iterations) — it flags even "hello" as harmful. Shipping it would block
// every user, so production uses the dataset-derived specificity scorer in
// lib/moderate.ts (same data.json source, verified precision/recall) instead.
// Keep this script + dataset for retraining when more labeled data exists.
const fs = require("fs");
const path = require("path");
const brain = require("brain.js");

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, "train-data", "nsfw.json"), "utf8"));
const data = rows
  .filter((r) => r && typeof r.text === "string" && r.category)
  .map((r) => ({ input: r.text.slice(0, 200), output: Array.isArray(r.category) ? r.category[0] : r.category }));

console.log(`training on ${data.length} samples…`);
const net = new brain.recurrent.LSTM();
net.train(data, { iterations: 25, errorThresh: 0.4, log: true, logPeriod: 5 });
const out = path.join(__dirname, "..", "lib", "brain-nsfw.json");
fs.writeFileSync(out, JSON.stringify(net.toJSON()));
console.log("saved", out, fs.statSync(out).size, "bytes");
