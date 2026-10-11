
// ---------- 球探報告（SCOUT REPORT）：近期手感（HOT／COLD）和新聞短評 ----------

// 手感：近 14 天的價值跟基準（有本季數據用「預測＋本季」，否則用預測）比，差 1.5 以上算 HOT／COLD；近 14 天至少打 3 場
const HOT_D=1.5;
function trendFn(){
  const v=playerValues();
  return p=>{
    const r=RECENT[p[0]],base=p[7]||p[4]||p[5];if(!r||!r.l14||r.l14[0]<3||!base)return null;
    const b=v(base),n=v(r.l14),d=n-b;
    return {b,n,d,l7:r.l7?v(r.l7):null,l30:r.l30?v(r.l30):null,tag:d>=HOT_D?"HOT":d<=-HOT_D?"COLD":""};
  };
}
let TREND=()=>null;   // render() 每次重算（跟著資料來源、放棄助攻設定）
const hotBadge=p=>{const t=TREND(p);return t&&t.tag?`<span class="badge ${t.tag==="HOT"?"b-hot":"b-cold"}">${t.tag}</span>`:""};
const hotTxt=p=>{const t=TREND(p);return t&&t.tag?(t.tag==="HOT"?" · 手感熱":" · 手感冷"):""};

// 新聞（英文）裡的關鍵字 → 中文標籤，最多 3 個
const NEWS_TAGS=[
  ["受傷",/\b(injur|sprain|strain|surgery|fractur|torn\b|sidelined|ruled out|will miss|out indefinitely|out for)/i],
  ["出賽存疑",/\b(questionable|doubtful|game-time decision|day-to-day)/i],
  ["回歸",/\b(returned to|return to (action|the lineup|play)|made his return|cleared to|will play|back in the lineup|available to play)/i],
  ["升先發",/\b(join(s|ed)? the starting|enter(s|ed)? the starting|moved into the starting|first start|draw(s|ing)? the start|start(ed|ing)? in place of)/i],
  ["改替補",/\b(off the bench|bench role|moved to the bench|demoted)/i],
  ["上場時間增加",/\b(increased (role|minutes|playing time)|expanded role|more minutes|bigger role|minutes (bump|uptick|increase))/i],
  ["限制上場時間",/\b(minutes (restriction|limit|cap)|limited minutes|reduced (role|minutes)|fewer minutes)/i],
  ["大爆發",/\b(career-high|season-high|triple-double|[3-6]\d points)/i],
  ["輪休",/\b(load management|rested\b|resting\b|will rest|maintenance)/i],
  ["交易",/\b(traded|acquired|dealt to)/i],
  ["停賽",/\bsuspen/i],
];
const newsTags=text=>NEWS_TAGS.filter(([,re])=>re.test(text)).map(([l])=>l).slice(0,3);
const newsDate=d=>{const x=new Date(d);return d&&!isNaN(x)?`${x.getMonth()+1}/${x.getDate()}`:""};

const sc={tab:"me"};
function scoutList(){
  if(sc.tab==="me")return DATA.find(t=>t[0]===ME)[1].map(p=>({p,fa:false}));
  // FA 依 Yahoo 排名（更新程式抓的順序，新聞也是抓這 50 位）
  return Object.values(FA).slice(0,50).map(p=>({p,fa:true}));
}
function renderScout(){
  const out=document.getElementById("sc-out");
  document.getElementById("sc-me").setAttribute("aria-pressed",sc.tab==="me");
  document.getElementById("sc-fa").setAttribute("aria-pressed",sc.tab==="fa");
  const nN=Object.keys(NEWS).length,nR=Object.keys(RECENT).length;
  document.getElementById("sc-info").textContent=!IMP?"從 Yahoo 更新過資料後，這裡會顯示每位球員最近 7／14／30 天的表現和最新新聞。"
    :`資料 ${fmtAt(IMP.at)}：近期數據 ${nR} 位${nR?"":"（開季後才有）"}、新聞 ${nN} 位（你的隊伍和 FA 前 50 名）。`;
  const si=SI(),val=playerValues(),sv=x=>x==null?"—":sgn(x);
  out.innerHTML=scoutList().map(({p,fa})=>{
    const t=TREND(p),ns=NEWS[p[0]]||[],v=p[si]?val(p[si]):null;
    const trend=t?`<p class="sc-trend">價值：整季基準 ${sv(t.b)} → 近 30 天 ${sv(t.l30)} · 14 天 ${sv(t.n)} · 7 天 ${sv(t.l7)}</p>`:"";
    const news=ns.map(x=>{const txt=`${x.t} ${x.s}`,tg=newsTags(txt);
      return `<div class="sc-news">${tg.map(l=>`<span class="ntag">${l}</span>`).join("")}${newsDate(x.d)?`<span class="ndate">${newsDate(x.d)}</span>`:""}<span class="nhead">${esc(x.t||x.s.slice(0,90)+(x.s.length>90?"…":""))}</span>${x.s?`<details><summary>原文</summary><p lang="en">${esc(x.s)}</p></details>`:""}</div>`}).join("");
    return `<article class="sc-row">
      <div class="sc-head"><span class="sc-nm">${esc(p[0])}</span>${p[3]?`<span class="badge">${esc(p[3])}</span>`:""}${p[1]==="IL"?'<span class="badge b-il">IL</span>':""}${hotBadge(p)}
        <span class="pos">${esc(p[2]||"")} · 價值 ${sv(v)}${fa&&p[1]==="W"?" · waiver":""}</span></div>
      ${trend}${news||'<p class="sc-none">沒有新聞</p>'}
      ${fa?`<button class="pxbtn sc-try" type="button" data-n="${esc(p[0])}">▶ 撿撿看</button>`:""}</article>`;
  }).join("");
  out.querySelectorAll(".sc-try").forEach(b=>b.onclick=()=>{fam.add=b.dataset.n;fam.drop=null;render();document.getElementById("h-fa").scrollIntoView({behavior:"smooth"});});
}
function initScout(){
  document.getElementById("sc-me").onclick=()=>{sc.tab="me";renderScout();};
  document.getElementById("sc-fa").onclick=()=>{sc.tab="fa";renderScout();};
}
