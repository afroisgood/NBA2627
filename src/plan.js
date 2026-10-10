
// ---------- 每日先發（DAILY LINEUP）、本週串流（STREAMING）、快速選單（MENU） ----------
const WD="日一二三四五六";
const dayTxt=d=>`${md(d)}（${WD[dayDate(d).getUTCDay()]}）`;
const START_SLOTS=new Set(["PG","SG","G","SF","PF","F","C","Util"]);

// 某一天的先發建議：有比賽、沒缺陣（O）的人依價值排進 10 個位置；其他人分成排不進、缺陣、沒比賽
function dayPlan(ps,d,val){
  const si=SI(),act=ps.filter(p=>active(p)),has=p=>{const g=GAMES[nbaTeam(p)];return !!(g&&g.has(d))};
  const play=act.filter(p=>has(p)&&p[3]!=="O").sort((a,b)=>(val(b[si])??-99)-(val(a[si])??-99));
  const sl=lineupSlots(play),on=new Set(sl.filter(i=>i>=0).map(i=>play[i]));
  return {start:sl.map((i,k)=>({slot:SLOT_L[k],p:i>=0?play[i]:null})),bench:play.filter(p=>!on.has(p)),
    out:act.filter(p=>has(p)&&p[3]==="O"),off:act.filter(p=>!has(p))};
}
// 從今天起有 NBA 比賽的日子（最多 7 天）
function gameDays(){
  if(!SCHED)return [];
  const all=[...new Set(Object.values(SCHED.teams).flat())].sort((a,b)=>a-b),t=todayDay();
  return all.filter(d=>d>=t).slice(0,7);
}
let planDay=null;
function renderToday(){
  const out=document.getElementById("day-out"),sel=document.getElementById("day-sel"),days=gameDays();
  if(!days.length){sel.innerHTML="";sel.disabled=true;out.innerHTML=`<p class="tm-empty">${SCHED?"接下來沒有 NBA 比賽。":"從 Yahoo 更新過資料（含賽程）後，這裡會告訴你每天該排哪 10 個人先發。"}</p>`;return;}
  if(!days.includes(planDay))planDay=days[0];
  sel.disabled=false;
  sel.innerHTML=days.map(d=>`<option value="${d}">${dayTxt(d)}${d===todayDay()?" 今天":""}</option>`).join("");
  sel.value=String(planDay);
  const val=playerValues(),si=SI(),ps=DATA.find(t=>t[0]===ME)[1],pl=dayPlan(ps,planDay,val);
  const n=pl.start.filter(x=>x.p).length,vTxt=p=>{const v=val(p[si]);return v==null?"—":sgn(v)};
  const hint=(p,should)=>{const now=START_SLOTS.has(p[1]);return should&&!now?'<span class="pos-up">換上場</span>':!should&&now?'<span class="pos-dn">換下來</span>':""};
  const offTxt=p=>esc(p[0])+(ups&&START_SLOTS.has(p[1])?"（佔著先發位置，可以換給要上場的人）":"");
  const row=(slot,p,should)=>p?`<tr><td class="name"><span class="slot">${slot}</span></td><td class="name">${esc(p[0])}${p[3]?`<span class="badge">${esc(p[3])}</span>`:""}<span class="pos">${esc(nbaTeam(p))} · 價值 ${vTxt(p)} · Yahoo 目前 ${esc(p[1])}</span></td><td class="name">${hint(p,should)}</td></tr>`
    :`<tr class="out"><td class="name"><span class="slot">${slot}</span></td><td class="name" colspan="2">（空著）</td></tr>`;
  // 要動的人：該上場卻在板凳、有比賽卻排不進（或缺陣）卻佔著先發；沒比賽的人佔先發不影響，只在需要騰位置時提醒
  const ups=pl.start.filter(x=>x.p&&!START_SLOTS.has(x.p[1])).length,moves=ups+[...pl.bench,...pl.out].filter(p=>START_SLOTS.has(p[1])).length;
  const q=pl.start.filter(x=>x.p&&x.p[3]==="Q").map(x=>x.p[0]);
  const list=(k,a,f=p=>esc(p[0]))=>a.length?`<p><b>${k}</b>：${a.map(f).join("、")}</p>`:"";
  out.innerHTML=`<p class="day-sum">${dayTxt(planDay)}：你有 ${n+pl.bench.length} 人有比賽${pl.bench.length?`，${pl.bench.length} 人排不進先發`:"，全部排得進先發"}${10-n?`，${10-n} 個位置空著`:""}。${moves?`跟更新資料時 Yahoo 的陣容比，要調整 ${moves} 個人。`:"跟更新資料時 Yahoo 的陣容一樣。"}</p>
    ${q.length?`<p class="note">⚠ ${q.map(esc).join("、")} 出賽存疑（Q），開賽前到 Yahoo 確認。</p>`:""}
    <div class="scroll"><table class="day-tbl"><thead><tr><th class="name">位置</th><th class="name">球員</th><th class="name">建議</th></tr></thead><tbody>
    ${pl.start.map(x=>row(x.slot,x.p,true)).join("")}${pl.bench.map(p=>row("BN",p,false)).join("")}</tbody></table></div>
    <div class="day-lists">${list("缺陣（O）",pl.out)}${list("沒比賽",pl.off,offTxt)}</div>`;
}

// ---------- 本週串流：撿一位這週還有比賽的 FA（丟一個人或直接撿），看對 VS 對手的勝率提升多少 ----------
const STREAM_DROPS=8;
function vsOppName(rows){
  const mt=matchNow(),others=rows.filter(r=>r.name!==ME).sort((a,b)=>a.ovr-b.ovr);
  return state.opp&&others.some(r=>r.name===state.opp)?state.opp:mt?mt.opp:others[0].name;
}
// 撿人當天不能上場，從明天起算；開季前從那週第一天起算。丟掉的人在那之前的比賽照算
function streamCtx(rows){
  const wk=vsWeek()||curWeek();if(!wk)return null;
  const from=Math.max(wk.s,todayDay()+1),val=playerValues(),si=SI(),opp=vsOppName(rows);
  const me=DATA.find(t=>t[0]===ME)[1],act=me.filter(p=>active(p)),open=ROSTER-act.length;
  const drops=act.map(p=>({p,v:val(p[si])??-99})).sort((a,b)=>a.v-b.v).slice(0,STREAM_DROPS).map(x=>x.p[0]);
  const oppV=weekTotals(DATA.find(t=>t[0]===opp)[1],wk,val).v,pre=from>wk.s?weekRaw(me,wk.s,Math.min(from-1,wk.e),val):null;
  const ctx={wk,from,val,opp,me,open,drops,oppV,pre};
  ctx.base=streamEval(ctx,null,null);
  return ctx;
}
function streamEval(ctx,add,drop){
  const ps=ctx.me.filter(p=>p[0]!==drop);if(add)ps.push([add,"BN",...FA[add].slice(2)]);
  let r=ctx.from<=ctx.wk.e?weekRaw(ps,ctx.from,ctx.wk.e,ctx.val):{t:{fgm:0,fga:0,ftm:0,fta:0,tpm:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0},starts:0,benched:0};
  if(ctx.pre)r=addRaw(ctx.pre,r);
  return {m:matchup(toV(r.t),ctx.oppV),starts:r.starts};
}
function renderStreamInfo(rows){
  const el=document.getElementById("st-info"),ctx=WEEKS.length?streamCtx(rows):null;
  document.getElementById("st-go").disabled=!ctx||ctx.from>ctx.wk.e;
  if(!ctx){el.textContent="從 Yahoo 更新過資料（含賽程）後才能用：會依這週每隊的比賽場數，找出撿誰最能提高你對本週對手的勝率。";return;}
  el.textContent=ctx.from>ctx.wk.e?`第 ${ctx.wk.i} 週已經沒有剩下的比賽，請在上方 VS 選下一週。`
    :`第 ${ctx.wk.i} 週（${md(ctx.wk.s)}–${md(ctx.wk.e)}）對 ${ctx.opp}：目前預測勝率 ${pctTxt(ctx.base.m.win)}。撿進來的人從 ${dayTxt(ctx.from)} 起算（撿人當天不能上場）。每位 FA 都跟你價值最低的 ${STREAM_DROPS} 人${ctx.open>0?"和「不丟人」":""}配一次，列出勝率提升最多的前 10 個。週次和對手跟著上方 VS 的選擇。`;
}
async function streamSearch(){
  const rows=compute();rankAll(rows);
  const ctx=streamCtx(rows),out=document.getElementById("st-out"),st=document.getElementById("st-status"),btn=document.getElementById("st-go");
  if(!ctx||ctx.from>ctx.wk.e)return;
  const noW=document.getElementById("st-nowaiver").checked,rng={s:ctx.from,e:ctx.wk.e};
  const fas=Object.values(FA).filter(p=>p[3]!=="O"&&!(noW&&p[1]==="W")&&p[SI()]&&gamesIn(p,rng)>0);
  const opts=[...(ctx.open>0?[null]:[]),...ctx.drops],res=[];
  btn.disabled=true;out.innerHTML="";
  for(let i=0;i<fas.length;i++){
    if(i%20===0){st.textContent=`計算中… ${i}／${fas.length} 位 FA`;await new Promise(r=>setTimeout(r,0));}
    let best=null;
    for(const d of opts){const e=streamEval(ctx,fas[i][0],d);if(!best||e.m.win>best.m.win)best={...e,drop:d};}
    if(best.m.win-ctx.base.m.win>.005)res.push({p:fas[i],...best});
  }
  res.sort((a,b)=>b.m.win-a.m.win);
  btn.disabled=false;
  st.textContent=res.length?`找到 ${res.length} 種會提高勝率的撿法，列出前 10 名。`:"沒有找到能提高本週勝率的撿法。";
  const g=(p)=>gamesIn(p,rng),cats=r=>CATS.map((c,i)=>({c,d:r.m.ps[i]-ctx.base.m.ps[i]})).filter(x=>Math.abs(x.d)>=.05);
  out.innerHTML=res.slice(0,10).map((r,i)=>{const D=r.drop?ctx.me.find(p=>p[0]===r.drop):null,cm=cats(r);
    return `<div class="as-row"><span class="n">${i+1}</span><div class="d">撿 <b>${esc(r.p[0])}</b>（${esc(nbaTeam(r.p))}，剩 ${g(r.p)} 場${r.p[1]==="W"?" · waiver":""}${r.p[3]?" · "+esc(r.p[3]):""}）${D?`，丟 ${esc(D[0])}（剩 ${g(D)} 場）`:"，不丟人"}
      <small>勝率 ${pctTxt(ctx.base.m.win)} → <b>${pctTxt(r.m.win)}</b>（+${Math.round((r.m.win-ctx.base.m.win)*100)}%）；先發場次 ${f1(ctx.base.starts)} → ${f1(r.starts)}${cm.length?`；${cm.map(x=>`${x.c.l} ${pctTxt(ctx.base.m.ps[CATS.indexOf(x.c)])}→${pctTxt(r.m.ps[CATS.indexOf(x.c)])}`).join("、")}`:""}</small></div>
      <button class="pxbtn st-apply" type="button" data-a="${esc(r.p[0])}" data-d="${esc(r.drop||"")}">套用</button></div>`}).join("");
  out.querySelectorAll(".st-apply").forEach(b=>b.onclick=()=>{fam.add=b.dataset.a;fam.drop=b.dataset.d;render();document.getElementById("h-fa").scrollIntoView({behavior:"smooth"});});
}

// ---------- 快速選單：右下角 MENU 按鈕，點了跳到各區塊 ----------
const NAV=[["me-sum","我的隊伍"],["h-vs","對戰預測"],["h-today","每日先發"],["h-trade","交易分析"],["h-fa","FA 分析／串流"],["h-league","聯盟排名"],["h-class","職業鑑定"],["h-teams","各隊球員"],["h-dex","球員卡圖鑑"]];
function navGo(id){
  const el=document.getElementById(id),bar=document.querySelector(".controls");if(!el)return;
  const off=(bar?bar.getBoundingClientRect().height:0)+12;
  window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-off,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}
function initPlan(){
  document.getElementById("day-sel").onchange=e=>{planDay=+e.target.value;renderToday();};
  document.getElementById("st-go").onclick=streamSearch;
  const btn=document.getElementById("nav-btn"),menu=document.getElementById("nav-menu");
  menu.innerHTML=NAV.map(([id,l])=>`<button class="menu-btn" type="button" data-go="${id}">${l}</button>`).join("")+`<button class="menu-btn" type="button" data-go="top">▲ 回到最上面</button>`;
  const close=()=>{menu.hidden=true;btn.setAttribute("aria-expanded","false");};
  btn.onclick=()=>{const open=menu.hidden;menu.hidden=!open;btn.setAttribute("aria-expanded",String(open));if(open)menu.querySelector("button").focus();};
  menu.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{close();if(b.dataset.go==="top")window.scrollTo({top:0});else navGo(b.dataset.go);btn.focus();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){close();btn.focus();}});
}
