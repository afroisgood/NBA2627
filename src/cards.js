
// ---------- 隊伍職業鑑定（TEAM CLASS）和球員卡圖鑑（CARD DEX）＋ FA 抽卡 ----------

// 六角能力圖的六個軸：防守＝抄截＋阻攻，效率＝FG%＋FT%＋少失誤
const AXES=[{k:"pts",l:"得分"},{k:"tpm",l:"三分"},{k:"reb",l:"籃板"},{k:"ast",l:"助攻"},{k:"def",l:"防守"},{k:"eff",l:"效率"}];
const axisOf=z=>({pts:z.pts,tpm:z.tpm,reb:z.reb,ast:z.ast,def:(z.stl+z.blk)/2,eff:(z.fg+z.ft+z.to)/3});
const CAT_ZH={fg:"命中率",ft:"罰球",tpm:"三分",pts:"得分",reb:"籃板",ast:"助攻",stl:"抄截",blk:"阻攻",to:"失誤"};

// 六角圖：vals 是 0～1，依 AXES 的順序
function radar(vals,size=150){
  const R=40,pt=(i,r)=>{const a=-Math.PI/2+i*Math.PI/3;return [(r*Math.cos(a)).toFixed(1),(r*Math.sin(a)).toFixed(1)]};
  const ring=f=>AXES.map((_,i)=>pt(i,R*f).join(",")).join(" ");
  const shape=AXES.map((a,i)=>pt(i,R*Math.max(.06,Math.min(1,vals[i]))).join(",")).join(" ");
  const lbl=AXES.map((a,i)=>{const [x,y]=pt(i,R+11);return `<text x="${x}" y="${(+y+3).toFixed(1)}">${a.l}</text>`}).join("");
  return `<svg class="radar" width="${size}" height="${size}" viewBox="-60 -58 120 116" aria-hidden="true">${[1,2/3,1/3].map(f=>`<polygon class="rg" points="${ring(f)}"/>`).join("")}${AXES.map((_,i)=>`<line x1="0" y1="0" x2="${pt(i,R)[0]}" y2="${pt(i,R)[1]}"/>`).join("")}<polygon class="rv" points="${shape}"/>${lbl}</svg>`;
}

// ---------- 隊伍職業 ----------
// 職業＝九項 z 分數（跟其他 15 隊比）乘上權重後最高的那個；放棄＝z ≤ −1 的項目（最多 2 項）
const CLASSES=[
  {n:"重裝坦克",i:"▣",w:{reb:1,blk:1,fg:.8},d:"籃板、阻攻、命中率撐起禁區"},
  {n:"神射手",i:"➶",w:{tpm:1,ft:1,pts:.4},d:"三分和罰球是招牌"},
  {n:"狂戰士",i:"⚔",w:{pts:1.2,tpm:.4,fg:.4},d:"火力全開，靠得分壓制"},
  {n:"刺客",i:"✦",w:{stl:1.2,tpm:.4,ast:.4},d:"抄截神出鬼沒"},
  {n:"魔導師",i:"✧",w:{ast:1.2,ft:.4,tpm:.4},d:"助攻組織，掌控全場"},
  {n:"聖騎士",i:"✚",w:{to:1,fg:.6,ft:.6},d:"穩紮穩打，很少失誤"},
];
const HERO={n:"全能勇者",i:"★",d:"九項沒有明顯弱點"},ROOKIE={n:"見習冒險者",i:"·",d:"還在找自己的路"};
function teamClass(rows){
  const mu={},sd={};
  CATS.forEach(c=>{const a=rows.map(r=>r.v[c.k]);mu[c.k]=a.reduce((x,y)=>x+y,0)/a.length;sd[c.k]=Math.sqrt(a.reduce((x,y)=>x+(y-mu[c.k])**2,0)/a.length)||1});
  const out={};
  rows.forEach(r=>{
    const z={};CATS.forEach(c=>z[c.k]=(c.low?mu[c.k]-r.v[c.k]:r.v[c.k]-mu[c.k])/sd[c.k]);
    const zs=CATS.map(c=>z[c.k]),mean=zs.reduce((a,b)=>a+b,0)/9;
    const punts=CATS.filter(c=>z[c.k]<=-1).sort((a,b)=>z[a.k]-z[b.k]).slice(0,2).map(c=>c.k);
    const scored=CLASSES.map(c=>{let s=0,w=0;for(const k in c.w){s+=c.w[k]*z[k];w+=c.w[k];}return {c,s:s/w}}).sort((a,b)=>b.s-a.s);
    const cls=Math.min(...zs)>=-.5&&mean>=.3?HERO:scored[0].s<.2&&mean<-.3?ROOKIE:scored[0].c;
    const style=punts.length?`放棄${punts.map(k=>CAT_ZH[k]).join("＋")}流`:"均衡流";
    const best=CATS.filter(c=>!punts.includes(c.k)).sort((a,b)=>z[b.k]-z[a.k]).slice(0,3).map(c=>c.k);
    out[r.name]={cls,style,title:`${cls.n}・${style}`,punts,best,z,ax:AXES.map(a=>(axisOf(z)[a.k]+2)/4)};
  });
  return out;
}
function renderClass(rows){
  const tc=teamClass(rows),list=[...rows].sort((a,b)=>(a.winRk||a.ovr)-(b.winRk||b.ovr));
  document.getElementById("class-grid").innerHTML=list.map(r=>{
    const t=tc[r.name],me=r.name===ME,lv=r.win==null?"":`Lv.${Math.round(r.win*98)+1}`;
    const fit=me&&t.punts.includes("ast")?`<p class="cl-fit">✔ 跟你放棄助攻的戰術一致</p>`:me?`<p class="cl-fit">✖ 助攻沒有墊底，放棄助攻的效果還沒出來</p>`:"";
    return `<article class="cl-card${me?" me":""}">
      <div class="cl-head"><span class="tn">${emblem(r.name,18)}<span class="cl-nm">${esc(r.name)}</span>${me?'<span class="tag">1P</span>':""}</span><span class="cl-lv">${lv}</span></div>
      <div class="cl-title"><span class="cl-ic" aria-hidden="true">${t.cls.i}</span>${t.title}</div>
      <div class="cl-body">${radar(t.ax,120)}<div class="cl-txt"><p>${t.cls.d}</p><p>♛ ${t.best.map(k=>`<span class="nw">${CAT_ZH[k]} ${r.r[k]}</span>`).join("、")}</p>${t.punts.length?`<p>☠ ${t.punts.map(k=>`<span class="nw">${CAT_ZH[k]} ${r.r[k]}</span>`).join("、")}</p>`:""}</div></div>
      ${fit}</article>`;
  }).join("");
}

// ---------- 球員卡 ----------
// 稀有度看價值排名（全部被持有的球員＋FA 一起排）：前 12 名 SSR、13–40 SR、41–110 R、其他 N
const RARITY=[["SSR",12],["SR",40],["R",110],["N",Infinity]];
const rarOf=rank=>RARITY.find(([,n])=>rank<=n)[0];
// 名字算出固定的 8×8 像素頭像（左右對稱）
function pixAvatar(name,size=40){
  let h=2166136261;for(const ch of name){h^=ch.codePointAt(0);h=Math.imul(h,16777619)>>>0;}
  let r="";for(let y=0;y<8;y++)for(let x=0;x<4;x++){if(h>>>(y*4+x)&1)continue;
    r+=`<rect x="${x}" y="${y}" width="1" height="1"/><rect x="${7-x}" y="${y}" width="1" height="1"/>`;}
  return `<svg class="pav" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
// 全部卡片：價值用 FA 分析器同一套（z 分數加總，依出賽場數打折），六角圖是各軸在被持有球員裡的百分位
function dexAll(){
  const val=vfunc(),cz=catZ(),si=SI(),cards=[];
  DATA.forEach(t=>t[1].forEach(p=>cards.push({p,owner:t[0]})));
  Object.values(FA).forEach(p=>cards.push({p,owner:""}));
  const list=cards.map(c=>({...c,v:val(c.p)})).filter(c=>c.v!=null).sort((a,b)=>b.v-a.v);
  const ref=AXES.map(a=>DATA.flatMap(t=>t[1].filter(p=>active(p)&&p[si]).map(p=>axisOf(cz(p[si]))[a.k])).sort((x,y)=>x-y));
  const pct=(i,x)=>{const a=ref[i];let lo=0,hi=a.length;while(lo<hi){const m=lo+hi>>1;if(a[m]<x)lo=m+1;else hi=m;}return a.length?lo/a.length:.5};
  list.forEach((c,i)=>{c.rank=i+1;c.rar=rarOf(i+1);const ax=axisOf(cz(c.p[si]));c.ax=AXES.map((a,j)=>pct(j,ax[a.k]));});
  return list;
}
function cardHTML(c,extra=""){
  const p=c.p,[tm,pos]=(p[2]||"").split(" - "),gp=p[4]?p[4][0]:null;
  const st=p[3]?`<span class="badge">${esc(p[3])}</span>`:"",w=p[1]==="W"?'<span class="badge">W</span>':"",il=p[1]==="IL"?'<span class="badge b-il">IL</span>':"";
  return `<article class="card r-${c.rar}">
    <div class="c-top"><span class="c-rar">${c.faRank?"FA·":""}${c.rar}</span><span class="c-no">${c.faRank?`FA 第 ${c.faRank}`:`No.${String(c.rank).padStart(3,"0")}`}</span></div>
    <div class="c-art">${pixAvatar(p[0],30)}<div class="c-id"><div class="c-nm">${esc(p[0])}</div><div class="c-sub">${esc(tm||"")} · ${esc(pos||"")}${st}${w}${il}</div></div></div>
    ${radar(c.ax)}
    <div class="c-foot"><span>價值 ${sgn(c.v)}</span><span>${gp?`預測 ${Math.round(gp)} 場`:""}</span></div>
    <div class="c-own">${c.owner?`${esc(c.owner)}${c.owner===ME?'<span class="tag">1P</span>':""}`:"自由球員 FA"}</div>${extra}</article>`;
}
const dx={owner:"",rar:"",q:"",n:24};
let DEX=[];
function renderDex(){
  DEX=dexAll();
  const so=document.getElementById("dex-owner");
  so.innerHTML=`<option value="">全部</option><option value="${esc(ME)}">我的隊伍</option><option value="FA">自由球員 FA</option>`+DATA.filter(t=>t[0]!==ME).map(t=>`<option value="${esc(t[0])}">${esc(t[0])}</option>`).join("");
  so.value=dx.owner;
  renderDexGrid();renderGachaInfo();
}
function renderDexGrid(){
  const q=dx.q.trim().toLowerCase();
  const list=DEX.filter(c=>(!dx.owner||(dx.owner==="FA"?!c.owner:c.owner===dx.owner))&&(!dx.rar||c.rar===dx.rar)&&(!q||c.p[0].toLowerCase().includes(q)));
  document.getElementById("dex-grid").innerHTML=list.length?list.slice(0,dx.n).map(c=>cardHTML(c)).join(""):'<p class="tm-empty">沒有符合的球員。</p>';
  document.getElementById("dex-count").textContent=`共 ${list.length} 張，顯示 ${Math.min(dx.n,list.length)} 張`;
  document.getElementById("dex-more").hidden=list.length<=dx.n;
}

// ---------- FA 抽卡 ----------
// FA 的實力大多比不上被持有的球員，所以抽卡的稀有度在 FA 裡面排：FA 前 3% 是 SSR、3–15% SR、15–50% R、其他 N
// 每張 FA 被抽到的機會一樣，所以機率剛好是 SSR 3%、SR 12%、R 35%、N 50%；10 連抽保底一張 SR 以上
const FA_TIERS=[["SSR",.03],["SR",.15],["R",.5],["N",1]];
function faPool(){
  const fa=DEX.filter(c=>!c.owner);
  return fa.map((c,i)=>({...c,rar:FA_TIERS.find(([,q])=>(i+1)/fa.length<=q)[0],faRank:i+1}));
}
function drawFA(n,rnd=Math.random){
  const pool=faPool();if(!pool.length)return [];
  const out=[];for(let k=0;k<n;k++)out.push(pool[Math.floor(rnd()*pool.length)]);
  if(n>=10&&!out.some(c=>c.rar==="SSR"||c.rar==="SR")){const hi=pool.filter(c=>c.rar==="SSR"||c.rar==="SR");if(hi.length)out[out.length-1]=hi[Math.floor(rnd()*hi.length)];}
  return out;
}
const dexSeen=()=>{try{return new Set(JSON.parse(localStorage.getItem("lp-dex")||"[]"))}catch(e){return new Set()}};
function renderGachaInfo(){
  const fa=faPool(),seen=dexSeen(),got=fa.filter(c=>seen.has(c.p[0])).length;
  const cnt=r=>fa.filter(c=>c.rar===r).length;
  document.getElementById("g-info").textContent=`FA 卡池 ${fa.length} 張（SSR ${cnt("SSR")}、SR ${cnt("SR")}、R ${cnt("R")}、N ${cnt("N")}）。你已收集 ${got}／${fa.length} 張。`;
}
function gacha(n){
  const got=drawFA(n),seen=dexSeen(),out=document.getElementById("g-out");
  if(!got.length){out.innerHTML='<p class="tm-empty">目前的數據來源沒有可以抽的 FA。</p>';return;}
  out.innerHTML=got.map((c,i)=>{const nw=!seen.has(c.p[0]);seen.add(c.p[0]);
    return `<div class="g-card" style="animation-delay:${i*90}ms">${nw?'<span class="g-new">NEW!</span>':""}${cardHTML(c,`<button class="pxbtn g-try" type="button" data-n="${esc(c.p[0])}">▶ 撿撿看</button>`)}</div>`}).join("");
  try{localStorage.setItem("lp-dex",JSON.stringify([...seen]))}catch(e){}
  const best=got.some(c=>c.rar==="SSR")?"SSR":got.some(c=>c.rar==="SR")?"SR":"";
  document.getElementById("g-msg").textContent=best==="SSR"?"✦ 抽到 SSR！✦":best==="SR"?"抽到 SR！":"";
  out.querySelectorAll(".g-try").forEach(b=>b.onclick=()=>{fam.add=b.dataset.n;fam.drop=null;render();document.getElementById("h-fa").scrollIntoView({behavior:"smooth"});});
  renderGachaInfo();
}

function initDex(){
  document.getElementById("dex-owner").onchange=e=>{dx.owner=e.target.value;dx.n=24;renderDexGrid();};
  document.getElementById("dex-rar").onchange=e=>{dx.rar=e.target.value;dx.n=24;renderDexGrid();};
  document.getElementById("dex-q").oninput=e=>{dx.q=e.target.value;dx.n=24;renderDexGrid();};
  document.getElementById("dex-more").onclick=()=>{dx.n+=24;renderDexGrid();};
  document.getElementById("g-1").onclick=()=>gacha(1);
  document.getElementById("g-10").onclick=()=>gacha(10);
}
