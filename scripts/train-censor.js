// Offline trainer: brain.js LSTM on rollout data.json.
// Retrain: npm i -D brain.js && node scripts/train-censor.js
// HONEST RESULT (2026-10-01, 6 training runs): LSTM/GRU collapse on this data in
// every configuration (imbalanced, balanced, binary+clean business verticals,
// forced iterations, GRU). Best run: 3/4 harmful caught but 7/8 clean flagged —
// shipping it would block legitimate customers. Production uses the
// dataset-derived specificity scorer in lib/moderate.ts (same data.json source,
// verified precision/recall) instead. The expanded v2 set (348 rows, 10 business
// verticals) stays for retraining when more labeled data exists.
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
