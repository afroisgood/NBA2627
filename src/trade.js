
// ---------- TRADE MACHINE ----------
const FA={"Matisse Thybulle":["Matisse Thybulle","BN","LAL - SG,SF","",[55,2.06,4.82,0.54,0.71,1.26,5.91,2.23,1.21,1.92,0.61,0.81],null],
"Isaiah Joe":["Isaiah Joe","BN","DET - SG,SF","",[73,3.49,7.75,1.23,1.4,2.49,10.57,2.55,1.44,0.69,0.19,0.62],[71,3.55,7.79,1.18,1.34,2.53,11.08,2.48,1.34,0.68,0.2,0.6]]};
if(IMP&&IMP.FA){for(const k in FA)delete FA[k];IMP.FA.forEach(p=>FA[p[0]]=p.slice(0,7));}
DATA.forEach(t=>t[1].forEach(addMix));Object.values(FA).forEach(addMix);
const tm={give:[],get:[],opp:null,fill:""};
const mval=n=>{const m=MKT[n]||[260,3];return .7*100*Math.exp(-(m[0]-1)/70)+.3*m[1]};
const pkg=list=>list.reduce((a,n)=>a+Math.pow(mval(n),1.4),0);
const actCount=(team,names)=>names.filter(n=>{const p=DATA.find(t=>t[0]===team)[1].find(p=>p[0]===n);return p&&p[1]!=="IL"}).length;
const findP=(team,n)=>DATA.find(t=>t[0]===team)[1].find(p=>p[0]===n);
function vfunc(){const v=playerValues(),si=SI();return p=>{const s=p&&p[si];const x=v(s);return x==null?null:x*Math.min(s[0],72)/72}}
// FA 依目前數據來源的價值排序（沒有數據的不列）
function faList(){const val=vfunc();return Object.values(FA).map(p=>({p,v:val(p)})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v)}
const scoutFill=()=>tm.fill&&FA[tm.fill]?tm.fill:(faList()[0]||{p:[""]}).p[0];

function simulate(give,get,opp,fill){
  const data=DATA.map(t=>[t[0],t[1].slice()]);
  const me=data.find(t=>t[0]===ME)[1],ot=data.find(t=>t[0]===opp)[1];
  const take=(arr,n)=>{const i=arr.findIndex(p=>p[0]===n);return i<0?null:arr.splice(i,1)[0]};
  const g1=give.map(n=>take(me,n)).filter(Boolean),g2=get.map(n=>take(ot,n)).filter(Boolean);
  me.push(...g2);ot.push(...g1);
  const val=vfunc();let dropped=[],added=[];
  const trim=(arr,k)=>{const out=[];for(let i=0;i<k;i++){const act=arr.filter(p=>p[1]!=="IL");act.sort((a,b)=>(val(a)??-99)-(val(b)??-99));const w=act[0];arr.splice(arr.indexOf(w),1);out.push(w[0]);}return out};
  const actN=a=>a.filter(p=>p[1]!=="IL").length;const diff=actN(g1)-actN(g2);
  if(diff<0)dropped=trim(me,-diff);
  if(diff>0&&fill&&FA[fill]){me.push(FA[fill]);added.push(fill);}
  if(diff>0)trim(ot,diff);
  const rows=compute(data);rankAll(rows);
  return {rows,dropped,added};
}
// baseline for 2-for-1 comparisons: just pick up the FA (drop my lowest-value active player), no trade
function baseWithFill(fill){
  const data=DATA.map(t=>[t[0],t[1].slice()]);const me=data.find(t=>t[0]===ME)[1];const val=vfunc();
  const act=me.filter(p=>p[1]!=="IL").sort((a,b)=>(val(a)??-99)-(val(b)??-99));me.splice(me.indexOf(act[0]),1);me.push(FA[fill]);
  const rows=compute(data);rankAll(rows);return {rows,dropped:act[0][0]};
}
function judge(give,get,opp,fill,base){
  const sim=simulate(give,get,opp,fill);
  const b0=base.find(r=>r.name===ME),o0=base.find(r=>r.name===opp);
  const b1=sim.rows.find(r=>r.name===ME),o1=sim.rows.find(r=>r.name===opp);
  const val=vfunc();
  const vGive=give.reduce((a,n)=>a+(val(findP(ME,n))||0),0),vGet=get.reduce((a,n)=>a+(val(findP(opp,n))||0),0);
  const fair=pkg(give)/Math.max(pkg(get),1);
  let sc=fair>=1.05?2:fair>=0.95?1.5:fair>=0.8?0.5:-1;
  const od=o0.ovr-o1.ovr; sc+=od>0?1:od<-1?-1:0;
  const acc=sc>=2.5?"高":sc>=1.5?"中":"低";
  return {sim,b0,b1,o0,o1,vGain:vGet-vGive,fair,acc,myAvg:b0.avgUse-b1.avgUse,oppAvg:o0.avgUse-o1.avgUse};
}

function initTrade(){
  document.getElementById("tm-opp").onchange=e=>{tm.opp=e.target.value;tm.get=[];render();};
  document.getElementById("tm-fill").onchange=e=>{tm.fill=e.target.value;render();};
  document.getElementById("tm-clear").onclick=()=>{tm.give=[];tm.get=[];render();};
  document.getElementById("as-go").onclick=autoScout;
}
function itemList(team,sel,elId){
  const val=vfunc(),el=document.getElementById(elId);
  const ps=DATA.find(t=>t[0]===team)[1];
  el.innerHTML=ps.map(p=>{const v=val(p),m=MKT[p[0]]||[260,3],on=sel.includes(p[0]);
    return `<button type="button" class="tm-item ${p[1]==="IL"?"il":""}" aria-pressed="${on}" data-n="${esc(p[0])}"><span class="bx"></span><span class="nm">${esc(p[0])}${p[1]==="IL"?' <span class="badge b-il">IL</span>':""}</span><span class="meta">價值 ${v==null?"—":(v>0?"+":"")+v.toFixed(1)}<br>排名 ${m[0]} · ${m[1]}%</span></button>`}).join("");
  el.querySelectorAll(".tm-item").forEach(b=>b.onclick=()=>{const n=b.dataset.n,i=sel.indexOf(n);if(i>=0)sel.splice(i,1);else if(sel.length<3)sel.push(n);render();});
}
const sgn=x=>(x>0?"+":"")+x.toFixed(1);
function moveTxt(a,b){const d=a-b;return d>0?`<span class="pos-up">${d}</span>`:d<0?`<span class="pos-dn">${-d}</span>`:"–"}
function renderTrade(rows){
  const others=rows.filter(r=>r.name!==ME).map(r=>r.name);
  if(!tm.opp||!others.includes(tm.opp))tm.opp=others[0];
  const so=document.getElementById("tm-opp");
  so.innerHTML=others.map(n=>`<option value="${esc(n)}" ${n===tm.opp?"selected":""}>${esc(n)}</option>`).join("");
  const fas=faList(),sf=document.getElementById("tm-fill");
  if(tm.fill&&!fas.some(x=>x.p[0]===tm.fill))tm.fill="";
  sf.innerHTML=`<option value="">不補（共 ${fas.length} 位 FA，依價值排序）</option>`+fas.map(x=>`<option value="${esc(x.p[0])}">${esc(x.p[0])}（${sgn(x.v)}${x.p[1]==="W"?" · waiver":""}${x.p[3]?" · "+esc(x.p[3]):""}）</option>`).join("");
  sf.value=tm.fill;
  itemList(ME,tm.give,"tm-give");itemList(tm.opp,tm.get,"tm-get");
  const ss=document.getElementById("as-sell");const cur=ss.value;
  ss.innerHTML='<option value="">任何球員</option>'+DATA.find(t=>t[0]===ME)[1].map(p=>`<option value="${esc(p[0])}">${esc(p[0])}</option>`).join("");ss.value=cur;
  const out=document.getElementById("tm-result");
  if(!tm.give.length||!tm.get.length){out.innerHTML='<p class="tm-empty">▶ 左邊選你要送出的球員，右邊選對象和要換回的球員，就會顯示分析結果。</p>';return;}
  const spare=actCount(ME,tm.give)-actCount(tm.opp,tm.get);const useFB=tm.fill&&spare>0;const FB=useFB?baseWithFill(tm.fill):null;
  const J=judge(tm.give,tm.get,tm.opp,tm.fill,useFB?FB.rows:rows);
  const pos=Math.max(0,Math.min(100,(J.fair-0.5)*100));
  const paper=J.fair>=1.05?"對方帳面賺":J.fair>=0.95?"帳面公平":"對方帳面虧";
  const good=J.myAvg>0.05;
  const verdict=good&&J.acc==="高"?"強力推薦：你變強，對方也容易接受。":good&&J.acc==="中"?"值得一試：你變強，對方可能要再談。":good?"你會變強，但對方大概不會接受，需要加碼或換對象。":J.acc==="高"?"不建議：對方會接受，但你沒有變強。":"不建議：對你沒幫助。";
  const cats=visCats();
  const cRow=(lab,r0,r1)=>`<tr><td class="name">${lab}</td>${cats.map(c=>{const a=r0.r[c.k],b=r1.r[c.k];return `<td class="${tier(b)}">${b}<span class="delta">${a===b?"–":moveTxt(a,b)}</span></td>`}).join("")}</tr>`;
  const extra=[J.sim.dropped.length?`你需要釋出：${J.sim.dropped.map(esc).join("、")}（隊上價值最低）`:"",J.sim.added.length?`空位補上：${J.sim.added.map(esc).join("、")}`:"",(spare>0&&!tm.fill)?"⚠ 2 換 1 會空出名單位，記得補人（上方可選 FA 模擬）":"",useFB?`比較基準：不交易、只用 ${esc(FB.dropped)} 換撿 ${esc(tm.fill)} 的陣容，這樣名次變化只反映交易本身。`:""].filter(Boolean).map(x=>`<p class="note">${x}</p>`).join("");
  out.innerHTML=`<div class="tm-verdict"><b>RESULT</b>${verdict}</div>
  <div class="tm-grid">
    <div class="tm-card"><span class="k">你的名次（${state.punt?"不算 AST":"9 項"}）</span><span class="v">${J.b0.ovr} → ${J.b1.ovr} ${moveTxt(J.b0.ovr,J.b1.ovr)}</span><span class="s">平均名次 ${f1(J.b0.avgUse)} → ${f1(J.b1.avgUse)}</span></div>
    <div class="tm-card"><span class="k">對方名次</span><span class="v">${J.o0.ovr} → ${J.o1.ovr} ${moveTxt(J.o0.ovr,J.o1.ovr)}</span><span class="s">${esc(tm.opp)}</span></div>
    <div class="tm-card"><span class="k">你的數據價值淨增</span><span class="v">${sgn(J.vGain)}</span><span class="s">z 分數，已依出賽場次打折</span></div>
    <div class="tm-card"><span class="k">公平度（對方角度）</span><span class="v">${Math.round(J.fair*100)}% · ${paper}</span><div class="meter"><i style="left:calc(${pos}% - 2px)"></i></div><div class="meter-l"><span>對方虧</span><span>公平</span><span>對方賺</span></div></div>
    <div class="tm-card"><span class="k">成交機率</span><span class="v">${J.acc}</span><span class="s">帳面公平度＋對方名次變化</span></div>
  </div>${extra}
  <div class="scroll"><table><thead><tr><th class="name">各項名次</th>${cats.map(c=>`<th>${c.l}</th>`).join("")}</tr></thead><tbody>${cRow(esc(ME)+"（交易後）",J.b0,J.b1)}${cRow(esc(tm.opp)+"（交易後）",J.o0,J.o1)}</tbody></table></div>`;
}

async function autoScout(){
  const sell=document.getElementById("as-sell").value,type=document.getElementById("as-type").value;
  const st=document.getElementById("as-status"),out=document.getElementById("as-out");
  const fa=scoutFill();
  if(type==="2"&&!fa){st.textContent="沒有可以補位的 FA，沒辦法找 2 換 1。";return;}
  const base=compute();rankAll(base);const base2=fa?baseWithFill(fa).rows:base;
  const mine=DATA.find(t=>t[0]===ME)[1].map(p=>p[0]);
  const gives=[];
  if(type!=="2")(sell?[sell]:mine).forEach(n=>gives.push([n]));
  if(type!=="1"&&fa)for(let i=0;i<mine.length;i++)for(let j=i+1;j<mine.length;j++){const g=[mine[i],mine[j]];if(!sell||g.includes(sell))gives.push(g);}
  const targets=[];DATA.forEach(t=>{if(t[0]!==ME)t[1].forEach(p=>{if(p[1]!=="IL")targets.push([t[0],p[0]])})});
  const res=[];let done=0;const total=gives.length*targets.length;
  for(const g of gives){
    for(const [team,n] of targets){
      const fair=pkg(g)/Math.max(pkg([n]),1);done++;
      if(fair<0.95||fair>1.6)continue;
      const sp=actCount(ME,g)-actCount(team,[n])>0;const J=judge(g,[n],team,sp?fa:"",sp?base2:base);
      if(J.o0.ovr-J.o1.ovr<-1)continue;
      if(J.myAvg<=0.05)continue;
      res.push({g,team,n,J});
    }
    st.textContent=`搜尋中… ${Math.round(done/total*100)}%`;await new Promise(r=>setTimeout(r,0));
  }
  res.sort((a,b)=>b.J.myAvg-a.J.myAvg||b.J.vGain-a.J.vGain);
  const top=res.slice(0,8);
  st.textContent=top.length?`找到 ${res.length} 個可行方案，顯示前 ${top.length} 個（依你的平均名次提升排序；2 換 1 空位補 ${esc(fa)}，是跟「不交易、只撿 ${esc(fa)}」比較）。`:"找不到符合條件的交易。可以換一位要賣的球員，或改成「兩種都找」。";
  out.innerHTML=top.map((x,i)=>`<div class="as-row"><span class="n">${i+1}</span><span class="d">${x.g.map(esc).join(" ＋ ")} → ${esc(x.n)}<small>${esc(x.team)} · 你的名次 ${x.J.b0.ovr}→${x.J.b1.ovr}（平均 ${sgn(x.J.myAvg)}）· 價值 ${sgn(x.J.vGain)} · 公平度 ${Math.round(x.J.fair*100)}% · 成交 ${x.J.acc}</small></span><button class="pxbtn" type="button" data-i="${i}">套用</button></div>`).join("");
  out.querySelectorAll("button").forEach(b=>b.onclick=()=>{const x=top[+b.dataset.i];tm.give=[...x.g];tm.get=[x.n];tm.opp=x.team;tm.fill=actCount(ME,x.g)-actCount(x.team,[x.n])>0?fa:"";render();document.getElementById("h-trade").scrollIntoView({behavior:"smooth"});});
}

