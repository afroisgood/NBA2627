// 測試用的執行環境：把 src/ 的程式照 build.py 的順序載入 Node 的 vm，
// 用假的 document／localStorage 取代瀏覽器，讓計算函式可以直接呼叫。
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const JS_ORDER = ["data.js", "market.js", "import.js", "model.js", "app.js", "trade.js", "fa.js"];

function fakeEl() {
  return {
    style: {}, dataset: {}, hidden: false, disabled: false, checked: false,
    value: "", textContent: "", innerHTML: "", href: "", options: [], selectedIndex: 0,
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, getAttribute() { return null; }, addEventListener() {}, removeEventListener() {},
    querySelectorAll() { return []; }, querySelector() { return fakeEl(); },
    scrollIntoView() {}, select() {}, appendChild() {}, remove() {}, click() {},
  };
}

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
  };
}

// opts.local：放進 localStorage 的值（例如 {"lp-data": JSON 字串}）；opts.shared：window.SHARED_DATA
function load(opts = {}) {
  const els = {};
  const ctx = {
    console,
    setTimeout, clearTimeout,
    localStorage: memStorage(opts.local),
    sessionStorage: memStorage(),
    matchMedia: () => ({ matches: true }),
    navigator: { clipboard: { writeText: async () => {} } },
    location: { hash: "", pathname: "/", search: "", reload() {} },
    history: { replaceState() {} },
    confirm: () => false, alert() {},
    URL: { createObjectURL: () => "", revokeObjectURL() {} },
    Blob: function () {},
    document: {
      getElementById: id => els[id] || (els[id] = fakeEl()),
      createElement: () => fakeEl(),
      querySelectorAll: () => [],
      addEventListener() {}, removeEventListener() {},
      body: fakeEl(), documentElement: fakeEl(),
    },
  };
  ctx.window = ctx;
  if (opts.shared !== undefined) ctx.SHARED_DATA = opts.shared;
  vm.createContext(ctx);
  const code = JS_ORDER.map(f => fs.readFileSync(path.join(ROOT, "src", f), "utf8")).join("\n");
  vm.runInContext(code, ctx, { filename: "src-bundle.js" });
  // run("運算式")：在同一個環境裡執行，拿得到 const／let 宣告的變數（DATA、state、FA…）
  // 物件和陣列轉成一般資料再回傳，assert 的 deepEqual 才比得起來
  const run = src => { const r = vm.runInContext(src, ctx); return r && typeof r === "object" ? JSON.parse(JSON.stringify(r)) : r; };
  return { ctx, run, els };
}

// 一位球員：[名字, 名單位置, "NBA隊 - 位置", 狀態, proj, last, cur]
// s(...)：數據陣列 [gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to]
const s = (gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to) => [gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to];
const P = (name, slot, team, st, proj, last = null, cur = null) => [name, slot, team, st, proj, last, cur];

// 固定的小聯盟：A 隊各項都比 B 隊好，C、D 介於中間
function fixtureLeague(run) {
  const base = s(70, 5, 10, 2, 2.5, 1, 13, 5, 3, 1, 0.5, 1.5);
  const scale = (x, k) => x.map((v, i) => (i === 0 ? v : +(v * k).toFixed(2)));
  const team = (name, k, extra = []) => [name, [
    P(`${name}1`, "PG", "LAL - PG", "", scale(base, k)),
    P(`${name}2`, "SF", "BOS - SF,PF", "", scale(base, k)),
    P(`${name}3`, "C", "DEN - C", "", scale(base, k)),
    ...extra,
  ]];
  const league = [
    team("A", 1.3, [P("A-IL", "IL", "LAL - C", "", scale(base, 5))]),
    team("B", 0.8),
    team("C", 1.1),
    team("D", 1.0),
  ];
  run(`DATA.splice(0, DATA.length, ...${JSON.stringify(league)}); ME = "A";
    for (const k in MKT) delete MKT[k];
    state.src = "pr"; state.punt = false; state.inj = true;`);
  return league;
}

module.exports = { load, fixtureLeague, s, P, JS_ORDER, ROOT };
