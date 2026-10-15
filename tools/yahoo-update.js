// 一鍵更新程式：在「已登入 Yahoo」的聯盟頁面（https://basketball.fantasysports.yahoo.com/nba/1031）執行。
// 用法一：戰力表網頁的「更新資料」書籤（建議）。用法二：F12 → Console，整段貼上後按 Enter。
// 抓的內容：16 隊名單、Yahoo 本季剩餘預測、ESPN 預測、2025-26 上季數據、2026-27 本季數據、季前排名、持有率，
// 以及季前排名前 400 名裡所有沒被持有的球員（FA／waiver）、ESPN 的整季 NBA 賽程、Yahoo 本週對戰（對手和目前比分）、
// 最近 7／14／30 天數據、自己隊伍和 FA 前 50 名的新聞短評。
// 跑完會出現視窗，按「打開戰力表」就會帶著新資料打開網頁。
(async () => {
  const LEAGUE = 1031, TEAMS = 16, MY_TEAM_ID = 13, MAX_PAGES = 32, FA_PAGES = 16, NEWS_FA = 50;
  const SEASON_LAST = 'S_S_2025', SEASON_CUR = 'S_S_2026', ESPN_YEAR = 2027;
  const SITE = 'https://afroisgood.github.io/NBA2627/league-power.html';
  if (!/fantasysports\.yahoo\.com$/.test(location.host)) {
    alert('請先打開已登入的 Yahoo Fantasy 聯盟頁面，再執行更新：\nhttps://basketball.fantasysports.yahoo.com/nba/' + LEAGUE);
    return;
  }
  document.getElementById('lp-upd-box')?.remove();
  const box = document.createElement('div');
  box.id = 'lp-upd-box';
  box.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:min(360px,calc(100vw - 32px));background:#c9d2a8;color:#2f3a25;border:4px solid #2f3a25;box-shadow:4px 4px 0 #2f3a25;padding:14px 16px;font:15px/1.6 system-ui,sans-serif';
  box.innerHTML = '<b>戰力表更新</b><div id="lp-upd-msg" style="margin-top:6px"></div><div id="lp-upd-btns" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"></div>';
  document.body.appendChild(box);
  const msg = box.querySelector('#lp-upd-msg'), btns = box.querySelector('#lp-upd-btns');
  const say = t => { msg.textContent = t; console.log('[戰力表更新] ' + t); };
  const button = (label, fn) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'font:inherit;background:#2f3a25;color:#c9d2a8;border:0;padding:6px 12px;cursor:pointer';
    b.onclick = fn; btns.appendChild(b); return b;
  };
  button('關閉', () => box.remove());

  const num = x => +String(x ?? '').replace(/,/g, '') || 0;
  const r2 = x => +x.toFixed(2);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // 讀一頁 Yahoo：失敗（太多請求、伺服器忙、網路斷）會等一下再試，最多 3 次
  const getDoc = async url => {
    let last = '';
    for (let k = 0; k < 3; k++) {
      if (k) await wait(1500 * k);
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (res.ok) return new DOMParser().parseFromString(await res.text(), 'text/html');
        last = `HTTP ${res.status}`;
        if (res.status < 500 && res.status !== 429 && res.status !== 408) break;
      } catch (e) { last = e.message; }
    }
    throw new Error(`讀取失敗（${last}）：${url}`);
  };
  let step = '開始';

  try {
    const rowInfo = tr => ({
      tp: [...tr.querySelectorAll('.Fz-xxs')].map(x => x.textContent.trim()).find(x => / - /.test(x)) || '',
      st: [...tr.querySelectorAll('.F-injury, abbr')].map(x => x.textContent.trim()).filter(x => x.length <= 4).join('')
    });
    const status = st => /^(Q|GTD|DTD)$/.test(st) ? 'Q' : /^(O|INJ|NA|SUSP)$/.test(st) ? 'O' : '';
    const YID = {};
    const yidOf = (a, n) => { const m = (a.getAttribute('href') || '').match(/\/(\d+)\/?$/); if (m) YID[n] = +m[1]; };

    // 1) 16 隊名單。隊名從各隊頁面的標題切；切不出來或有重複時，改用聯盟首頁的隊伍連結
    step = '抓 16 隊名單';
    say('抓 16 隊名單…');
    const titleName = d => {
      const parts = (d.querySelector('title')?.textContent || '').trim().split(' - ');
      return parts.length > 1 ? parts[1].split(' |')[0].trim() : '';
    };
    const rosters = [];
    for (let k = 0; k < TEAMS; k += 4) rosters.push(...await Promise.all(Array.from({ length: Math.min(4, TEAMS - k) }, async (_, j) => {
      const id = k + j + 1, d = await getDoc(`/nba/${LEAGUE}/${id}`);
      const name = titleName(d);
      const ps = [];
      d.querySelectorAll('table tbody tr').forEach(tr => {
        const a = tr.querySelector('a.name'); if (!a) return;
        yidOf(a, a.textContent.trim());
        let slot = (tr.querySelector('td')?.textContent || '').trim();
        if (/^IL/.test(slot)) slot = 'IL';
        const { tp, st } = rowInfo(tr);
        ps.push({ n: a.textContent.trim(), slot, tp, st: status(st) });
      });
      if (!ps.length) throw new Error(`第 ${id} 隊（${name || '?'}）抓不到球員，可能沒有登入，或 Yahoo 頁面格式改了`);
      return { id, name, ps };
    })));
    if (rosters.some(t => !t.name) || new Set(rosters.map(t => t.name)).size < rosters.length) {
      const teamNames = {};
      try {
        const home = await getDoc(`/nba/${LEAGUE}`);
        home.querySelectorAll('a[href]').forEach(a => {
          const m = (a.getAttribute('href') || '').match(new RegExp('/nba/' + LEAGUE + '/(\\d+)/?$'));
          const t = a.textContent.replace(/\s+/g, ' ').trim();
          if (m && t && !teamNames[m[1]]) teamNames[m[1]] = t;
        });
      } catch (e) { console.warn('[戰力表更新] 聯盟首頁讀取失敗：', e); }
      rosters.forEach(t => { t.name = teamNames[t.id] || t.name || `第 ${t.id} 隊`; });
      console.warn('[戰力表更新] 隊名改用聯盟首頁：', rosters.map(t => t.name));
    }
    const want = new Set(rosters.flatMap(t => t.ps.map(p => p.n)));

    // 2) Yahoo 球員列表：依季前排名一頁一頁抓，直到所有被持有的球員都找到，而且至少抓到前 FA_PAGES 頁（FA 用）
    const fetchYahoo = async stat => {
      const out = {};
      for (let page = 0; page < MAX_PAGES; page += 4) {
        const docs = await Promise.all([0, 1, 2, 3].map(i =>
          getDoc(`/nba/${LEAGUE}/players?status=ALL&pos=P&stat1=${stat}&sort=OR&sdir=1&count=${(page + i) * 25}`)));
        let rows = 0;
        docs.forEach(d => d.querySelectorAll('tr').forEach(tr => {
          const a = tr.querySelector('a.name'); if (!a) return;
          rows++;
          const c = [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim());
          const gp = num(c[5]);
          const rec = { pre: num(c[6]) || 260, ros: parseFloat(c[8]) || 0, own: c[4] || '', ...rowInfo(tr), s: null };
          if (gp && c[10] && c[10].includes('/') && c[12] && c[12].includes('/')) {
            const [fgm, fga] = c[10].split('/').map(num), [ftm, fta] = c[12].split('/').map(num);
            const g = x => r2(x / gp);
            rec.s = [gp, g(fgm), g(fga), g(ftm), g(fta), g(num(c[14])), g(num(c[15])), g(num(c[16])), g(num(c[17])), g(num(c[18])), g(num(c[19])), g(num(c[20]))];
          }
          out[a.textContent.trim()] = rec;
          yidOf(a, a.textContent.trim());
        }));
        if (!rows || (page + 4 >= FA_PAGES && [...want].every(n => out[n]))) break;
      }
      return out;
    };
    say(`名單完成（${want.size} 位球員）。抓 Yahoo 預測、上季、本季、最近 7／14／30 天數據，約 40 秒…`);
    step = '抓 Yahoo 預測和數據';
    const [yProj, yLast, yCur] = await Promise.all(['S_PSR', SEASON_LAST, SEASON_CUR].map(fetchYahoo));
    step = '抓最近 7／14／30 天數據';
    const recentList = async s => { try { return await fetchYahoo(s); } catch (e) { console.warn('[戰力表更新] 近期數據抓取失敗（略過）：', s, e); return {}; } };
    const yL7 = await recentList('S_L7'), yL14 = await recentList('S_L14'), yL30 = await recentList('S_L30');

    step = '抓 ESPN 預測';
    // 3) ESPN 預測（抓不到就只用 Yahoo）
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z ]/g, ' ').replace(/\b(jr|sr|ii|iii|iv)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const ALIAS = { 'n alexander walker': 'nickeil alexander walker' };
    const key = n => { const k = norm(n); return ALIAS[k] || k; };
    const espn = {}, espnId = {};
    try {
      say('抓 ESPN 預測…');
      const f = { players: { limit: 800, sortDraftRanks: { sortPriority: 100, sortAsc: true, value: 'STANDARD' } } };
      const j = await (await fetch(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_YEAR}/segments/0/leaguedefaults/1?view=kona_player_info`,
        { headers: { 'X-Fantasy-Filter': JSON.stringify(f) } })).json();
      for (const p of j.players) {
        if (p.player.id) espnId[key(p.player.fullName)] = p.player.id;
        const st = (p.player.stats || []).find(s => s.id === '10' + ESPN_YEAR);
        if (!st || !st.stats || !st.stats['42']) continue;
        const a = st.stats, gp = a['42'], g = k => r2((a[k] || 0) / gp);
        espn[key(p.player.fullName)] = [gp, g('13'), g('14'), g('15'), g('16'), g('17'), g('0'), g('6'), g('3'), g('2'), g('1'), g('11')];
      }
    } catch (e) {
      console.warn('[戰力表更新] ESPN 預測抓取失敗，只用 Yahoo 預測：', e);
    }

    // 3-1) NBA 賽程（ESPN）：每隊打球的日期（美東時間），存成距離 SCHED_BASE 的天數
    const SCHED_BASE = '2026-10-01';
    const ABBR = { GS: 'GSW', NO: 'NOP', NY: 'NYK', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS', PHO: 'PHX', NOR: 'NOP', BRK: 'BKN' };
    let SCHED = null;
    try {
      say('抓 NBA 賽程…');
      const j = await (await fetch(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${ESPN_YEAR}?view=proTeamSchedules_wl`)).json();
      const base = Date.parse(SCHED_BASE + 'T00:00:00Z'), teams = {};
      const etDay = ms => { const s = new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); return Math.round((Date.parse(s + 'T00:00:00Z') - base) / 864e5); };
      for (const t of (j.settings && j.settings.proTeams) || []) {
        if (!t.abbrev || !t.proGamesByScoringPeriod || t.id === 0) continue;
        const ab = ABBR[t.abbrev.toUpperCase()] || t.abbrev.toUpperCase();
        const days = new Set();
        Object.values(t.proGamesByScoringPeriod).flat().forEach(g => { if (g && g.date) { const d = etDay(g.date); if (d >= 0 && d < 400) days.add(d); } });
        if (days.size) teams[ab] = [...days].sort((a, b) => a - b);
      }
      if (Object.keys(teams).length >= 28) SCHED = { base: SCHED_BASE, teams };
      else console.warn('[戰力表更新] 賽程只抓到', Object.keys(teams).length, '隊，不使用');
    } catch (e) {
      console.warn('[戰力表更新] 賽程抓取失敗：', e);
    }

    // 3-2) 本週對戰：Yahoo 對戰頁裡有 FG%、PTS 等欄位的表格，用隊伍連結找出自己和對手那兩列
    const CAT_HEAD = { fg: ['FG%'], ft: ['FT%'], tpm: ['3PTM', '3PM'], pts: ['PTS'], reb: ['REB'], ast: ['AST'], stl: ['ST', 'STL'], blk: ['BLK'], to: ['TO'] };
    const teamIdOf = el => { const a = [...el.querySelectorAll('a[href]')].map(x => (x.getAttribute('href') || '').match(new RegExp('/nba/' + LEAGUE + '/(\\d+)(?:[/?#]|$)'))).find(Boolean); return a ? +a[1] : 0; };
    const parseMatch = d => {
      for (const table of d.querySelectorAll('table')) {
        const headRow = table.querySelector('thead tr') || table.querySelector('tr');
        if (!headRow) continue;
        const head = [...headRow.children].map(x => x.textContent.replace(/\s+/g, ' ').trim());
        const col = {};
        for (const k in CAT_HEAD) col[k] = head.findIndex(h => CAT_HEAD[k].includes(h));
        if (col.fg < 0 || col.pts < 0 || col.to < 0) continue;
        const rows = {};
        [...table.querySelectorAll('tr')].filter(tr => tr !== headRow).forEach(tr => {
          const id = teamIdOf(tr); if (!id) return;
          const cells = [...tr.children].map(x => x.textContent.trim());
          const v = {};
          for (const k in col) { const x = parseFloat((cells[col[k]] || '').replace(/,/g, '')); v[k] = Number.isFinite(x) ? x : null; }
          rows[id] = v;
        });
        const ids = Object.keys(rows).map(Number);
        if (ids.includes(MY_TEAM_ID) && ids.length >= 2) {
          const oid = ids.find(i => i !== MY_TEAM_ID), ok = v => Object.values(v).filter(x => x != null).length >= 7;
          return { oppId: oid, me: ok(rows[MY_TEAM_ID]) ? rows[MY_TEAM_ID] : null, op: ok(rows[oid]) ? rows[oid] : null, week: +((d.body.textContent.match(/Week\s+(\d+)/) || [])[1]) || null };
        }
      }
      return null;
    };
    let MATCH = null;
    for (const url of [`/nba/${LEAGUE}/matchup?mid1=${MY_TEAM_ID}`, `/nba/${LEAGUE}/${MY_TEAM_ID}/matchup`]) {
      try {
        say('抓本週對戰…');
        const m = parseMatch(await getDoc(url));
        const opp = m && rosters.find(t => t.id === m.oppId);
        if (opp) { MATCH = { at: new Date().toISOString(), week: m.week, opp: opp.name, me: m.me, op: m.op }; break; }
      } catch (e) {
        console.warn('[戰力表更新] 對戰頁讀取失敗：', url, e);
      }
    }

    step = '整理資料';
    // 4) 合併：預測 = Yahoo 和 ESPN 場均平均（只有一家就用那一家）
    const avg = (a, b) => a && b ? a.map((x, i) => r2((x + b[i]) / 2)) : a || b || null;
    let noProj = 0;
    const MKT = {};
    const DATA = rosters.map(t => [t.name, t.ps.map(p => {
      const proj = avg(yProj[p.n]?.s, espn[key(p.n)]);
      if (!proj) noProj++;
      const m = yProj[p.n] || yLast[p.n] || yCur[p.n];
      if (m) MKT[p.n] = [m.pre, m.ros];
      return [p.n, p.slot, p.tp, p.st, proj, yLast[p.n]?.s || null, yCur[p.n]?.s || null];
    })]);
    // FA：沒被持有、而且至少有一種數據的球員，依季前排名排序；waiver 上的名單位置記成 W
    const FA = [];
    for (const n of Object.keys(yProj)) {
      if (want.has(n)) continue;
      const r = yProj[n], proj = avg(r.s, espn[key(n)]), last = yLast[n]?.s || null, cur = yCur[n]?.s || null;
      if (!proj && !last && !cur) continue;
      FA.push([n, /^W/.test(r.own) ? 'W' : 'FA', r.tp, status(r.st), proj, last, cur]);
    }
    // 球員卡頭像用的 ESPN 球員編號（名字 → 編號）
    const IDS = {};
    [...DATA.flatMap(t => t[1]), ...FA].forEach(p => { const id = espnId[key(p[0])]; if (id) IDS[p[0]] = id; });
    const me = rosters.find(t => t.id === MY_TEAM_ID);

    // 5) 最近 7／14／30 天場均（開季前沒有）
    const RECENT = {};
    [...DATA.flatMap(t => t[1]), ...FA].forEach(p => {
      const r = { l7: yL7[p[0]]?.s || null, l14: yL14[p[0]]?.s || null, l30: yL30[p[0]]?.s || null };
      if (r.l7 || r.l14 || r.l30) RECENT[p[0]] = r;
    });

    // 6) 新聞短評：自己隊伍＋FA 前 NEWS_FA 名。先試 ESPN（用 ESPN 編號），抓不到再試 Yahoo 球員小卡
    const NEWS = {};
    const strip = h => new DOMParser().parseFromString(String(h || ''), 'text/html').body.textContent.replace(/\s+/g, ' ').trim();
    const timed = (url, opt = {}) => { const c = new AbortController(), t = setTimeout(() => c.abort(), 8000); return fetch(url, { ...opt, signal: c.signal }).finally(() => clearTimeout(t)); };
    const espnNews = async id => {
      const j = await (await timed(`https://site.api.espn.com/apis/fantasy/v2/games/fba/news/players?limit=3&playerId=${id}`)).json();
      const arr = j.feed || j.articles || j.news || [];
      return arr.map(a => ({ d: a.published || a.lastModified || '', t: strip(a.headline || a.title || '').slice(0, 200), s: strip(a.story || a.description || '').slice(0, 500) })).filter(x => x.t || x.s).slice(0, 2);
    };
    const yahooNews = async yid => {
      const res = await timed(`/nba/${LEAGUE}/playernote?init=1&view=notes&pid=${yid}`, { credentials: 'include' });
      if (!res.ok) return [];
      let html = await res.text();
      try { const j = JSON.parse(html); html = j.content || j.html || ''; } catch (e) { }
      const d = new DOMParser().parseFromString(html, 'text/html');
      const items = [...d.querySelectorAll('.playernote, .Playernote, .note, li, p')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length > 40);
      return [...new Set(items)].slice(0, 2).map(s => ({ d: '', t: '', s: s.slice(0, 500) }));
    };
    step = '抓新聞';
    const newsFor = [...me.ps.map(p => p.n), ...FA.slice(0, NEWS_FA).map(p => p[0])];
    let newsSrc = { espn: 0, yahoo: 0 };
    say(`抓 ${newsFor.length} 位球員的新聞…`);
    for (let i = 0; i < newsFor.length; i += 6) {
      await Promise.all(newsFor.slice(i, i + 6).map(async n => {
        try { if (IDS[n]) { const a = await espnNews(IDS[n]); if (a.length) { NEWS[n] = a; newsSrc.espn++; return; } } } catch (e) { }
        try { if (YID[n]) { const a = await yahooNews(YID[n]); if (a.length) { NEWS[n] = a; newsSrc.yahoo++; } } } catch (e) { }
      }));
    }

    const json = JSON.stringify({ v: 1, at: new Date().toISOString(), ME: me.name, DATA, MKT, FA, SCHED, MATCH, IDS, RECENT, NEWS });
    window._LP_UPDATE = json;
    const curN = DATA.reduce((a, t) => a + t[1].filter(p => p[6]).length, 0);
    say(`✅ 完成！${DATA.length} 隊、${want.size} 位球員、FA ${FA.length} 位；沒有預測 ${noProj} 位、有本季數據 ${curN} 位；ESPN 預測${Object.keys(espn).length ? '有' : '沒有'}抓到；賽程${SCHED ? '有' : '沒有'}抓到；頭像編號 ${Object.keys(IDS).length} 位；近期數據 ${Object.keys(RECENT).length} 位；新聞 ${Object.keys(NEWS).length}／${newsFor.length} 位（ESPN ${newsSrc.espn}、Yahoo ${newsSrc.yahoo}）；本週對手：${MATCH ? MATCH.opp + (MATCH.me ? '（含目前比分）' : '（還沒有比分）') : '沒有抓到'}。`);
    btns.innerHTML = '';
    button('▶ 打開戰力表', () => window.open(SITE + '#import=' + encodeURIComponent(json), '_blank'));
    button('複製結果', async () => {
      try { await navigator.clipboard.writeText(json); say('已複製。到戰力表網頁按「更新資料」→ 貼上 →「套用」。'); }
      catch (e) { say('複製失敗，請改按「打開戰力表」。'); }
    });
    button('關閉', () => box.remove());
  } catch (e) {
    console.error('[戰力表更新] 失敗：', e);
    say(`❌ 更新失敗（在「${step}」這一步）：${e.message}`);
    const report = `戰力表更新失敗\n步驟：${step}\n訊息：${e.message}\n網址：${location.href}\n時間：${new Date().toISOString()}\n${(e.stack || '').split('\n').slice(0, 6).join('\n')}`;
    btns.innerHTML = '';
    button('複製錯誤訊息', async () => {
      try { await navigator.clipboard.writeText(report); say('已複製錯誤訊息，貼給 Claude 看就可以了。'); }
      catch (err) { say('複製失敗。請按 F12 打開 Console，把紅色的錯誤訊息截圖給 Claude。'); }
    });
    button('再試一次', () => { box.remove(); location.reload(); });
    button('關閉', () => box.remove());
  }
})();
