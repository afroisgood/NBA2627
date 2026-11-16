// 檢查「預測＋本季」的混合速度（src/model.js 的 MIX_K）：拿比較舊的資料檔預測之後那段時間，跟比較新的資料檔的實際數據比。
// 用法：node tools/check-mix.js 舊的latest.js 新的latest.js
//   舊的可以從 git 拿，例如：git show 8b87a0c:data/latest.js > /tmp/old.js
// 每一項列出不同 K 的誤差（RMSE，越小越準），* 是最準的 K，「現在」是 model.js 目前的設定。
// K 越小＝越快相信本季數據。兩份資料至少要隔 5 場比賽；樣本只有一段時間，調整時不要一次改太多。
const fs = require("fs"), path = require("path");
const [oldF, newF] = process.argv.slice(2);
if (!oldF || !newF) { console.error("用法：node tools/check-mix.js 舊的latest.js 新的latest.js"); process.exit(1); }
const load = f => { const w = {}; new Function("window", fs.readFileSync(f, "utf8"))(w); return w.SHARED_DATA; };
const all = d => { const m = {}; [...d.DATA.flatMap(t => t[1]), ...(d.FA || [])].forEach(p => m[p[0]] = p); return m; };
const A = load(oldF), B = load(newF), a = all(A), b = all(B);
const now = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "src", "model.js"), "utf8").match(/const MIX_K=(\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
const rows = [];
for (const n in a) {
  const p = a[n], q = b[n];
  if (!q || !p[4] || !p[6] || !q[6]) continue;
  const g1 = p[6][0], g2 = q[6][0], dg = g2 - g1;
  if (dg < 5 || g1 < 1) continue;
  rows.push({ pr: p[4], cu: p[6], g: g1, act: p[6].map((x, i) => i === 0 ? dg : (q[6][i] * g2 - x * g1) / dg) });
}
const mean = f => rows.reduce((s, r) => s + f(r), 0) / rows.length;
console.log(`${A.at.slice(0, 10)} → ${B.at.slice(0, 10)}：${rows.length} 位球員；舊資料平均已打 ${mean(r => r.g).toFixed(1)} 場，之後平均再打 ${mean(r => r.act[0]).toFixed(1)} 場`);
const I = { fga: 2, fta: 4, tpm: 5, pts: 6, reb: 7, ast: 8, stl: 9, blk: 10, to: 11 };
const Ks = [0, 2, 4, 6, 8, 10, 12, 16, 20, 25, 30, 40, 60, 100, Infinity];
const res = {};
for (const k in I) res[k] = Ks.map(K => Math.sqrt(mean(r => { const w = K === Infinity ? 0 : r.g / (r.g + K); return (r.pr[I[k]] + (r.cu[I[k]] - r.pr[I[k]]) * w - r.act[I[k]]) ** 2; })));
for (const [k, m, at] of [["fg", 1, 2], ["ft", 3, 4]]) res[k] = Ks.map(K => {
  let s = 0, w = 0;
  rows.forEach(r => {
    if (!r.pr[at] || !r.cu[at] || r.act[at] <= 0) return;
    const pp = r.pr[m] / r.pr[at], cp = r.cu[m] / r.cu[at], wt = K === Infinity ? 0 : r.g / (r.g + K);
    s += r.act[at] * (pp + (cp - pp) * wt - r.act[m] / r.act[at]) ** 2; w += r.act[at];
  });
  return Math.sqrt(s / w);
});
console.log("項目  現在 " + Ks.map(K => String(K === Infinity ? "只預測" : "K=" + K).padStart(8)).join(""));
for (const k in res) {
  const mn = Math.min(...res[k]);
  console.log(k.padEnd(5), String(now[k]).padStart(4), res[k].map(x => (x.toFixed(k === "fg" || k === "ft" ? 4 : 3) + (x === mn ? "*" : " ")).padStart(8)).join(""));
}
