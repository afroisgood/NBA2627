// 執行：node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { load, fixtureLeague, s, P, JS_ORDER, ROOT } = require("./harness");

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const row = (run, name) => run(`(()=>{const r=compute();rankAll(r,true);return r.find(x=>x.name===${JSON.stringify(name)});})()`);

test("內建資料：16 隊都有名次、勝率在 0～1 之間", () => {
  const { run } = load();
  const rows = run(`(()=>{const r=compute();rankAll(r,true);return r;})()`);
  assert.equal(rows.length, 16);
  assert.deepEqual(rows.map(r => r.ovr).sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1));
  for (const r of rows) assert.ok(r.win > 0 && r.win < 1, `${r.name} 勝率 ${r.win}`);
});

test("compute：只加非 IL 球員；傷兵 O 不算、Q 打 75 折；全部照算時都算", () => {
  const { run } = load();
  fixtureLeague(run);
  const a = row(run, "A");
  near(a.v.pts, 3 * 13 * 1.3);
  assert.equal(a.n, 3);
  run(`DATA[0][1][1][3]="O"`);
  near(row(run, "A").v.pts, 2 * 13 * 1.3);
  run(`DATA[0][1][1][3]="Q"`);
  near(row(run, "A").v.pts, 3 * 13 * 1.3 - 13 * 1.3 * 0.25);
  run(`state.inj=false`);
  near(row(run, "A").v.pts, 3 * 13 * 1.3);
});

test("rankAll：各項名次、TO 越少越前、綜合名次", () => {
  const { run } = load();
  fixtureLeague(run);
  const r = run(`(()=>{const r=compute();rankAll(r,true);return Object.fromEntries(r.map(x=>[x.name,x]));})()`);
  assert.equal(r.A.r.pts, 1);
  assert.equal(r.C.r.pts, 2);
  assert.equal(r.D.r.pts, 3);
  assert.equal(r.B.r.pts, 4);
  assert.equal(r.B.r.to, 1, "B 的失誤最少");
  assert.equal(r.A.r.to, 4);
  assert.equal(r.A.ovr9, 1);
  assert.equal(r.C.ovr9, 2);
  near(r.B.avg, r.D.avg, 1e-9);  // B、D 平均名次一樣，誰第 3 都可以
  assert.equal(r.A.winRk, 1);
  assert.ok(r.A.win > r.C.win && r.C.win > r.D.win && r.D.win > r.B.win);
});

test("matchup：贏面雙方加起來是 1；實力一樣勝率 50%；全面壓制勝率很高", () => {
  const { run } = load();
  fixtureLeague(run);
  const res = run(`(()=>{const r=compute();const A=r[0].v,B=r[1].v;
    const ab=matchup(A,B),ba=matchup(B,A),aa=matchup(A,A);
    return {ab:ab.ps,ba:ba.ps,aa:aa.win,abWin:ab.win,abExp:ab.exp};})()`);
  res.ab.forEach((p, i) => near(p + res.ba[i], 1, 1e-9));
  near(res.aa, 0.5, 1e-9);
  assert.ok(res.abWin > 0.95, `A 對 B 勝率 ${res.abWin}`);
  assert.ok(res.abExp > 6 && res.abExp < 8);
});

test("addMix：本季打 g 場時佔 g/(g+20)；只有一種數據就用那一種", () => {
  const { run } = load();
  const out = run(`(()=>{
    const pr=[70,5,10,2,2.5,1,20,5,3,1,0.5,1.5], cu=[10,5,10,2,2.5,1,30,5,3,1,0.5,1.5];
    const a=["x","BN","LAL - PG","",pr,null,cu], b=["y","BN","LAL - PG","",pr,null,null], c=["z","BN","LAL - PG","",null,null,cu], d=["w","BN","","",null,null,null];
    [a,b,c,d].forEach(addMix);return [a[7],b[7],c[7],d[7]];})()`);
  near(out[0][6], 20 * (2 / 3) + 30 * (1 / 3), 0.01);
  assert.equal(out[0][0], 70, "GP 用預測的");
  assert.deepEqual(out[1], [70, 5, 10, 2, 2.5, 1, 20, 5, 3, 1, 0.5, 1.5]);
  assert.equal(out[2][6], 30);
  assert.equal(out[3], null);
});

test("lineup：每天最多 10 人先發，位置要合", () => {
  const { run } = load();
  const n = list => run(`lineup(${JSON.stringify(list.map((pos, i) => P("p" + i, "BN", "LAL - " + pos, "", null)))}).size`);
  assert.equal(n(["C", "C", "C", "C", "C"]), 4, "只有 C：C、C、Util、Util");
  assert.equal(n(["PG", "PG", "PG", "SG", "SG", "SG", "SF", "SF", "PF", "PF", "C", "C"]), 10);
  assert.equal(n(["PG", "SG"]), 2);
  assert.equal(n(["", "", ""]), 2, "沒有位置資料只能排 Util");
  // 價值高的排前面：前 4 個 C 先佔位置，第 5 個 C 排不進去
  const on = run(`[...lineup(${JSON.stringify(["C", "C", "C", "C", "C"].map((pos, i) => P("p" + i, "BN", "LAL - " + pos, "", null)))})].sort()`);
  assert.deepEqual(on, [0, 1, 2, 3]);
});

// 帶賽程和對戰的匯入資料
function importFixture(run, extra = {}) {
  const league = fixtureLeague(run);
  return {
    v: 1, at: "2026-10-10T00:00:00Z", ME: "A", DATA: league, MKT: {},
    SCHED: { base: "2026-10-01", teams: { LAL: [19, 20, 21], BOS: [19], DEN: [], MIA: [19, 26] } },
    ...extra,
  };
}

test("賽程：週一到週日分週、算出每位球員本週場數和先發後的一週總數", () => {
  const tmp = load();
  const imp = importFixture(tmp.run);
  const { run } = load({ local: { "lp-data": JSON.stringify(imp) } });
  assert.equal(run("IMP_FROM"), "local");
  const w = run("WEEKS[0]");
  assert.equal(w.s, 19, "第 1 週從開幕日 10/20（星期二）開始");
  assert.equal(w.e, 24, "到星期日 10/25");
  assert.equal(run("md(WEEKS[0].s)+'–'+md(WEEKS[0].e)"), "10/20–10/25");
  assert.equal(run("gamesIn(DATA[0][1][0],WEEKS[0])"), 3);
  const wt = run(`(()=>{const val=playerValues();return weekTotals(DATA[0][1],WEEKS[0],val);})()`);
  assert.equal(wt.starts, 4, "LAL 3 場＋BOS 1 場；DEN 沒比賽；IL 不算");
  near(wt.v.pts, 13 * 1.3 * 4);
});

test("匯入資料：網站共用和這台電腦的資料，用比較新的那份", () => {
  const tmp = load();
  const older = importFixture(tmp.run, { at: "2026-10-10T00:00:00Z", ME: "A" });
  const newer = { ...older, at: "2026-10-11T00:00:00Z" };
  assert.equal(load({ local: { "lp-data": JSON.stringify(older) }, shared: newer }).run("IMP_FROM"), "shared");
  assert.equal(load({ local: { "lp-data": JSON.stringify(newer) }, shared: older }).run("IMP_FROM"), "local");
  assert.equal(load({ shared: null }).run("IMP"), null);
});

test("checkImport：格式不對的資料會被擋下", () => {
  const { run } = load();
  const good = importFixture(run);
  const check = o => run(`checkImport(${JSON.stringify(o)})`);
  assert.equal(check(good), "");
  const badStats = JSON.parse(JSON.stringify(good));
  badStats.DATA[0][1][0][4] = [1, 2, 3];
  assert.notEqual(check(badStats), "");
  assert.notEqual(check({ ...good, MKT: { x: ["<b>", 1] } }), "");
  assert.notEqual(check({ ...good, SCHED: { base: "2026-10-01", teams: { LAL: [500] } } }), "");
  assert.notEqual(check({ ...good, MATCH: { at: "x", opp: "B", week: 1, me: { pts: "1" }, op: null } }), "");
  assert.notEqual(check({ ...good, ME: "沒有這隊" }), "");
});

test("本週對戰：抓的那週就是現在這週才用；對手不在聯盟裡就不用", () => {
  const tmp = load();
  const now = new Date().toISOString();
  const imp = importFixture(tmp.run, { MATCH: { at: now, week: 1, opp: "C", me: null, op: null } });
  // 沒有賽程：7 天內抓的才算
  delete imp.SCHED;
  assert.equal(load({ local: { "lp-data": JSON.stringify(imp) } }).run("matchNow()&&matchNow().opp"), "C");
  imp.MATCH.at = new Date(Date.now() - 8 * 864e5).toISOString();
  assert.equal(load({ local: { "lp-data": JSON.stringify(imp) } }).run("matchNow()"), null);
  imp.MATCH = { at: now, week: 1, opp: "不存在", me: null, op: null };
  assert.equal(load({ local: { "lp-data": JSON.stringify(imp) } }).run("matchNow()"), null);
});

test("交易分析器：交換後的球隊數據、公平度", () => {
  const { run } = load();
  fixtureLeague(run);
  const j = run(`(()=>{const b=compute();rankAll(b);const J=judge(["A1"],["B1"],"B","",b);
    return {pts:J.b1.v.pts,oppPts:J.o1.v.pts,fair:J.fair,acc:J.acc};})()`);
  near(j.pts, 3 * 13 * 1.3 - 13 * 1.3 + 13 * 0.8);
  near(j.oppPts, 3 * 13 * 0.8 - 13 * 0.8 + 13 * 1.3);
  near(j.fair, 1, 1e-9, "兩人都沒有排名資料，市場價值一樣");
  assert.ok(["高", "中", "低"].includes(j.acc));
});

test("FA 分析器：丟人後撿人名單人數不變；直接撿人多一人", () => {
  const { run } = load();
  fixtureLeague(run);
  run(`for(const k in FA)delete FA[k]; FA["F1"]=["F1","FA","MIA - PG","",[70,8,16,4,5,3,30,6,6,2,1,2],null,null];`);
  const swap = run(`(()=>{const r=simulatePickup("F1","A3");return {n:r.n,pts:r.v.pts,names:r.ps.map(p=>p[0])};})()`);
  assert.equal(swap.n, 3);
  assert.ok(swap.names.includes("F1") && !swap.names.includes("A3"));
  near(swap.pts, 2 * 13 * 1.3 + 30);
  const add = run(`simulatePickup("F1","").n`);
  assert.equal(add, 4);
});

test("建置設定：測試和 build.py 載入一樣的檔案順序", () => {
  const build = fs.readFileSync(path.join(ROOT, "build.py"), "utf8");
  const list = JSON.parse(build.match(/for f in (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(list, JS_ORDER);
});

test("更新程式：不能有行尾 // 註解（書籤會壞）、不能有 </script", () => {
  const src = fs.readFileSync(path.join(ROOT, "tools", "yahoo-update.js"), "utf8");
  assert.ok(!/<\/script/i.test(src));
  const bad = src.split("\n").filter(l => !/^\s*\/\//.test(l) && /\/\//.test(l.replace(/https?:\/\//g, "")));
  assert.deepEqual(bad, []);
});
