// ---------- 預測模型：傷兵、預測＋本季混合、H2H 勝率、每週賽程與先發陣容 ----------

// 傷兵：Yahoo 的 O（缺陣）、Q（出賽存疑）只代表最近一兩場，所以只算進「近期」的比賽：
// 更新資料後 Q_DAYS 天內 Q 打 75 折、O_DAYS 天內 O 不算；整季的名次和 H2H 勝率不看傷兵（長期缺陣已經算在出賽率和預測場數裡）
// 「全部照算」時都算 1
const Q_RATE=0.75,Q_DAYS=3,O_DAYS=7;
// 資料載入後 IMP 不會變，只算一次（時區換算很慢，weekRaw 每人每天都會用到）
let STATUS_DAY=null;
const statusDay=()=>STATUS_DAY??(STATUS_DAY=IMP&&IMP.at?dayOf(IMP.at):todayDay());
const injOn=(p,d)=>{if(!state.inj)return 1;const k=d-statusDay();return p[3]==="O"?(k<O_DAYS?0:1):p[3]==="Q"?(k<Q_DAYS?Q_RATE:1):1};
// 出賽率：預測出賽場數 ÷ 全聯盟最多的預測場數（季前大約 82；開季後預測只算剩下的比賽，會跟著變少）
// 沒有預測就用上季場數 ÷ 82；容易受傷、輪休的球員打折；「不考慮」時都算 1
let GP_FULL=0;
const gpFull=()=>{if(!GP_FULL){const m=Math.max(0,...DATA.flatMap(t=>t[1].map(p=>p[4]?p[4][0]:0)));GP_FULL=m>=20?m:82;}return GP_FULL};
const gpRate=p=>{const r=p[4]?p[4][0]/gpFull():p[5]?p[5][0]/82:1;return Math.min(1,r||1)};
// 整季加總用的權重＝出賽率
const gpW=p=>state.gp?gpRate(p):1;

// 預測＋本季混合（存在 index 7）：本季打 g 場時，本季佔 g/(g+K)、預測佔 K/(g+K)，每一項的 K 不一樣：
// 出手數、得分、籃板、助攻、失誤幾場就看得出角色（K 小）；三分、阻攻、抄截起伏比較大；命中率要很多場才可信（K 大）
// 命中率另外混：先混出手數，再乘上混出來的命中率得到命中數
const MIX_K={fga:12,fta:12,pts:12,reb:12,ast:12,to:12,tpm:20,blk:20,stl:25,fg:40,ft:60};
const MIX_I={fga:2,fta:4,tpm:5,pts:6,reb:7,ast:8,stl:9,blk:10,to:11};
function addMix(p){
  const pr=p[4],cu=p[6];
  if(!cu){p[7]=pr||null;return;}
  if(!pr){p[7]=cu;return;}
  const g=cu[0],mix=(a,b,k)=>a+(b-a)*g/(g+k),r=pr.slice();
  for(const k in MIX_I)r[MIX_I[k]]=mix(pr[MIX_I[k]],cu[MIX_I[k]],MIX_K[k]);
  // 本季沒出手就沿用預測的命中率；預測沒出手就用本季的
  const pct=(m,a,k)=>!cu[a]?(pr[a]?pr[m]/pr[a]:0):!pr[a]?cu[m]/cu[a]:mix(pr[m]/pr[a],cu[m]/cu[a],k);
  r[1]=r[2]*pct(1,2,MIX_K.fg);
  r[3]=r[4]*pct(3,4,MIX_K.ft);
  p[7]=r.map((x,i)=>i===0?x:+x.toFixed(2));
}

// 最近 14 天場均放在 index 8（資料來源「近 14 天」）
const addRecent=p=>{p[8]=(RECENT[p[0]]||{}).l14||null};

// H2H 勝率：每項當成常態分布估計贏面。計數項用「變異係數」（每週總數大約上下浮動幾 %），命中率用固定標準差
const CV={tpm:.16,pts:.09,reb:.09,ast:.11,stl:.20,blk:.25,to:.13};
const PCT_SD={fg:.013,ft:.025};
function normCdf(z){if(!z)return .5;const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2);
  const p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function catProb(c,a,b){
  const sd=c.pct?Math.SQRT2*PCT_SD[c.k]:Math.hypot(CV[c.k]*a,CV[c.k]*b);
  if(!sd)return a===b?.5:(c.low?a<b:a>b)?1:0;
  return normCdf((c.low?b-a:a-b)/sd);
}
// 一場對戰：9 項贏面、預期贏幾項、贏過一半（≥5 項）的機率；放棄助攻也還是 9 項都比
function matchup(va,vb){
  const ps=CATS.map(c=>catProb(c,va[c.k],vb[c.k]));
  let dist=[1];ps.forEach(p=>{const n=Array(dist.length+1).fill(0);dist.forEach((x,i)=>{n[i]+=x*(1-p);n[i+1]+=x*p});dist=n;});
  return {ps,exp:ps.reduce((a,b)=>a+b,0),win:dist.slice(5).reduce((a,b)=>a+b,0)};
}
// 每隊對其他 15 隊的平均勝率、平均贏幾項，並排名
// 用的是 compute() 算出來的球隊數據 v：有賽程時是「整季平均每週」（每天排先發、板凳補位），沒有賽程就是每場平均加總
function h2hAll(rows){
  rows.forEach(r=>{let w=0,e=0;rows.forEach(o=>{if(o===r)return;const m=matchup(r.v,o.v);w+=m.win;e+=m.exp;});r.win=w/(rows.length-1);r.expCats=e/(rows.length-1);});
  [...rows].sort((a,b)=>b.win-a.win).forEach((r,i)=>r.winRk=i+1);
}
const pctTxt=x=>`${Math.round(x*100)}%`;

// ---------- 賽程（從 Yahoo 更新時一起從 ESPN 抓）：SCHED = {base:"YYYY-MM-DD", teams:{LAL:[天數,...]}} ----------
const SCHED=IMP&&IMP.SCHED?IMP.SCHED:null;
const dayMs=864e5;
const baseUTC=SCHED?Date.parse(SCHED.base+"T00:00:00Z"):0;
const dayDate=d=>new Date(baseUTC+d*dayMs);
const md=d=>{const x=dayDate(d);return `${x.getUTCMonth()+1}/${x.getUTCDate()}`};
const GAMES=SCHED?Object.fromEntries(Object.entries(SCHED.teams).map(([t,a])=>[t,new Set(a)])):{};
// 週一到週日為一週；第 1 週從開幕日開始
const WEEKS=(()=>{
  if(!SCHED)return [];
  const all=[...new Set(Object.values(SCHED.teams).flat())].sort((a,b)=>a-b);if(!all.length)return [];
  const first=all[0],last=all[all.length-1],out=[];
  let s=first;
  while(s<=last){const dow=(dayDate(s).getUTCDay()+6)%7,e=s+(6-dow);out.push({i:out.length+1,s,e,key:`w${out.length+1}`});s=e+1;}
  return out;
})();
// 某個時間點在美東是第幾天（距離 SCHED.base）
const dayOf=t=>{const et=new Date(new Date(t).toLocaleString("en-US",{timeZone:"America/New_York"}));return Math.floor((Date.UTC(et.getFullYear(),et.getMonth(),et.getDate())-baseUTC)/dayMs)};
const todayDay=()=>dayOf(Date.now());
const curWeek=()=>{if(!WEEKS.length)return null;const t=todayDay();return WEEKS.find(w=>t<=w.e)||WEEKS[WEEKS.length-1]};
const weekOf=key=>WEEKS.find(w=>w.key===key)||null;
// Yahoo 本週對戰（更新時抓的）：只有抓的那週就是現在這週才算數
const MATCH=IMP&&IMP.MATCH?IMP.MATCH:null;
function matchNow(){
  if(!MATCH||!DATA.some(t=>t[0]===MATCH.opp))return null;
  if(!WEEKS.length)return Date.now()-Date.parse(MATCH.at)<7*dayMs?MATCH:null;
  const d=dayOf(MATCH.at),w=d<WEEKS[0].s?WEEKS[0]:WEEKS.find(x=>d>=x.s&&d<=x.e),c=curWeek();
  return w&&c&&w.key===c.key?MATCH:null;
}
const nbaTeam=p=>(p[2]||"").split(" - ")[0].trim();
const posOf=p=>((p[2]||"").split(" - ")[1]||"").split(",").map(x=>x.trim()).filter(Boolean);
const gamesIn=(p,w)=>{const g=GAMES[nbaTeam(p)];if(!g||!w)return 0;let n=0;for(let d=w.s;d<=w.e;d++)if(g.has(d))n++;return n};

// 每天的先發位置：PG、SG、G、SF、PF、F、C、C、Util、Util
const SLOTS=[["PG"],["SG"],["PG","SG"],["SF"],["PF"],["SF","PF"],["C"],["C"],null,null];
const SLOT_L=["PG","SG","G","SF","PF","F","C","C","Util","Util"];
// 依價值由高到低排人，排得進去就上場（這種「位置配對」用貪婪法就是最佳解）；回傳每個先發位置排到第幾個人（−1＝空著）
function lineupSlots(players){
  const slot=Array(SLOTS.length).fill(-1),fits=players.map(p=>{const ps=posOf(p);return SLOTS.map(s=>!s||s.some(x=>ps.includes(x)))});
  const tryPlace=(i,seen)=>{for(let k=0;k<SLOTS.length;k++){if(!fits[i][k]||seen[k])continue;seen[k]=1;if(slot[k]<0||tryPlace(slot[k],seen)){slot[k]=i;return true;}}return false};
  players.forEach((p,i)=>tryPlace(i,[]));
  return slot;
}
const lineup=players=>new Set(lineupSlots(players).filter(i=>i>=0));
// 板凳補位：每個人能上場的機率是 a（傷兵 × 出賽率）。順位＝全員到齊時排得進先發的人優先、再依價值；
// 前面能上場的人還不到 C 人（全員到齊時排得進的人數）時就輪到他。回傳每個人的先發機率
function startProbs(players,avail){
  const on=lineup(players),C=on.size,ord=players.map((p,i)=>i).sort((x,y)=>on.has(y)-on.has(x)||x-y),out=Array(players.length).fill(0);
  let dist=Array(C+1).fill(0);dist[0]=1;   // 前面能上場的人數（最後一格＝已滿 C 人）
  ord.forEach(i=>{const a=avail[i],open=dist.slice(0,C).reduce((x,y)=>x+y,0);out[i]=a*open;
    const n=Array(C+1).fill(0);dist.forEach((x,k)=>{n[k]+=x*(1-a);n[Math.min(C,k+1)]+=x*a});dist=n;});
  return out;
}
const toV=t=>({fg:t.fga?t.fgm/t.fga:0,ft:t.fta?t.ftm/t.fta:0,tpm:t.tpm,pts:t.pts,reb:t.reb,ast:t.ast,stl:t.stl,blk:t.blk,to:t.to});
const addRaw=(a,b)=>{const t={};for(const k in a.t)t[k]=a.t[k]+b.t[k];return {t,starts:a.starts+b.starts,benched:a.benched+b.benched}};
// 一隊在第 s～e 天的預測總數（期望值）：每天依位置排先發，缺陣（近期傷兵、出賽率）時由板凳補上
// il＝也算 IL 球員（整季預測用：他們回來後會上場，缺陣的場次已經算在預測場數和出賽率裡）
function weekRaw(ps,s,e,val,il){
  const si=SI(),t={fgm:0,fga:0,ftm:0,fta:0,tpm:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0};let starts=0,benched=0;
  const pool=ps.filter(p=>(il||active(p))&&p[si]).map(p=>({p,v:val(p[si])??-99,a:gpW(p),g:GAMES[nbaTeam(p)]})).sort((a,b)=>b.v-a.v);
  for(let d=s;d<=e;d++){
    const today=pool.filter(x=>x.g&&x.g.has(d)).map(x=>({...x,a:x.a*injOn(x.p,d)})).filter(x=>x.a>0);if(!today.length)continue;
    const pr=startProbs(today.map(x=>x.p),today.map(x=>x.a));
    today.forEach((x,i)=>{starts+=pr[i];benched+=x.a-pr[i];const st=x.p[si];for(const key in t)t[key]+=st[IDX[key]]*pr[i];});
  }
  return {t,starts,benched};
}
function weekTotals(ps,w,val){const r=weekRaw(ps,w.s,w.e,val);return {v:toV(r.t),starts:r.starts,benched:r.benched}}
const scaleRaw=(r,k)=>{const t={};for(const x in r.t)t[x]=r.t[x]*k;return {t,starts:r.starts*k,benched:r.benched*k}};

// 本週已經打完的部分用 Yahoo 實際比分（只有自己和 Yahoo 本週對手有），剩下的天數才用預測。
// 更新時間決定切在哪：b＝還沒完全算進實際比分的第一天；f＝b 那天已經算進去的比例
// （美東晚上 7 點開打、大約 6 小時打完；台灣白天更新時，美東當天的比賽常常還在打）
function liveCut(at){
  const t=Date.parse(at)-2*36e5,et=new Date(new Date(t).toLocaleString("en-US",{timeZone:"America/New_York"}));
  return {b:dayOf(t),f:Math.min(1,Math.max(0,(et.getHours()+et.getMinutes()/60-17)/6))};
}
function liveOf(name,w){
  const mt=matchNow(),c=curWeek();if(!mt||!w||!c||w.key!==c.key)return null;
  const side=name===ME?mt.me:name===mt.opp?mt.op:null;if(!side)return null;
  const cut=liveCut(mt.at);if(cut.b<w.s)return null;
  if(cut.b>w.e){cut.b=w.e+1;cut.f=0;}
  return {side,cut,at:mt.at};
}
// 從 cut 到第 e 天的預測（cut 那天只算還沒打的部分）
const restRaw=(ps,cut,e,val)=>addRaw(scaleRaw(weekRaw(ps,cut.b,Math.min(cut.b,e),val),1-cut.f),weekRaw(ps,cut.b+1,e,val));
// 實際比分換成跟 weekRaw 一樣的總數；Yahoo 只給命中率時，出手數用已打完那幾天的預測估
function liveRaw(ps,L,w,val){
  const est=addRaw(weekRaw(ps,w.s,L.cut.b-1,val),scaleRaw(weekRaw(ps,L.cut.b,Math.min(L.cut.b,w.e),val),L.cut.f)),s=L.side,t={};
  for(const k in est.t)t[k]=s[k]??est.t[k];
  if(s.fga==null&&s.fg!=null)t.fgm=s.fg*t.fga;
  if(s.fta==null&&s.ft!=null)t.ftm=s.ft*t.fta;
  return {t,starts:est.starts,benched:est.benched};
}
// 一週的預測總數：本週有實際比分時＝實際＋剩下的預測（live 是實際比分的範圍），否則跟 weekTotals 一樣
function weekLive(ps,name,w,val){
  const L=liveOf(name,w);if(!L)return {...weekTotals(ps,w,val),live:null};
  const r=addRaw(liveRaw(ps,L,w,val),restRaw(ps,L.cut,w.e,val));
  return {v:toV(r.t),starts:r.starts,benched:r.benched,live:L};
}
// 整季（從本週到最後一週）平均每週的預測：聯盟表的名次、H2H 勝率、交易和撿人模擬都用它。IL 球員也算（見 weekRaw）
// 同樣的球員、數據和設定只算一次（交易模擬每次只有一兩隊會變，其他隊直接用算過的）
const seasonCache=new Map();
function seasonWeek(ps,val){
  const si=SI(),cw=curWeek(),key=`${cw.key}|${state.src}|${state.inj}|${state.gp}|${state.punt}|`+ps.map(p=>`${p[0]}/${p[1]}/${p[3]}/${gpW(p)}/${p[si]||""}`).join("|");
  const c=seasonCache.get(key);if(c)return c;
  const i0=WEEKS.indexOf(cw),ws=WEEKS.slice(i0<0?0:i0),r=weekRaw(ps,ws[0].s,ws[ws.length-1].e,val,true);
  const v=toV(r.t);for(const k in v)if(!["fg","ft"].includes(k))v[k]/=ws.length;
  if(seasonCache.size>5000)seasonCache.clear();
  seasonCache.set(key,v);return v;
}
