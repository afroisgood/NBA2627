// ---------- 預測模型：傷兵、預測＋本季混合、H2H 勝率、每週賽程與先發陣容 ----------

// 傷兵：Yahoo 的 O（缺陣）、Q（出賽存疑）只代表最近一兩場，所以只算進「近期」的比賽：
// 更新資料後 Q_DAYS 天內 Q 打 75 折、O_DAYS 天內 O 不算；整季的名次和 H2H 勝率不看傷兵（長期缺陣已經算在出賽率和預測場數裡）
// 「全部照算」時都算 1
const Q_RATE=0.75,Q_DAYS=3,O_DAYS=7;
// 資料載入後 IMP 不會變，只算一次（時區換算很慢，weekRaw 每人每天都會用到）
let STATUS_DAY=null;
const statusDay=()=>STATUS_DAY??(STATUS_DAY=IMP&&IMP.at?dayOf(IMP.at):todayDay());
// 缺陣（O）多久：看最新一則新聞。寫明「只缺某一場」（ruled out for Sunday's game、輪休、背靠背休一場）就只扣到那一天；
// 提到手術、幾週、沒有時間表等長期缺陣，或沒有新聞、新聞太舊（超過 NEWS_FRESH 天），就照原本的 O_DAYS 天
const NEWS_FRESH=4;
const INJ_LONG=/(indefinitely|surgery|week-to-week|re-?evaluated|timetable|at least|multiple (games|weeks)|extended (absence|period)|rest of the season|season-ending|\b(a|one|two|three|four|five|six|several|couple|few|\d+)( of)?( to \w+|-\w+)? (weeks?|months?)\b|next (two|three|four|five|six|several|\d+) games)/i;
const INJ_ONE=/\b(ruled out|out|not play|won't play|sit out|sit|miss|rest|unavailable|sidelined)\b[^.]{0,60}?\b(tonight|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i;
const WDAYS=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const OUT_UNTIL=new Map();
// 回傳缺陣到第幾天（含）；null＝判斷不出來
function outUntil(p){
  const n=p[0];if(OUT_UNTIL.has(n))return OUT_UNTIL.get(n);
  let r=null;
  const x=(NEWS[n]||[]).filter(a=>a.d&&!isNaN(Date.parse(a.d))).sort((a,b)=>Date.parse(b.d)-Date.parse(a.d))[0];
  if(x){
    const nd=dayOf(x.d),txt=`${x.t} ${x.s}`,m=!INJ_LONG.test(txt)&&(x.t.match(INJ_ONE)||x.s.match(INJ_ONE));
    if(m&&statusDay()-nd>=0&&statusDay()-nd<=NEWS_FRESH){
      const w=WDAYS.indexOf(m[2].toLowerCase()),k=w<0?0:(w-dayDate(nd).getUTCDay()+7)%7;
      if(k<=3)r=nd+k;
    }
  }
  OUT_UNTIL.set(n,r);return r;
}
const injOn=(p,d)=>{if(!state.inj)return 1;const k=d-statusDay();
  if(p[3]==="O"){const u=outUntil(p);return u!=null?(d<=u?0:1):k<O_DAYS?0:1;}
  return p[3]==="Q"?(k<Q_DAYS?Q_RATE:1):1};
// 名單裡新聞判斷「只缺一場」的人（畫面上說明用）
const restList=ps=>ps.filter(p=>p[3]==="O"&&outUntil(p)!=null);
// 出賽率：預測出賽場數 ÷ 全聯盟最多的預測場數（季前大約 82；開季後預測只算剩下的比賽，會跟著變少）
// 沒有預測就用上季場數 ÷ 82；容易受傷、輪休的球員打折；「不考慮」時都算 1
let GP_FULL=0;
const gpFull=()=>{if(!GP_FULL){const m=Math.max(0,...DATA.flatMap(t=>t[1].map(p=>p[4]?p[4][0]:0)));GP_FULL=m>=20?m:82;}return GP_FULL};
const gpRate=p=>{const r=p[4]?p[4][0]/gpFull():p[5]?p[5][0]/82:1;return Math.min(1,r||1)};
// 整季加總用的權重＝出賽率
const gpW=p=>state.gp?gpRate(p):1;

// 預測＋本季混合（存在 index 7）：本季打 g 場時，本季佔 g/(g+K)、預測佔 K/(g+K)，每一項的 K 不一樣：
// 出手數、得分、籃板、助攻幾場就看得出角色（K 小）；阻攻、抄截起伏比較大；命中率要很多場才可信（K 大）
// 命中率另外混：先混出手數，再乘上混出來的命中率得到命中數
// 2026-11 用聯盟資料驗證過（tools/check-mix.js：拿 10/27 的資料預測之後三週，跟 11/16 的實際比）：
// 「量」的項目比原本設的更快反映本季（12 → 6）、罰球命中率更慢（60 → 100）
const MIX_K={fga:6,fta:10,pts:6,reb:6,ast:6,to:12,tpm:8,blk:16,stl:20,fg:35,ft:100};
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
// CV0、PCT_SD0 是經驗值；有聯盟真實每週成績時，載入後用 calibrate() 校正 CV、PCT_SD（見檔案最後）
const CV0={tpm:.16,pts:.09,reb:.09,ast:.11,stl:.20,blk:.25,to:.13},PCT_SD0={fg:.013,ft:.025};
const CV={...CV0},PCT_SD={...PCT_SD0};
function normCdf(z){if(!z)return .5;const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2);
  const p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function catProb(c,a,b){
  const sd=c.pct?Math.SQRT2*PCT_SD[c.k]:Math.hypot(CV[c.k]*a,CV[c.k]*b);
  if(!sd)return a===b?.5:(c.low?a<b:a>b)?1:0;
  return normCdf((c.low?b-a:a-b)/sd);
}
// 項目之間會一起動（這週得分多，三分、助攻、失誤通常也多；命中率好得分也高），不是 9 個獨立的硬幣。
// COR0 是經驗值（一隊一週的成績跟平常比，兩個項目一起偏高的程度）；有夠多週的聯盟成績時 calibrate() 會校正
const COR_K=["fg","ft","tpm","pts","reb","ast","stl","blk","to"];
const COR0=(()=>{
  const m=COR_K.map((a,i)=>COR_K.map((b,j)=>i===j?1:0));
  const set=(a,b,r)=>{const i=COR_K.indexOf(a),j=COR_K.indexOf(b);m[i][j]=m[j][i]=r};
  [["pts","tpm",.55],["pts","fg",.35],["pts","ft",.15],["pts","reb",.35],["pts","ast",.45],["pts","stl",.2],["pts","blk",.15],["pts","to",.45],
   ["tpm","fg",.1],["tpm","ft",.1],["tpm","reb",.1],["tpm","ast",.3],["tpm","stl",.15],["tpm","to",.25],
   ["reb","ast",.2],["reb","stl",.15],["reb","blk",.3],["reb","to",.3],["reb","fg",.15],
   ["ast","stl",.2],["ast","blk",.05],["ast","to",.5],["ast","fg",.15],
   ["stl","blk",.1],["stl","to",.2],["blk","to",.15],["blk","fg",.1],["fg","ft",.05]].forEach(x=>set(...x));
  return m;
})();
let COR=COR0.map(r=>r.slice());
// 模擬用的亂數：固定種子（每次結果一樣）、成對正負（實力一樣時剛好 50%、雙方勝率加起來剛好 1）
const SIM_N=1000;
let SIM=null;
function cholesky(m){
  const n=m.length,L=m.map(()=>Array(n).fill(0));
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let x=m[i][j];for(let k=0;k<j;k++)x-=L[i][k]*L[j][k];
    if(i===j){if(x<=1e-9)return null;L[i][i]=Math.sqrt(x);}else L[i][j]=x/L[j][j];}
  return L;
}
function simDraws(){
  if(SIM)return SIM;
  // 「贏面」的方向：失誤少才是贏，所以失誤跟其他項目的關係要反過來
  const ti=COR_K.indexOf("to"),adv=COR.map((r,i)=>r.map((x,j)=>i!==j&&(i===ti||j===ti)?-x:x));
  const L=cholesky(adv)||cholesky(COR_K.map((a,i)=>COR_K.map((b,j)=>i===j?1:0)));
  let seed=20261116;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296};
  const z=new Float64Array(SIM_N*9),g=Array(9);
  for(let n=0;n<SIM_N;n++){
    for(let i=0;i<9;i++)g[i]=Math.sqrt(-2*Math.log(1-rnd()))*Math.cos(2*Math.PI*rnd());
    for(let i=0;i<9;i++){let x=0;for(let k=0;k<=i;k++)x+=L[i][k]*g[k];z[n*9+i]=x;}
  }
  return SIM=z;
}
// 常態分布的反函數（Acklam 近似）：贏面 → 領先幾個標準差
function normInv(p){
  if(p<=0)return -Infinity;if(p>=1)return Infinity;
  const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
    b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],
    c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
    d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];
  if(p<.02425){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);}
  if(p>1-.02425)return -normInv(1-p);
  const q=p-.5,r=q*q;return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}
// 一場對戰：9 項贏面、預期贏幾項、贏過一半（≥5 項）的機率；放棄助攻也還是 9 項都比
// 單項贏面照原本的算；「贏 5 項以上」用模擬算，把項目之間的連動算進去
function matchup(va,vb){
  const ps=CATS.map(c=>catProb(c,va[c.k],vb[c.k])),t=ps.map(normInv),z=simDraws();
  let w=0;
  for(let n=0;n<SIM_N;n++){
    let a=0,b=0;const o=n*9;
    for(let i=0;i<9;i++){const x=z[o+i];if(x<t[i])a++;if(-x<t[i])b++;}
    if(a>=5)w++;if(b>=5)w++;
  }
  return {ps,exp:ps.reduce((a,b)=>a+b,0),win:w/(2*SIM_N)};
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

// ---------- 模型檢查：用聯盟真實每週成績校正起伏、回測預測（WEEKLY、TID 是更新程式抓的；隊伍用 Yahoo 編號） ----------
const WEEKLY=IMP&&IMP.WEEKLY?IMP.WEEKLY:null;
const TID=IMP&&IMP.TID?IMP.TID:{};
const CAT_K=["fg","ft","tpm","pts","reb","ast","stl","blk","to"];   // 跟 CATS 同樣順序
// 校正：每隊每週的成績先跟那週的聯盟平均比（計數項用比例、命中率用差距），消掉「這週比較長、大家都多打幾場」的影響；
// 同一隊在不同週之間跳動多大，就是每週的起伏。週數少時偏向經驗值：經驗值當成 CAL_N0 筆資料一起平均
const CAL_N0=30,COR_N0=60;
function calibrate(weeks){
  if(!weeks||weeks.length<2)return null;
  const by={};CAT_K.forEach(k=>by[k]={});
  weeks.forEach(x=>{
    const rows=x.g.flatMap(g=>[[g[0],g[1]],[g[2],g[3]]]);
    CAT_K.forEach(k=>{
      const pct=k==="fg"||k==="ft",a=rows.filter(r=>r[1][k]!=null);if(a.length<2)return;
      const m=a.reduce((s,r)=>s+r[1][k],0)/a.length;if(!pct&&!m)return;
      a.forEach(([id,v])=>(by[k][id]=by[k][id]||[]).push(pct?v[k]-m:v[k]/m));
    });
  });
  const cv={},sd={},est={};let n=0;
  CAT_K.forEach(k=>{
    let ss=0,dof=0;
    Object.values(by[k]).forEach(a=>{if(a.length<2)return;const mu=a.reduce((s,x)=>s+x,0)/a.length;a.forEach(x=>ss+=(x-mu)**2);dof+=a.length-1;});
    const pct=k==="fg"||k==="ft",p0=pct?PCT_SD0[k]:CV0[k];
    est[k]=dof?Math.sqrt(ss/dof):null;
    (pct?sd:cv)[k]=Math.sqrt((CAL_N0*p0*p0+ss)/(CAL_N0+dof));
    n=Math.max(n,dof);
  });
  // 項目之間的連動：同一隊每週 9 項的跳動兩兩相乘；一樣偏向經驗值（經驗值當成 COR_N0 筆資料）
  const vec={};
  weeks.forEach(x=>{
    const rows=x.g.flatMap(g=>[[g[0],g[1]],[g[2],g[3]]]).filter(r=>CAT_K.every(k=>r[1][k]!=null));if(rows.length<2)return;
    const m={};CAT_K.forEach(k=>m[k]=rows.reduce((a,r)=>a+r[1][k],0)/rows.length);
    if(CAT_K.some(k=>k!=="fg"&&k!=="ft"&&!m[k]))return;
    rows.forEach(([id,v])=>(vec[id]=vec[id]||[]).push(CAT_K.map(k=>k==="fg"||k==="ft"?v[k]-m[k]:v[k]/m[k])));
  });
  const S=CAT_K.map(()=>CAT_K.map(()=>0));let cd=0;
  Object.values(vec).forEach(a=>{if(a.length<2)return;const mu=CAT_K.map((k,i)=>a.reduce((t,r)=>t+r[i],0)/a.length);
    a.forEach(r=>{for(let i=0;i<9;i++)for(let j=0;j<9;j++)S[i][j]+=(r[i]-mu[i])*(r[j]-mu[j]);});cd+=a.length-1;});
  const cor=COR0.map((r,i)=>r.map((r0,j)=>{if(i===j)return 1;const d=Math.sqrt(S[i][i]*S[j][j]);return d>0?(COR_N0*r0+cd*S[i][j]/d)/(COR_N0+cd):r0;}));
  return {weeks:weeks.length,n,cv,sd,est,cor,corN:cd};
}
const CAL=calibrate(WEEKLY&&WEEKLY.weeks);
if(CAL){Object.assign(CV,CAL.cv);Object.assign(PCT_SD,CAL.sd);if(CAL.corN){COR=CAL.cor;SIM=null;}}

// Yahoo 的週次 → 賽程的天數。Yahoo 第 1 週可能比較長，用抓資料那天算出差幾週（off）：
// Yahoo 第 y 週＝WEEKS 第 y+off 週；Yahoo 第 1 週＝WEEKS 第 1～1+off 週。對不起來（off 不在 0～3）就不用
function yWeekDays(y){
  if(!WEEKLY||!WEEKS.length)return null;
  const d=dayOf(IMP.at),i=WEEKS.findIndex(w=>d<=w.e),off=(i<0?WEEKS.length:i+1)-WEEKLY.cur;
  if(off<0||off>3)return null;
  if(y===1)return {s:WEEKS[0].s,e:WEEKS[Math.min(off,WEEKS.length-1)].e};
  const w=WEEKS[y+off-1];return w?{s:w.s,e:w.e}:null;
}
const teamById=id=>{const n=Object.keys(TID).find(k=>TID[k]===id);return n?DATA.find(t=>t[0]===n)||null:null};
// 本週的預測：每組對戰用這週的賽程、每天排先發算雙方總數，記下勝率和 9 項贏面。
// 用固定的設定（有本季數據用預測＋本季、扣傷兵、考慮出賽率、9 項），不受畫面上的選擇影響
function predWeek(){
  const pv=previewWeek("now");
  return pv?{at:IMP.at,late:dayOf(IMP.at)>pv.s,g:pv.g.map(x=>[x.a,x.b,+x.m.win.toFixed(3),x.m.ps.map(p=>+p.toFixed(3))])}:null;
}
// 對戰前瞻：本週（"now"）或下週（"next"）每組對戰的預測。每隊另外列出主力（這週有比賽、價值最高的人）、
// 先發場次、整週都不能打的人（out）和新聞判斷只缺一場的人（rest）
const hasNext=()=>!!(WEEKLY&&WEEKLY.next&&WEEKLY.next.g&&WEEKLY.next.g.length&&yWeekDays(WEEKLY.next.w));
function previewWeek(which){
  if(!WEEKLY)return null;
  const next=which==="next",pairs=next?(WEEKLY.next||{}).g:WEEKLY.now,y=next?(WEEKLY.next||{}).w:WEEKLY.cur;
  if(!pairs||!pairs.length)return null;
  const r=yWeekDays(y);if(!r)return null;
  const keep={src:state.src,inj:state.inj,gp:state.gp,punt:state.punt};
  Object.assign(state,{src:hasCur()?"mix":"pr",inj:true,gp:true,punt:false});
  try{
    const val=playerValues(),si=SI(),g=[];
    const side=t=>{
      const raw=weekRaw(t[1],r.s,r.e,val),playDays=p=>{const gs=GAMES[nbaTeam(p)];let n=0;if(gs)for(let d=r.s;d<=r.e;d++)if(gs.has(d)&&injOn(p,d)>0)n++;return n};
      const act=t[1].filter(p=>active(p)&&p[si]).map(p=>({p,v:val(p[si])??-99,n:playDays(p)})).sort((x,y)=>y.v-x.v),star=act.find(x=>x.n>0);
      return {name:t[0],v:toV(raw.t),starts:raw.starts,star:star?{n:star.p[0],g:star.n,s:star.p[si]}:null,
        out:act.filter(x=>x.p[3]==="O"&&!x.n&&gamesIn(x.p,r)>0).map(x=>x.p[0]),rest:restList(t[1].filter(active)).map(p=>p[0])};
    };
    for(const [a,b] of pairs){
      const A=teamById(a),B=teamById(b);if(!A||!B)continue;
      const sa=side(A),sb=side(B);
      g.push({a,b,A:sa,B:sb,m:matchup(sa.v,sb.v)});
    }
    return g.length?{y,s:r.s,e:r.e,next,g}:null;
  }finally{Object.assign(state,keep);}
}
// 所有週的預測紀錄。每週只留第一次的（最接近開打前）：資料裡的 PRED、這台電腦的 lp-pred，再加上這份資料的本週預測
let PRED_ALL=null;
function predAll(){
  if(PRED_ALL)return PRED_ALL;
  const all={},add=o=>{if(!okPred(o))return;for(const k in o)if(!all[k]||Date.parse(o[k].at)<Date.parse(all[k].at))all[k]=o[k];};
  add(IMP&&IMP.PRED);
  try{add(JSON.parse(localStorage.getItem("lp-pred")||"null"));}catch(e){}
  if(WEEKLY&&!all[WEEKLY.cur]){const p=predWeek();if(p)all[WEEKLY.cur]=p;}
  try{localStorage.setItem("lp-pred",JSON.stringify(all));}catch(e){}
  return PRED_ALL=all;
}
// 回測：有預測、也有實際成績的週，看模型猜中幾場（勝率 > 50% 的那隊有沒有贏；平手不算）、幾個項目，
// 以及 Brier 分數＝(預測勝率 − 實際結果)² 的平均：越小越準，每場都猜 50% 是 0.25
function backtest(){
  const P=predAll(),me=TID[ME],out=[];if(!WEEKLY)return out;
  WEEKLY.weeks.forEach(x=>{
    const r=P[x.w];if(!r)return;
    let hit=0,n=0,ch=0,cn=0,br=0,mine=null;
    r.g.forEach(([a,b,p,cps])=>{
      const g=x.g.find(y=>(y[0]===a&&y[2]===b)||(y[0]===b&&y[2]===a));if(!g)return;
      const va=g[0]===a?g[1]:g[3],vb=g[0]===a?g[3]:g[1];let wa=0,wb=0;
      CAT_K.forEach((k,i)=>{if(va[k]==null||vb[k]==null||va[k]===vb[k])return;const aw=k==="to"?va[k]<vb[k]:va[k]>vb[k];if(aw)wa++;else wb++;cn++;if((cps[i]>.5)===aw)ch++;});
      if(a===me||b===me)mine=a===me?{opp:b,p,w:wa,l:wb}:{opp:a,p:1-p,w:wb,l:wa};
      if(wa===wb)return;
      n++;const aw=wa>wb;if((p>.5)===aw)hit++;br+=(p-(aw?1:0))**2;
    });
    if(n||mine)out.push({w:x.w,at:r.at,late:r.late,hit,n,ch,cn,brier:n?br/n:null,mine});
  });
  return out;
}
