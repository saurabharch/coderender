/* Page-init regression test (node, stdlib only).
 * Usage: node scripts/test_page_init.js  (exit 0 = pass)
 * Covers what scripts/test_wizard.js masks:
 *  A. CSS contrast of the wizard/readability chain in system.css
 *     (models "doctor-name list not visible to read").
 *  B. Split-row <img> integrity in the 3 pages that have them
 *     (models "row images missing" under "Never travel on a maybe").
 *  C. Full pre-wizard init order in motion.js (mesh, reveals, progress,
 *     slider, wizard, accordion, forms, burger, resize, tabbar) with a
 *     healthy-browser fake DOM. A throw anywhere before wizard init would
 *     leave #docGrid empty in a real browser. Also fires the recorded
 *     resize listeners: motion.js must survive window resize. */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const PAGES = path.join(ROOT, "workspaces", "mayo-clinic", "pages");
const SRC = fs.readFileSync(path.join(PAGES, "motion.js"), "utf8");
const CSS = fs.readFileSync(path.join(PAGES, "system.css"), "utf8");
let fail = 0;
function ok(cond, name, extra) {
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " — " + extra : "")); }
  else console.log("PASS " + name);
}

/* ---------- A. contrast audit ---------- */
function lum(hex) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const x = lum(a), y = lum(b), hi = Math.max(x, y), lo = Math.min(x, y);
  return (hi + 0.05) / (lo + 0.05);
}
/* effective :root vars: later blocks win (same specificity) */
const rootVars = {};
for (const m of CSS.matchAll(/:root\s*\{([^}]*)\}/g)) {
  for (const d of m[1].matchAll(/--([\w-]+)\s*:\s*([^;}]+)\s*;?/g)) rootVars[d[1]] = d[2].trim();
}
/* in-body --accent comes from body[data-accent] (beats :root via inheritance) */
const accents = {};
for (const m of CSS.matchAll(/body\[data-accent="(\w+)"\]\s*\{([^}]*)\}/g)) {
  const d = /--accent\s*:\s*([^;}]+)/.exec(m[2]);
  if (d) accents[m[1]] = d[1].trim();
}
const opdHtml = fs.readFileSync(path.join(PAGES, "opd-booking.html"), "utf8");
const opdAccentName = (/data-accent="(\w+)"/.exec(
  /<body[^>]*>/.exec(opdHtml)[0]) || [])[1];
const ACCENT = accents[opdAccentName] || rootVars.accent; // effective brand in body
const MUTED = rootVars.muted;                            // no body override exists
const CARD = "#fffdf8", PAPER = "#faf6ef", WHITE = "#ffffff";
console.log(`-- vars: muted=${MUTED} accent(in-body)=${ACCENT}`);
ok(ratio(MUTED, CARD) >= 4.5, "note/step text readable (.note, .wiz-steps)",
  `muted ${MUTED} on card = ${ratio(MUTED, CARD).toFixed(2)}:1`);
ok(ratio(MUTED, PAPER) >= 4.5, "muted readable on paper (nav, strips, notes)",
  `muted ${MUTED} on paper = ${ratio(MUTED, PAPER).toFixed(2)}:1`);
ok(ratio(WHITE, ACCENT) >= 4.5, "selected chips readable (white on accent)",
  `white on ${ACCENT} = ${ratio(WHITE, ACCENT).toFixed(2)}:1`);
ok(ratio(ACCENT, CARD) >= 3, "accent links/btns distinguishable on card",
  `${ACCENT} on card = ${ratio(ACCENT, CARD).toFixed(2)}:1`);
/* .doc literals pinned by the earlier contrast fix must hold */
const docB = /\.doc b\{[^}]*color:([^;}]+)/.exec(CSS),
      docS = /\.doc small\{[^}]*color:([^;}]+)/.exec(CSS),
      docN = /\.doc \.next\{[^}]*color:([^;}]+)/.exec(CSS);
ok(!!(docB && docS && docN), "doc text colors are explicit literals (no var)");
if (docB && docS && docN) {
  const res = v => v.includes("var(")
    ? (v.includes("ink") ? "#211a14" : v.includes("teal-d") ? "#083f46" : MUTED)
    : v;
  ok(ratio(res(docB[1].trim()), "#ffffff") >= 7, "doctor name ink-on-white",
    `${docB[1].trim()} = ${ratio(res(docB[1].trim()), "#ffffff").toFixed(2)}:1`);
  ok(ratio(res(docS[1].trim()), "#ffffff") >= 4.5, "doctor spec readable",
    `${docS[1].trim()} = ${ratio(res(docS[1].trim()), "#ffffff").toFixed(2)}:1`);
}

/* ---------- B. split-row image integrity ---------- */
for (const f of ["opd-booking.html", "camp-registration.html", "second-opinion.html"]) {
  const html = fs.readFileSync(path.join(PAGES, f), "utf8");
  const imgs = [...html.matchAll(/<img\s+[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g)];
  const badSrc = imgs.filter(m => !/^assets\//.test(m[1]));
  ok(imgs.length > 0 && badSrc.length === 0, `${f}: all img src resolve to local assets`,
    badSrc.map(m => `src="${m[1]}" alt="${m[2]}"`).join("; "));
  const missing = imgs.filter(m => /^assets\//.test(m[1]) &&
    !fs.existsSync(path.join(PAGES, m[1])));
  ok(missing.length === 0, `${f}: referenced assets exist on disk`,
    missing.map(m => m[1]).join("; "));
  const badAlt = imgs.filter(m => /^(True|False|)$/.test(m[2]));
  ok(badAlt.length === 0, `${f}: no boolean/empty alt text`,
    badAlt.map(m => `src="${m[1]}"`).join("; "));
  ok(!/<p>assets\//.test(html), `${f}: no asset path dumped as paragraph text`);
}

/* ---------- C. full init-order harness (healthy browser) ---------- */
function El(tag) {
  return { tag, children: [], dataset: {}, style: {}, value: "", textContent: "",
    _cls: new Set(), _handlers: {}, _attrs: {},
    classList: { add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { if (f === undefined) f = !this._s.has(c); f ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }, _s: null },
    addEventListener(t, f) { (this._handlers[t] = this._handlers[t] || []).push(f); },
    fire(t, e) { (this._handlers[t] || []).forEach(f => f.call(this, e || {})); },
    appendChild(c) { this.children.push(c); return c; },
    querySelectorAll(s) { const c = s.startsWith(".") ? s.slice(1) : s;
      return this.children.filter(k => k.classList && k.classList.contains(c)); },
    querySelector(s) { return this.querySelectorAll(s)[0] || null; },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    set innerHTML(v) { if (v === "") this.children = []; this._html = v; },
    get innerHTML() { return this._html || ""; },
    checkValidity() { return true; }, reportValidity() {},
    reset() { this.value = ""; }, scrollIntoView() {}, tabIndex: 0, type: "", open: false };
}
function wire(el) { el.classList._s = el._cls; return el; }

/* wizard subtree (mirrors test_wizard.js, 6 real doctors) */
const panes = [1, 2, 3, 4].map(n => { const e = wire(El("div")); e.dataset.pane = String(n); return e; });
const tabs = [0, 1, 2, 3].map(() => wire(El("span")));
const byId = {};
["wizTitle", "docGrid", "dayChips", "slotChips", "rv", "hDoctor", "hWhen",
 "name", "phone", "concern", "success"].forEach(id => { byId[id] = wire(El("div")); });
byId.name.value = "Probe"; byId.phone.value = "9876543210"; byId.concern.value = "General consultation";
const go2 = wire(El("button")); go2.setAttribute("data-go", "2");
const wiz = wire(El("form"));
wiz.action = "https://n8n.example.com/webhook/lead-intake";
const SEL = { ".wiz-pane": panes, ".wiz-steps span": tabs, "[data-go]": [go2],
  "#docGrid": [byId.docGrid], "#dayChips": [byId.dayChips], "#slotChips": [byId.slotChips],
  "#rv": [byId.rv], "#wizTitle": [byId.wizTitle], "#hDoctor": [byId.hDoctor], "#hWhen": [byId.hWhen],
  "#name": [byId.name], "#phone": [byId.phone], "#concern": [byId.concern],
  '[data-pane="1"] input[required], [data-pane="1"] select[required]': [byId.name, byId.phone, byId.concern] };
wiz.querySelector = s => (SEL[s] || [wire(El("div"))])[0];
wiz.querySelectorAll = s => SEL[s] || [];
/* pre/post-wizard page furniture */
const rvForm = wire(El("form")); // form#wiz also carries .rv in the real page
const meshCv = wire(El("canvas"));
meshCv.getContext = () => ({ clearRect() {}, fillRect() {},
  createRadialGradient: () => ({ addColorStop() {} }), set fillStyle(v) {} });
meshCv.parentElement = { getBoundingClientRect: () => ({ width: 800, height: 400 }), offsetHeight: 400 };
const bar = wire(El("div"));
const track = wire(El("div"));
track.children = [0, 1, 2, 3, 4].map(() => wire(El("div")));
const dots = wire(El("div"));
const prevB = wire(El("button")); prevB.setAttribute("data-sl", "prev");
const nextB = wire(El("button")); nextB.setAttribute("data-sl", "next");
const slider = wire(El("div"));
slider.querySelector = s => (s === ".slides" ? track : null);
slider.querySelectorAll = s => (s === "[data-sl]" ? [prevB, nextB] : []);
slider.parentElement = { querySelector: s => (s === ".sl-dots" ? dots : null) };
const faqSum = wire(El("summary"));
const faqDt = wire(El("details"));
faqDt.querySelector = () => faqSum;
const burger = wire(El("button")), mmenu = wire(El("div"));
const tabSelf = wire(El("a")); tabSelf.setAttribute("href", "opd-booking.html");
const tabOther = wire(El("a")); tabOther.setAttribute("href", "index.html");
const created = [];
const winListeners = {};
global.document = {
  getElementById: id => (id === "wiz" ? wiz : (id === "mesh" ? meshCv
    : (id === "success" ? byId.success : (byId[id] || null)))),
  querySelector: s => (s === ".progress" ? bar : s === ".burger" ? burger
    : s === ".mmenu" ? mmenu : null),
  querySelectorAll: s => (s === ".rv" ? [rvForm] : s === ".slider" ? [slider]
    : s === ".faq details" ? [faqDt] : s === ".tabbar a" ? [tabSelf, tabOther] : []),
  createElement: t => { const e = wire(El(t)); created.push(e); return e; },
  documentElement: { scrollTop: 0, scrollHeight: 2000, clientHeight: 800 }
};
global.window = {
  WG_DOCS: ["A", "B", "C", "D", "E", "F"].map((k, i) => ({
    name: "Dr. " + k, init: k + k, spec: "Gen", exp: "5 yrs",
    hue: "#0d5c66", next: "Today", slots: ["10:00", "11:00"] })),
  matchMedia: () => ({ matches: false }), // healthy browser: mesh + IO branches run
  addEventListener: (t, f) => { (winListeners[t] = winListeners[t] || []).push(f); },
  innerWidth: 1280, scrollY: 0
};
global.location = { pathname: "/opd-booking.html" };
global.requestAnimationFrame = () => {}; // run one frame only, no loop
let ioCount = 0;
global.IntersectionObserver = function (fn) {
  this.observe = t => { ioCount++; fn([{ isIntersecting: true, target: t }]); };
  this.unobserve = () => {};
};
global.setInterval = () => 0; global.clearInterval = () => {};
global.fetch = async () => ({});
global.FormData = function () {};

let evalErr = null;
try { eval(SRC); } catch (e) { evalErr = e; }
ok(!evalErr, "full init order runs without throwing", evalErr && evalErr.message);
ok(byId.docGrid.children.length === 6, "doctor grid rendered after full init",
  `got ${byId.docGrid.children.length} docs`);
ok(rvForm.classList.contains("in"), "reveals fire via IO (form visible)");
ok(faqSum.getAttribute("aria-expanded") === "false", "accordion aria synced");
ok(wiz.dataset.bound === "1", "wizard submit handler bound");
ok(tabSelf.classList.contains("on") && !tabOther.classList.contains("on"),
  "tabbar highlights current page");
/* the resize path: a desktop window tweak / device rotation must not throw */
let resizeErr = null;
try {
  (winListeners.resize || []).forEach(f => f.call(global.window));
  global.window.innerWidth = 1024;
  (winListeners.resize || []).forEach(f => f.call(global.window));
} catch (e) { resizeErr = e; }
ok((winListeners.resize || []).length > 0, "resize listener registered");
ok(!resizeErr, "resize handler survives (no out-of-scope refs)",
  resizeErr && resizeErr.message);

console.log(fail === 0 ? "PAGE-INIT TEST PASS" : "PAGE-INIT TEST FAIL");
process.exit(fail === 0 ? 0 : 1);
