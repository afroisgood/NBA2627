// ---------- 匯入的資料：tools/yahoo-update.js 產生 ----------
// 兩個來源，用比較新的那一份：
//   1. 這台電腦：localStorage "lp-data"（按「套用」或從 Yahoo 視窗打開時存的）
//   2. 網站共用：data/latest.js 裡的 window.SHARED_DATA（「下載網站資料檔」產生，上傳到專案的 data 資料夾）
const BUILTIN_AT="2026/10/9";
let IMP=null,IMP_FROM="";
function checkImport(o){
  const isStr=x=>typeof x==="string",isNum=x=>typeof x==="number"&&Number.isFinite(x);
  const isStats=s=>s==null||(Array.isArray(s)&&s.length===12&&s.every(isNum));
  const okP=p=>Array.isArray(p)&&[0,1,2,3].every(i=>isStr(p[i]))&&[4,5,6].every(i=>isStats(p[i]));
  if(!o||o.v!==1||!isStr(o.ME)||!Array.isArray(o.DATA)||!o.MKT||typeof o.MKT!=="object")return "格式不對，這不是更新程式產生的資料。";
  if(o.DATA.length<2)return "球隊數量不對。";
  for(const t of o.DATA){
    if(!Array.isArray(t)||!isStr(t[0])||!Array.isArray(t[1])||!t[1].length)return "球隊資料格式不對。";
    if(!t[1].every(okP))return `球員資料格式不對（${t[0]}）。`;
  }
  if(!o.DATA.some(t=>t[0]===o.ME))return "名單裡找不到你的隊伍。";
  if(o.FA!=null&&(!Array.isArray(o.FA)||!o.FA.every(okP)))return "FA 資料格式不對。";
  if(o.MATCH!=null){const m=o.MATCH,okV=v=>v==null||(typeof v==="object"&&["fg","ft","tpm","pts","reb","ast","stl","blk","to"].every(k=>v[k]==null||isNum(v[k])));
    if(!m||!isStr(m.opp)||!isStr(m.at)||!(m.week==null||isNum(m.week))||!okV(m.me)||!okV(m.op))return "本週對戰資料格式不對。";}
  if(o.SCHED!=null){const S=o.SCHED;if(!S||!/^\d{4}-\d{2}-\d{2}$/.test(S.base)||!S.teams||typeof S.teams!=="object"||!Object.values(S.teams).every(a=>Array.isArray(a)&&a.every(d=>Number.isInteger(d)&&d>=0&&d<400)))return "賽程資料格式不對。";}
  if(o.IDS!=null){if(typeof o.IDS!=="object"||Array.isArray(o.IDS)||!Object.values(o.IDS).every(x=>Number.isInteger(x)&&x>0))return "球員編號資料格式不對。";}
  for(const k in o.MKT){const m=o.MKT[k];if(!Array.isArray(m)||m.length!==2||!m.every(isNum))return "排名／持有率資料格式不對。";}
  return "";
}
try{
  let local=null,shared=null;
  try{local=JSON.parse(localStorage.getItem("lp-data")||"null");}catch(e){}
  if(local&&checkImport(local))local=null;
  if(typeof window!=="undefined"&&window.SHARED_DATA&&!checkImport(window.SHARED_DATA))shared=window.SHARED_DATA;
  const t=x=>x?Date.parse(x.at)||0:-1;
  const o=t(local)>=t(shared)?local:shared;
  if(o){
    IMP=o;IMP_FROM=o===local?"local":"shared";ME=o.ME;
    DATA.splice(0,DATA.length,...o.DATA.map(t=>[t[0],t[1].map(p=>p.slice(0,7))]));
    for(const k in MKT)delete MKT[k];
    Object.assign(MKT,o.MKT);
  }
}catch(e){}
const hasCur=()=>DATA.some(t=>t[1].some(p=>p[6]));
const fmtAt=iso=>{const d=new Date(iso);return isNaN(d)?"":`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`};

// 套用新資料：先把目前的名次存成 ▲▼ 的比較基準，再存進瀏覽器、重新載入
function applyImport(text){
  let o;
  try{o=JSON.parse(text.trim());}catch(e){return "看不懂貼上的內容，請確認有完整貼上更新程式的結果。";}
  const err=checkImport(o);if(err)return err;
  const keep=state.src,prev={};
  ["pr","ls","cur","mix"].forEach(src=>{
    if((src==="cur"||src==="mix")&&!hasCur())return;
    state.src=src;const rows=compute();rankAll(rows);
    prev[src]={};rows.forEach(r=>prev[src][r.name]=[r.ovr9,r.ovrNA]);
  });
  state.src=keep;
  o.PREV=prev;
  try{localStorage.setItem("lp-data",JSON.stringify(o));}catch(e){return "瀏覽器不允許儲存資料（可能是無痕模式），沒辦法套用。";}
  // 新資料的本週對手可能不一樣：VS 的對手和週次改回自動
  try{const s=JSON.parse(localStorage.getItem("lp-state2")||"{}");s.opp=null;s.week=null;localStorage.setItem("lp-state2",JSON.stringify(s));}catch(e){}
  location.reload();
  return "";
}

function initImport(){
  const panel=document.getElementById("upd"),msg=document.getElementById("upd-msg"),ta=document.getElementById("upd-text");
  const src=document.getElementById("yahoo-script").textContent.trim();
  document.getElementById("upd-status").textContent=IMP?`資料：${fmtAt(IMP.at)} 從 Yahoo 更新（${IMP_FROM==="shared"?"網站共用":"只在這台電腦"}）`:`資料：${BUILTIN_AT} 內建`;
  if(IMP)document.getElementById("src-pr").textContent="2026-27 預測";
  if(IMP)document.getElementById("foot-note").textContent=`預測來源：Yahoo（Rotowire）、ESPN，兩家場均取平均。上季數據取自 Yahoo 2025-26 場均，本季數據取自 Yahoo 2026-27 場均；沒有數據的球員以「—」表示且不計入。▲▼ 是跟這次更新前的資料相比的名次變化。名單更新於 ${fmtAt(IMP.at)}。`;
  document.getElementById("upd-open").onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)panel.scrollIntoView({behavior:"smooth",block:"start"});};
  // 書籤：去掉整行註解，避免瀏覽器把書籤網址的換行吃掉時出錯
  document.getElementById("upd-bm").href="javascript:"+encodeURIComponent(src.split("\n").filter(l=>!/^\s*\/\//.test(l)).join("\n"));
  document.getElementById("upd-bm").onclick=e=>{e.preventDefault();msg.textContent="請用滑鼠把這個按鈕「拖」到書籤列，不是用點的。";};
  document.getElementById("upd-copy").onclick=async()=>{
    try{await navigator.clipboard.writeText(src);msg.textContent="更新程式已複製。到 Yahoo 聯盟頁面按 F12 → Console，貼上後按 Enter。";}
    catch(e){ta.value=src;ta.select();msg.textContent="沒辦法自動複製，已把程式放進下面的框框，請自己全選複製。";}
  };
  document.getElementById("upd-apply").onclick=()=>{msg.textContent=applyImport(ta.value)||"套用中…";};
  // 網站資料檔：把目前用的資料存成 latest.js，上傳到專案的 data 資料夾後，所有人打開網站都會用它
  document.getElementById("upd-dl").onclick=()=>{
    if(!IMP){msg.textContent="目前是內建資料，請先從 Yahoo 更新一次，再下載網站資料檔。";return;}
    const blob=new Blob([`window.SHARED_DATA=${JSON.stringify(IMP)};\n`],{type:"text/javascript"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="latest.js";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    msg.textContent="已下載 latest.js。照下面的步驟上傳到 GitHub 的 data 資料夾，大約 1–2 分鐘後所有人都會看到新資料。";
  };
  document.getElementById("upd-reset").onclick=()=>{
    let has=false;try{has=!!localStorage.getItem("lp-data");}catch(e){}
    if(!has){msg.textContent=IMP_FROM==="shared"?"這台電腦沒有自己匯入的資料，目前用的是網站共用資料。":"目前用的就是內建資料。";return;}
    if(!confirm("要刪除這台電腦匯入的資料嗎？（網站共用資料不受影響）"))return;
    try{localStorage.removeItem("lp-data");}catch(e){}
    location.reload();
  };
  // 從 Yahoo 視窗按「打開戰力表」過來：網址後面帶著 #import=
  if(location.hash.startsWith("#import="))setTimeout(()=>{
    let text="";try{text=decodeURIComponent(location.hash.slice(8));}catch(e){}
    history.replaceState(null,"",location.pathname+location.search);
    let at="";try{at=fmtAt(JSON.parse(text).at);}catch(e){}
    if(confirm(`要用 ${at||"Yahoo"} 抓到的新資料更新戰力表嗎？`)){
      const err=applyImport(text);
      if(err){panel.hidden=false;msg.textContent="匯入失敗："+err;}
    }
  },300);
}
