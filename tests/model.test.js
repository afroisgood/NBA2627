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

test("出賽率：預測場數 ÷ 82，最多算 1；沒預測用上季場數；關掉時都算 1", () => {
  const { run } = load();
  fixtureLeague(run);
  near(run(`gpRate(${JSON.stringify(P("x", "PG", "LAL - PG", "", s(41, 1, 2, 1, 1, 1, 10, 1, 1, 1, 1, 1)))})`), 0.5);
  near(run(`gpRate(${JSON.stringify(P("x", "PG", "LAL - PG", "", s(90, 1, 2, 1, 1, 1, 10, 1, 1, 1, 1, 1)))})`), 1);
  near(run(`gpRate(${JSON.stringify(P("x", "PG", "LAL - PG", "", null, s(20.5, 1, 2, 1, 1, 1, 10, 1, 1, 1, 1, 1)))})`), 0.25);
  near(run(`gpRate(${JSON.stringify(P("x", "PG", "LAL - PG", "", null))})`), 1);
  run("state.gp=true");
  near(row(run, "A").v.pts, 3 * 13 * 1.3 * 70 / 82);
  // 傷兵和出賽率一起打折
  run(`DATA[0][1][1][3]="Q"`);
  near(row(run, "A").v.pts, (3 * 13 * 1.3 - 13 * 1.3 * 0.25) * 70 / 82);
  // 同樣每場數據，常缺陣的隊伍名次比較後面
  run(`DATA[3][1].forEach(p=>p[4][0]=40)`);
  const r = run(`(()=>{const r=compute();rankAll(r,true);return Object.fromEntries(r.map(x=>[x.name,x.r.pts]));})()`);
  assert.equal(r.D, 4, "D 每人只打 40 場，得分掉到最後");
  run("state.gp=false");
  assert.equal(row(run, "D").r.pts, 3, "不考慮出賽率時 D 還是第 3");
  // 基準＝全聯盟最多的預測場數（開季後預測只剩剩下的比賽，大家一起變少）
  run("GP_FULL=0");
  assert.equal(run("gpFull()"), 70);
  near(run("gpRate(DATA[3][1][0])"), 40 / 70);
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
  run("state.gp=false");
  const w = run("WEEKS[0]");
  assert.equal(w.s, 19, "第 1 週從開幕日 10/20（星期二）開始");
  assert.equal(w.e, 24, "到星期日 10/25");
  assert.equal(run("md(WEEKS[0].s)+'–'+md(WEEKS[0].e)"), "10/20–10/25");
  assert.equal(run("gamesIn(DATA[0][1][0],WEEKS[0])"), 3);
  const wt = run(`(()=>{const val=playerValues();return weekTotals(DATA[0][1],WEEKS[0],val);})()`);
  assert.equal(wt.starts, 4, "LAL 3 場＋BOS 1 場；DEN 沒比賽；IL 不算");
  near(wt.v.pts, 13 * 1.3 * 4);
  run("state.gp=true; GP_FULL=82");
  const wg = run(`(()=>{const val=playerValues();return weekTotals(DATA[0][1],WEEKS[0],val);})()`);
  near(wg.v.pts, 13 * 1.3 * 4 * 70 / 82, 1e-6);
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

test("其他隊之間交易：兩隊交換球員；收到人比較多的那隊釋出價值最低的人；你的隊伍數據不變", () => {
  const { run } = load();
  fixtureLeague(run);
  const r = run(`(()=>{const b=compute();rankAll(b);const sim=simulateBetween("C",["C1","C2"],"D",["D1"]);
    const g=n=>sim.rows.find(x=>x.name===n);
    return {cN:g("C").n,dN:g("D").n,dNames:g("D").ps.map(p=>p[0]),dropB:sim.dropB,dropA:sim.dropA,
      aPts:g("A").v.pts,aPts0:b.find(x=>x.name==="A").v.pts,cPts:g("C").v.pts,hasWin:typeof g("C").win};})()`);
  assert.equal(r.cN, 2, "C 送出 2 人、收到 1 人");
  assert.equal(r.dN, 3, "D 收到 2 人、送出 1 人，再釋出 1 人");
  assert.deepEqual(r.dropA, []);
  assert.equal(r.dropB.length, 1);
  assert.ok(!r.dNames.includes(r.dropB[0]));
  assert.ok(r.dNames.includes("C1") || r.dNames.includes("C2"));
  near(r.aPts, r.aPts0, 1e-9);
  near(r.cPts, 13 * 1.1 + 13 * 1.0);
  assert.equal(r.hasWin, "number", "有算 H2H 勝率");
});

test("隊伍職業：放棄的項目（比平均差一個標準差以上）、職業看強項", () => {
  const { run } = load();
  fixtureLeague(run);
  // D 隊：助攻全部歸零、籃板和阻攻變 3 倍 → 重裝坦克・放棄助攻流
  run(`DATA[3][1].forEach(p=>{p[4]=p[4].slice();p[4][8]=0;p[4][7]*=3;p[4][10]*=3;})`);
  const t = run(`(()=>{const r=compute();rankAll(r,true);return teamClass(r);})()`);
  assert.deepEqual(t.D.punts, ["ast"]);
  assert.equal(t.D.cls.n, "重裝坦克");
  assert.equal(t.D.title, "重裝坦克・放棄助攻流");
  // A 隊每項都是 1.3 倍，失誤也最多 → 放棄失誤
  assert.ok(t.A.punts.includes("to"), JSON.stringify(t.A.punts));
  assert.ok(!t.D.best.includes("ast"));
  assert.equal(t.B.cls.n, "聖騎士", "B 每項都少，只有失誤最少");
  for (const k in t) t[k].ax.forEach(x => assert.ok(Number.isFinite(x)));
});

test("球員卡：稀有度看價值排名；被持有和 FA 一起排；價值和 FA 分析器一樣", () => {
  const { run } = load();
  fixtureLeague(run);
  assert.deepEqual([1, 12, 13, 40, 41, 110, 111].map(n => run(`rarOf(${n})`)), ["SSR", "SSR", "SR", "SR", "R", "R", "N"]);
  const d = run(`(()=>{const v=vfunc();return dexAll().map(c=>({n:c.p[0],o:c.owner,v:c.v,ok:Math.abs(c.v-v(c.p))<1e-9,rar:c.rar,rank:c.rank,ax:c.ax}))})()`);
  assert.equal(d.length, 13 + 2, "4 隊 × 3 人＋A 的 IL＋內建 2 位 FA");
  d.forEach((c, i) => { assert.ok(c.ok); assert.equal(c.rank, i + 1); if (i) assert.ok(d[i - 1].v >= c.v); c.ax.forEach(x => assert.ok(x >= 0 && x <= 1)); });
  assert.equal(d.filter(c => !c.o).length, 2);
  // playerValues 拆成 catZ 之後結果不變：z 分數加總
  near(run(`(()=>{const z=catZ()(DATA[0][1][0][4]);return CATS.reduce((a,c)=>a+z[c.k],0)})()`), run(`playerValues()(DATA[0][1][0][4])`), 1e-9);
  // 頭像：同一個名字一樣、左右對稱
  assert.equal(run(`pixAvatar("Joel Embiid")`), run(`pixAvatar("Joel Embiid")`));
});

test("FA 抽卡：稀有度在 FA 裡面排、每張機會一樣、10 連抽保底 SR 以上", () => {
  const { run } = load();
  fixtureLeague(run);
  // 造 40 位 FA，價值由高到低
  run(`for(const k in FA)delete FA[k];
    for(let i=0;i<40;i++){const n="F"+String(i).padStart(2,"0");FA[n]=[n,"FA","LAL - PG","",[70,4,9,1,1.3,1,10-i*0.2,3,2,1,0.3,1.2],null,null];}
    renderDex();`);
  const pool = run(`faPool().map(c=>[c.p[0],c.rar,c.faRank])`);
  assert.equal(pool.length, 40);
  assert.deepEqual(pool[0], ["F00", "SSR", 1], "40 × 3% = 1.2 → 只有第 1 名是 SSR");
  assert.equal(pool.filter(c => c[1] === "SR").length, 5, "第 2–6 名（≤ 15%）");
  assert.equal(pool.filter(c => c[1] === "R").length, 14, "第 7–20 名（≤ 50%）");
  // 亂數 0 → 第 1 張；亂數接近 1 → 最後一張
  assert.equal(run(`drawFA(1,()=>0)[0].p[0]`), "F00");
  assert.equal(run(`drawFA(1,()=>0.999)[0].p[0]`), "F39");
  const ten = run(`drawFA(10,()=>0.999).map(c=>c.rar)`);
  assert.equal(ten.length, 10);
  assert.equal(ten.filter(r => r === "N").length, 9);
  assert.ok(["SSR", "SR"].includes(ten[9]), "保底");
});
