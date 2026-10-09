
// ---------- FA MACHINE：撿人（丟人後撿人、直接撿人）對名次的影響 ----------
const ROSTER=13; // 正式名單上限（不含 IL）
const fam={add:"",drop:null};
const myActive=()=>DATA.find(t=>t[0]===ME)[1].filter(p=>p[1]!=="IL");
const faPos=p=>((p[2]||"").split(" - ")[1]||"").split(",").map(x=>x.trim()).filter(Boolean);

function simulatePickup(add,drop){
  const data=DATA.map(t=>[t[0],t[1].slice()]);
  const me=data.find(t=>t[0]===ME)[1];
  if(drop){const i=me.findIndex(p=>p[0]===drop);if(i>=0)me.splice(i,1);}
  me.push([add,"BN",...FA[add].slice(2)]);
  const rows=compute(data);rankAll(rows);
  return rows.find(r=>r.name===ME);
}
function catMoves(b0,b1){
  return visCats().map(c=>({c,d:b0.r[c.k]-b1.r[c.k]})).filter(x=>x.d);
}
const movesTxt=(m,sign)=>m.filter(x=>sign>0?x.d>0:x.d<0).map(x=>`${x.c.l} ${x.d>0?"+":""}${x.d}`).join("、");

function renderFA(rows){
  const fas=faList(),val=vfunc(),act=myActive(),open=ROSTER-act.length;
  document.getElementById("fa-warn").textContent=IMP?"":"目前是內建資料，FA 只有 2 位。按上方「↻ 更新資料」從 Yahoo 抓完整的 FA 清單。";
  if(!fas.some(x=>x.p[0]===fam.add))fam.add=fas.length?fas[0].p[0]:"";
  const drops=act.map(p=>({p,v:val(p)})).sort((a,b)=>(a.v??-99)-(b.v??-99));
  if(fam.drop===""&&open<=0)fam.drop=null;
  if(fam.drop===null||(fam.drop&&!drops.some(x=>x.p[0]===fam.drop)))fam.drop=open>0?"":(drops[0]?drops[0].p[0]:"");
  const sa=document.getElementById("fa-add"),sd=document.getElementById("fa-drop");
  sa.innerHTML=fas.map(x=>`<option value="${esc(x.p[0])}">${esc(x.p[0])}（${sgn(x.v)}${x.p[1]==="W"?" · waiver":""}${x.p[3]?" · "+esc(x.p[3]):""}）</option>`).join("");
  sa.value=fam.add;
  sd.innerHTML=`<option value="" ${open>0?"":"disabled"}>不丟人，直接撿${open>0?"":"（名單已滿）"}</option>`+drops.map(x=>`<option value="${esc(x.p[0])}">${esc(x.p[0])}（${x.v==null?"—":sgn(x.v)}）</option>`).join("");
  sd.value=fam.drop;
  document.getElementById("fa-roster").textContent=`你的正式名單 ${act.length}／${ROSTER} 人（不含 IL）。${open>0?`有 ${open} 個空位，可以直接撿人。`:"名單已滿，撿人一定要丟一個人。"}`;
  const out=document.getElementById("fa-result");
  if(!fam.add){out.innerHTML='<p class="tm-empty">目前的數據來源沒有可以撿的 FA。</p>';return;}
  const b0=rows.find(r=>r.name===ME),b1=simulatePickup(fam.add,fam.drop);
  const P=FA[fam.add],D=fam.drop?act.find(p=>p[0]===fam.drop):null;
  const gain=(val(P)||0)-(D?val(D)||0:0),my=b0.avgUse-b1.avgUse,mv=catMoves(b0,b1);
  const up=movesTxt(mv,1),dn=movesTxt(mv,-1);
  const verdict=my>0.05?`建議撿：${up||"平均名次進步"}${dn?`（退步：${dn}）`:""}`:my>=-0.05?`差不多：名次幾乎沒變${up?`（進步：${up}；退步：${dn||"無"}）`:""}`:`不建議：整體名次變差${dn?`（退步：${dn}）`:""}`;
  const cats=visCats();
  const extra=[P[1]==="W"?`⚠ ${esc(fam.add)} 在 waiver 上，要等 waiver 處理完才拿得到，也可能被別隊搶走。`:"",P[3]==="O"?`⚠ ${esc(fam.add)} 目前缺陣（O）。`:P[3]==="Q"?`⚠ ${esc(fam.add)} 出賽存疑（Q）。`:"",
    `位置：撿進 ${esc(fam.add)}（${esc(P[2]||"—")}）${D?`，丟掉 ${esc(D[0])}（${esc(D[2]||"—")}）`:""}。這裡不檢查先發位置，記得確認撿完還排得出完整陣容。`].filter(Boolean).map(x=>`<p class="note">${x}</p>`).join("");
  out.innerHTML=`<div class="tm-verdict"><b>RESULT</b>${verdict}</div>
  <div class="tm-grid">
    <div class="tm-card"><span class="k">你的名次（${state.punt?"不算 AST":"9 項"}）</span><span class="v">${b0.ovr} → ${b1.ovr} ${moveTxt(b0.ovr,b1.ovr)}</span><span class="s">平均名次 ${f1(b0.avgUse)} → ${f1(b1.avgUse)}</span></div>
    <div class="tm-card"><span class="k">球員價值淨增</span><span class="v">${sgn(gain)}</span><span class="s">z 分數，已依出賽場次打折</span></div>
    <div class="tm-card"><span class="k">異動</span><span class="v" style="font-size:16px">＋${esc(fam.add)}</span><span class="s">${D?"－"+esc(D[0]):"不丟人（用掉 1 個空位）"}</span></div>
  </div>${extra}
  <div class="scroll"><table><thead><tr><th class="name">${esc(ME)}</th>${cats.map(c=>`<th>${c.l}</th>`).join("")}</tr></thead><tbody>
    <tr><td class="name">每場數據</td>${cats.map(c=>`<td><div class="cell"><span>${fmt(c,b1.v[c.k])}</span><span class="pos">原 ${fmt(c,b0.v[c.k])}</span></div></td>`).join("")}</tr>
    <tr><td class="name">名次</td>${cats.map(c=>{const a=b0.r[c.k],b=b1.r[c.k];return `<td class="${tier(b)}">${b}<span class="delta">${a===b?"–":moveTxt(a,b)}</span></td>`}).join("")}</tr>
  </tbody></table></div>`;
}

async function autoPickup(){
  const st=document.getElementById("fa-status"),out=document.getElementById("fa-out");
  const noW=document.getElementById("fa-nowaiver").checked,noO=document.getElementById("fa-noout").checked,pos=document.getElementById("fa-pos").value;
  const base=compute();rankAll(base);const b0=base.find(r=>r.name===ME);
  const val=vfunc(),act=myActive(),open=ROSTER-act.length;
  const cands=faList().filter(x=>!(noW&&x.p[1]==="W")&&!(noO&&x.p[3]==="O")&&(!pos||faPos(x.p).includes(pos)));
  if(!cands.length){st.textContent="沒有符合篩選條件的 FA。";out.innerHTML="";return;}
  const drops=(open>0?[null]:[]).concat(act);
  const best=[];let done=0;
  for(const x of cands){
    let top=null;
    for(const d of drops){
      const b1=simulatePickup(x.p[0],d&&d[0]),my=b0.avgUse-b1.avgUse;
      if(my<=0.05)continue;
      const gain=x.v-(d?val(d)||0:0);
      if(!top||my>top.my||(my===top.my&&gain>top.gain))top={p:x.p,d,b1,my,gain};
    }
    if(top)best.push(top);
    if(++done%10===0){st.textContent=`搜尋中… ${Math.round(done/cands.length*100)}%`;await new Promise(r=>setTimeout(r,0));}
  }
  best.sort((a,b)=>b.my-a.my||a.b1.ovr-b.b1.ovr||b.gain-a.gain);
  const top=best.slice(0,10);
  st.textContent=top.length?`搜尋了 ${cands.length} 位 FA，有 ${best.length} 位能讓你進步，顯示前 ${top.length} 位（每位 FA 只列最好的丟人選擇，依平均名次進步排序）。`:`搜尋了 ${cands.length} 位 FA，沒有能讓你名次進步的撿人組合。`;
  out.innerHTML=top.map((x,i)=>{const mv=catMoves(b0,x.b1),up=movesTxt(mv,1),dn=movesTxt(mv,-1);
    return `<div class="as-row"><span class="n">${i+1}</span><span class="d">＋${esc(x.p[0])} ／ ${x.d?"－"+esc(x.d[0]):"不丟人"}<small>你的名次 ${b0.ovr}→${x.b1.ovr}（平均 ${sgn(x.my)}）· 進步：${up||"—"}${dn?` · 退步：${dn}`:""} · 價值 ${sgn(x.gain)}${x.p[1]==="W"?" · waiver":""}${x.p[3]?" · "+esc(x.p[3]):""}</small></span><button class="pxbtn" type="button" data-i="${i}">套用</button></div>`}).join("");
  out.querySelectorAll("button").forEach(b=>b.onclick=()=>{const x=top[+b.dataset.i];fam.add=x.p[0];fam.drop=x.d?x.d[0]:"";render();document.getElementById("h-fa").scrollIntoView({behavior:"smooth"});});
}

function initFA(){
  document.getElementById("fa-add").onchange=e=>{fam.add=e.target.value;render();};
  document.getElementById("fa-drop").onchange=e=>{fam.drop=e.target.value;render();};
  document.getElementById("fa-go").onclick=autoPickup;
}

initTrade();
initFA();
render();
initImport();
