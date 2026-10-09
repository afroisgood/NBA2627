// 在「已登入 Yahoo」的瀏覽器分頁（https://basketball.fantasysports.yahoo.com/nba/1031/...）
// 打開開發者工具 Console，貼上執行。結果會存在 window 變數，最後用 copy(JSON.stringify(...)) 複製出來。

const num = x => +String(x).replace(/,/g, '');

// 1) 抓 16 隊名單 → window._ROSTERS = [[隊名, ["球員|位置|狀態|NBA隊-位置", ...]], ...]
async function fetchRosters() {
  const R = [];
  for (let i = 1; i <= 16; i++) {
    const h = await fetch('/nba/1031/' + i).then(r => r.text());
    const d = new DOMParser().parseFromString(h, 'text/html');
    const name = d.querySelector('title').textContent.split(' - ')[1].split(' |')[0];
    const ps = [];
    d.querySelectorAll('table tbody tr').forEach(tr => {
      const n = tr.querySelector('a.name'); if (!n) return;
      const slot = tr.querySelector('td')?.textContent.trim();
      const tp = [...tr.querySelectorAll('.Fz-xxs')].map(x => x.textContent.trim()).find(x => / - /.test(x)) || '';
      const st = [...tr.querySelectorAll('.F-injury, abbr')].map(x => x.textContent.trim()).filter(x => x.length <= 4).join('');
      ps.push([n.textContent.trim(), slot, st, tp].join('|'));
    });
    R.push([name, ps]);
  }
  return (window._ROSTERS = R);
}

// 2) 抓 Yahoo 球員列表（stat: 'S_PSR' 預測 / 'S_S_2025' 上季總計）→ 場均＋季前排名＋持有率
async function fetchYahoo(stat = 'S_PSR', pages = 20, status = 'ALL') {
  const out = {};
  for (let s = 0; s < pages * 25; s += 25) {
    const h = await fetch(`/nba/1031/players?status=${status}&pos=P&stat1=${stat}&sort=OR&sdir=1&count=${s}`).then(r => r.text());
    const d = new DOMParser().parseFromString(h, 'text/html');
    d.querySelectorAll('tr').forEach(tr => {
      const a = tr.querySelector('a.name'); if (!a) return;
      const c = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim());
      const gp = num(c[5]);
      const rec = { own: c[4], pre: num(c[6]), cur: num(c[7]), ros: parseFloat(c[8]) };
      if (gp && c[10] && c[10].includes('/')) {
        const [fgm, fga] = c[10].split('/').map(num), [ftm, fta] = c[12].split('/').map(num);
        const r2 = x => +(x / gp).toFixed(2);
        rec.stats = [gp, r2(fgm), r2(fga), r2(ftm), r2(fta), r2(num(c[14])), r2(num(c[15])), r2(num(c[16])), r2(num(c[17])), r2(num(c[18])), r2(num(c[19])), r2(num(c[20]))];
      }
      out[a.textContent.trim()] = rec;
    });
  }
  return out;
}

// 3) 抓 ESPN 預測（場均）→ { fullName: [gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to] }
async function fetchESPN() {
  const f = { players: { limit: 700, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' } } };
  const j = await (await fetch('https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2027/segments/0/leaguedefaults/1?view=kona_player_info',
    { headers: { 'X-Fantasy-Filter': JSON.stringify(f) } })).json();
  const E = {};
  for (const p of j.players) {
    const st = (p.player.stats || []).find(s => s.id === '102027');
    if (!st || !st.stats || !st.stats['42']) continue;
    const a = st.stats, gp = a['42'], g = k => +((a[k] || 0) / gp).toFixed(2);
    E[p.player.fullName] = [gp, g('13'), g('14'), g('15'), g('16'), g('17'), g('0'), g('6'), g('3'), g('2'), g('1'), g('11')];
  }
  return E;
}

// 4) FantasyPros：在 https://www.fantasypros.com/nba/projections/overall.php 的 Console 執行
//    回傳 "名字,PTS,REB,AST,BLK,STL,FG%x1000,FT%x1000,3PM,GP,TO;..."（整季總計）
function fetchFantasyPros() {
  return [...document.querySelector('table').rows].slice(1).map(r => {
    const c = [...r.cells].map(x => x.innerText.trim().replace(/,/g, ''));
    return [c[0].replace(/\s*\(.*$/, ''), c[1], c[2], c[3], c[4], c[5], c[6].replace('.', ''), c[7].replace('.', ''), c[8], c[9], c[11]].join(',');
  }).join(';');
}
