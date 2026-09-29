/* Wizard logic test with a fake DOM (node, stdlib only).
 * Usage: node scripts/test_wizard.js  (exit 0 = pass)
 * Exercises motion.js booking flow: validation gate, doctor pick,
 * day/slot render, review fill, submit post + reset. */
"use strict";
const fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "workspaces", "mayo-clinic", "pages", "motion.js"), "utf8");
let pass = 0;
function ok(cond, name) { pass += cond ? 0 : 1; console.log((cond ? "PASS " : "FAIL ") + name); }

function El(tag) {
  return { tag, children: [], dataset: {}, style: {}, value: "", textContent: "",
    _cls: new Set(), _handlers: {}, _attrs: {},
    classList: { add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); }, _s: null },
    addEventListener(t, f) { (this._handlers[t] = this._handlers[t] || []).push(f); },
    fire(t, e) { (this._handlers[t] || []).forEach(f => f.call(this, e || {})); },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    replaceChild(c, o) { this.children = this.children.map(x => x === o ? (c.parentNode = this, c) : x); return o; },
    querySelectorAll(s) { const c = s.startsWith(".") ? s.slice(1) : s;
      return this.children.filter(k => k.classList && k.classList.contains(c)); },
    querySelector(s) { return this.querySelectorAll(s)[0] || null; },
    setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k]; },
    set innerHTML(v) { if (v === "") this.children = []; this._html = v; },
    get innerHTML() { return this._html || ""; },
    checkValidity() { return true; }, reportValidity() {},
    reset() { this.value = ""; }, scrollIntoView() {}, tabIndex: 0 };
}
function wire(el) { el.classList._s = el._cls; return el; }

/* build the wizard subtree motion.js expects */
const panes = [1, 2, 3, 4].map(n => { const e = wire(El("div")); e.dataset.pane = String(n); return e; });
const tabs = [0, 1, 2, 3].map(() => wire(El("span")));
const byId = {};
["wizTitle", "docGrid", "dayChips", "slotChips", "rv", "hDoctor", "hWhen",
 "name", "phone", "concern", "success"].forEach(id => { byId[id] = wire(El("div")); });
byId.name.value = "Probe"; byId.phone.value = "9876543210"; byId.concern.value = "General consultation";
const go2 = wire(El("button")); go2.dataset.go = "2";
go2.setAttribute("data-go", "2");
const wiz = wire(El("form"));
wiz.action = "https://n8n.example.com/webhook/lead-intake";
const SEL = { ".wiz-pane": panes, ".wiz-steps span": tabs, "[data-go]": [go2],
  "#docGrid": [byId.docGrid], "#dayChips": [byId.dayChips], "#slotChips": [byId.slotChips],
  "#rv": [byId.rv], "#wizTitle": [byId.wizTitle], "#hDoctor": [byId.hDoctor], "#hWhen": [byId.hWhen],
  "#name": [byId.name], "#phone": [byId.phone], "#concern": [byId.concern],
  '[data-pane="1"] input[required], [data-pane="1"] select[required]': [byId.name, byId.phone, byId.concern] };
wiz.querySelector = s => (SEL[s] || [wire(El("div"))])[0];
wiz.querySelectorAll = s => SEL[s] || [];
const created = [];
global.document = {
  getElementById: id => (id === "wiz" ? wiz : (byId[id] || null)),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: t => { const e = wire(El(t)); created.push(e); return e; }
};
global.window = { WG_DOCS: [
  { name: "Dr. A", init: "AA", spec: "Gen", exp: "5 yrs", hue: "#000", next: "Today", slots: ["10:00", "11:00"], img: "assets/a-200.jpg", qual: "MBBS, MD Gen", since: 2021 },
  { name: "Dr. B", init: "BB", spec: "Gen", exp: "6 yrs", hue: "#111", next: "Tomorrow", slots: ["12:00"], img: "assets/b-200.jpg", qual: "MBBS, MS Gen", since: 2020 } ],
  matchMedia: undefined };
global.window.matchMedia = () => ({ matches: true }); // skip rAF mesh, take static branch
global.window.addEventListener = () => {};
global.window.innerWidth = 1280;
global.location = { pathname: "/opd-booking.html" };
let fetched = null;
global.fetch = async (url, o) => { fetched = { url, body: o.body }; return {}; };
global.FormData = function () {};
global.requestAnimationFrame = () => {};
eval(SRC);

/* drive the flow */
ok(panes[0].classList.contains("on"), "step 1 shown initially");
go2.fire("click");
ok(panes[1].classList.contains("on"), "validation gate passes -> step 2");
ok(byId.docGrid.children.length === 2, "2 doctors rendered");
ok(byId.docGrid.children.every(c => (c.innerHTML || "").includes("<img") && (c.innerHTML || "").includes("assets/")),
  "doctor cards render avatar img with local src");
ok(byId.docGrid.children.every(c => (c.innerHTML || "").includes("MBBS") && (c.innerHTML || "").includes("Since")),
  "doctor cards show qualifications + experience-since");
ok(typeof window.WG_AVFALLBACK === "function", "avatar fallback handler exists");
(function () {
  const parent = wire(El("span")), img = wire(El("img"));
  parent.appendChild(img); window.WG_AVFALLBACK(img, "AS");
  ok(parent.children.length === 1 && parent.children[0].textContent === "AS", "broken avatar swaps to initials");
})();
byId.docGrid.children[0].fire("click");
ok(panes[2].classList.contains("on"), "doctor pick -> step 3 (calendar)");
ok(byId.dayChips.children.length === 7, "7 day chips rendered");
byId.dayChips.children[0].fire("click");
ok(byId.slotChips.children.length === 2, "2 slot chips for Dr. A");
byId.slotChips.children[1].fire("click");
ok(panes[3].classList.contains("on"), "slot pick -> step 4 (review)");
ok(byId.rv.innerHTML.includes("Dr. A") && byId.hDoctor.value.includes("Dr. A"), "review + hidden doctor filled");
ok(byId.hWhen.value.includes("11:00"), "hidden when filled");
wiz.fire("submit", { preventDefault() {} });
setTimeout(() => {
  ok(fetched && fetched.url === wiz.action, "submit POSTs to webhook");
  ok(byId.success.style.display === "block", "success shown");
  ok(panes[0].classList.contains("on") && byId.docGrid.children.length === 2, "reset returns to step 1 with roster");
  console.log(pass === 0 ? "WIZARD TEST PASS" : "WIZARD TEST FAIL");
  process.exit(pass === 0 ? 0 : 1);
}, 50);
