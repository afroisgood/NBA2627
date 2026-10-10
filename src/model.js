// ---------- 預測模型：傷兵、預測＋本季混合、H2H 勝率、每週賽程與先發陣容 ----------

// 傷兵：O（缺陣）不算，Q（出賽存疑）打 75 折；「全部照算」時都算 1
const Q_RATE=0.75;
const injW=p=>!state.inj?1:p[3]==="O"?0:p[3]==="Q"?Q_RATE:1;
// 出賽率：預測出賽場數 ÷ 全聯盟最多的預測場數（季前大約 82；開季後預測只算剩下的比賽，會跟著變少）
// 沒有預測就用上季場數 ÷ 82；容易受傷、輪休的球員打折；「不考慮」時都算 1
let GP_FULL=0;
const gpFull=()=>{if(!GP_FULL){const m=Math.max(0,...DATA.flatMap(t=>t[1].map(p=>p[4]?p[4][0]:0)));GP_FULL=m>=20?m:82;}return GP_FULL};
const gpRate=p=>{const r=p[4]?p[4][0]/gpFull():p[5]?p[5][0]/82:1;return Math.min(1,r||1)};
// 球員在加總時的權重＝傷兵 × 出賽率
const playW=p=>injW(p)*(state.gp?gpRate(p):1);

// 預測＋本季混合（存在 index 7）：本季打 g 場時，本季佔 g/(g+K)、預測佔 K/(g+K)
const MIX_K=20;
function addMix(p){
  const pr=p[4],cu=p[6];
  if(!cu){p[7]=pr||null;return;}
  if(!pr){p[7]=cu;return;}
  const a=cu[0]/(cu[0]+MIX_K);
  p[7]=pr.map((x,i)=>i===0?x:+(x*(1-a)+cu[i]*a).toFixed(2));
}

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
// 依價值由高到低排人，排得進去就上場（這種「位置配對」用貪婪法就是最佳解）
function lineup(players){
  const slot=Array(SLOTS.length).fill(-1),fits=players.map(p=>{const ps=posOf(p);return SLOTS.map(s=>!s||s.some(x=>ps.includes(x)))});
  const tryPlace=(i,seen)=>{for(let k=0;k<SLOTS.length;k++){if(!fits[i][k]||seen[k])continue;seen[k]=1;if(slot[k]<0||tryPlace(slot[k],seen)){slot[k]=i;return true;}}return false};
  players.forEach((p,i)=>tryPlace(i,[]));
  return new Set(slot.filter(i=>i>=0));
}
// 一隊在某一週的預測總數：每天只算排得進先發的人，傷兵和出賽率打折
function weekTotals(ps,w,val){
  const si=SI(),t={fgm:0,fga:0,ftm:0,fta:0,tpm:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0};let starts=0,benched=0;
  const pool=ps.filter(p=>active(p)&&p[si]&&playW(p)>0).map(p=>({p,v:val(p[si])??-99,g:GAMES[nbaTeam(p)]})).sort((a,b)=>b.v-a.v);
  for(let d=w.s;d<=w.e;d++){
    const today=pool.filter(x=>x.g&&x.g.has(d));if(!today.length)continue;
    const on=lineup(today.map(x=>x.p));
    today.forEach((x,i)=>{if(!on.has(i)){benched++;return;}starts++;const s=x.p[si],k=playW(x.p);for(const key in t)t[key]+=s[IDX[key]]*k;});
  }
  const v={fg:t.fga?t.fgm/t.fga:0,ft:t.fta?t.ftm/t.fta:0,tpm:t.tpm,pts:t.pts,reb:t.reb,ast:t.ast,stl:t.stl,blk:t.blk,to:t.to};
  return {v,starts,benched};
}
