
const CATS=[
 {k:"fg",l:"FG%",pct:true},{k:"ft",l:"FT%",pct:true},{k:"tpm",l:"3PM"},{k:"pts",l:"PTS"},{k:"reb",l:"REB"},
 {k:"ast",l:"AST"},{k:"stl",l:"STL"},{k:"blk",l:"BLK"},{k:"to",l:"TO",low:true}];
const IDX={gp:0,fgm:1,fga:2,ftm:3,fta:4,tpm:5,pts:6,reb:7,ast:8,stl:9,blk:10,to:11};
const PREV={"pr":{"諸葛衛冕村夫":[3,2],"乂唯一珍❤️杰西卡乂":[10,10],"大小小丑與他的歡樂同伴們":[14,12],"南方勇者北伐🧔‍♂️七崩賢":[8,9],"天母羅斯":[4,4],"CrocoCroco":[5,7],"拿了就起，起了就～駿🏀":[11,13],"新中國王":[13,14],"想你的林":[12,8],"欸我姆斯拉":[2,1],"永保安康":[15,16],"高移肉 想念booker 的第一天":[1,3],"石":[6,5],"老蔡水煎包":[16,15],"金采源老公":[7,6],"坂木老大：賣全身球員求合成":[9,11]},"ls":{"諸葛衛冕村夫":[13,9],"乂唯一珍❤️杰西卡乂":[7,10],"大小小丑與他的歡樂同伴們":[12,13],"南方勇者北伐🧔‍♂️七崩賢":[5,6],"天母羅斯":[6,4],"CrocoCroco":[9,8],"拿了就起，起了就～駿🏀":[14,15],"新中國王":[16,16],"想你的林":[11,11],"欸我姆斯拉":[1,2],"永保安康":[10,12],"高移肉 想念booker 的第一天":[3,3],"石":[2,1],"老蔡水煎包":[15,14],"金采源老公":[8,5],"坂木老大：賣全身球員求合成":[4,7]}};
if(IMP&&IMP.PREV)Object.assign(PREV,IMP.PREV);
PREV.cur=PREV.cur||{};PREV.mix=PREV.mix||{};
// 8x8 pixel emblems
const EMB={
"石":["00111100","01111110","11101111","11111101","11011111","11111111","01111110","00000000"],
"乂唯一珍❤️杰西卡乂":["01100110","11111111","11111111","11111111","01111110","00111100","00011000","00000000"],
"大小小丑與他的歡樂同伴們":["10000001","11000011","01100110","00111100","01111110","11111111","10100101","00000000"],
"南方勇者北伐🧔‍♂️七崩賢":["00000011","00000111","00001110","00011100","10111000","01110000","01100000","10010000"],
"天母羅斯":["00111000","01101100","01111100","00111000","00010000","01011000","00110000","00010000"],
"CrocoCroco":["00000000","11110000","10011111","11111111","10101010","11111111","01111110","00000000"],
"拿了就起，起了就～駿🏀":["00111100","01011010","10011001","11111111","10011001","01011010","00111100","00000000"],
"新中國王":["00000000","10011001","10111101","11111111","11111111","01111110","01111110","00000000"],
"想你的林":["00011000","00111100","01111110","00111100","01111110","11111111","00011000","00011000"],
"欸我姆斯拉":["00011000","00011000","11111111","01111110","00111100","01100110","11000011","00000000"],
"永保安康":["11111111","10011001","10011001","11111111","10011001","01011010","00111100","00011000"],
"高移肉 想念booker 的第一天":["00000110","00001111","00011111","00111110","01111100","01111000","10000000","11000000"],
"老蔡水煎包":["00011000","00100100","01011010","10100101","11111111","11111111","01111110","00000000"],
"金采源老公":["00111100","01000010","00111100","01100110","11000011","11000011","01100110","00111100"],
"諸葛衛冕村夫":["10101010","11111110","01111100","00111000","00010000","00010000","00010000","00111000"],
"坂木老大：賣全身球員求合成":["01100110","11000011","11000011","11000011","11000011","01100110","01100110","00000000"]};
function emblem(name,size=20){const b=EMB[name];if(!b)return "";let r="";b.forEach((row,y)=>[...row].forEach((c,x)=>{if(c==="1")r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`}));return `<svg class="emb" width="${size}" height="${size}" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`}

let state={src:"pr",punt:false,inj:true,gp:true,week:null,sort:{k:"ovr",dir:1},team:ME,opp:null};
try{const s=JSON.parse(localStorage.getItem("lp-state2")||"null");if(s)state={...state,...s};}catch(e){}
if(typeof state.gp!=="boolean")state.gp=true;
if(!["pr","ls","cur","mix"].includes(state.src)||(["cur","mix"].includes(state.src)&&!hasCur()))state.src="pr";
function save(){try{localStorage.setItem("lp-state2",JSON.stringify({src:state.src,punt:state.punt,inj:state.inj,gp:state.gp,week:state.week,team:state.team,opp:state.opp}))}catch(e){}}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const f1=x=>x.toFixed(1), f3=x=>x.toFixed(3).replace(/^0/,"");
const SI=()=>({pr:4,ls:5,cur:6,mix:7})[state.src];
const active=p=>p[1]!=="IL";

function compute(data=DATA){
  const si=SI();
  return data.map(team=>{
    const t={fgm:0,fga:0,ftm:0,fta:0,tpm:0,pts:0,reb:0,ast:0,stl:0,blk:0,to:0};let n=0,miss=0;
    team[1].forEach(p=>{if(!active(p))return;const s=p[si];if(!s){miss++;return;}n++;const w=playW(p);for(const k in t)t[k]+=s[IDX[k]]*w;});
    const v={fg:t.fga?t.fgm/t.fga:0,ft:t.fta?t.ftm/t.fta:0,tpm:t.tpm,pts:t.pts,reb:t.reb,ast:t.ast,stl:t.stl,blk:t.blk,to:t.to};
    return {name:team[0],ps:team[1],v,n,miss};
  });
}
// full＝也算 H2H 勝率（只有畫面顯示需要；交易、撿人模擬不用，省時間）
function rankAll(rows,full){
  CATS.forEach(c=>{[...rows].sort((a,b)=>c.low?a.v[c.k]-b.v[c.k]:b.v[c.k]-a.v[c.k]).forEach((r,i)=>{(r.r=r.r||{})[c.k]=i+1})});
  rows.forEach(r=>{r.avg=CATS.reduce((a,c)=>a+r.r[c.k],0)/9;r.avgNA=CATS.filter(c=>c.k!=="ast").reduce((a,c)=>a+r.r[c.k],0)/8;});
  [["avg","ovr9"],["avgNA","ovrNA"]].forEach(([k,n])=>[...rows].sort((a,b)=>a[k]-b[k]).forEach((r,i)=>r[n]=i+1));
  rows.forEach(r=>{r.ovr=state.punt?r.ovrNA:r.ovr9;r.avgUse=state.punt?r.avgNA:r.avg;});
  if(full)h2hAll(rows);
}
// player value (z-score sum vs all active rostered players)
function playerValues(){
  const si=SI(),pool=[];DATA.forEach(t=>t[1].forEach(p=>{if(active(p)&&p[si])pool.push(p[si])}));
  const sum=(f)=>pool.reduce((a,s)=>a+f(s),0);
  const lfg=sum(s=>s[1])/sum(s=>s[2]),lft=sum(s=>s[3])/sum(s=>s[4]);
  const raw=s=>({fg:s[1]-lfg*s[2],ft:s[3]-lft*s[4],tpm:s[5],pts:s[6],reb:s[7],ast:s[8],stl:s[9],blk:s[10],to:-s[11]});
  const R=pool.map(raw),mu={},sd={};
  CATS.forEach(c=>{const a=R.map(r=>r[c.k]);mu[c.k]=a.reduce((x,y)=>x+y,0)/a.length;sd[c.k]=Math.sqrt(a.reduce((x,y)=>x+(y-mu[c.k])**2,0)/a.length)||1});
  return s=>{if(!s)return null;const r=raw(s);return CATS.reduce((a,c)=>a+(state.punt&&c.k==="ast"?0:(r[c.k]-mu[c.k])/sd[c.k]),0)};
}
const tier=n=>n<=4?"h1":n<=8?"h2":n<=12?"h3":"h4";
function rk(n){return `<span class="rk ${n<=3?"top":n>=14?"low":""}">${n}</span>`}
const fmt=(c,v)=>c.pct?f3(v):f1(v);
const visCats=()=>CATS.filter(c=>!(state.punt&&c.k==="ast"));

function renderLeague(rows){
  const s=state.sort,cats=visCats();
  if(state.punt&&s.k==="ast")state.sort={k:"ovr",dir:1};
  const key=r=>s.k==="ovr"?r.ovr:s.k==="win"?r.winRk:r.r[s.k];
  const list=[...rows].sort((a,b)=>(key(a)-key(b))*s.dir||a.ovr-b.ovr);
  const th=(k,l)=>`<th scope="col" class="sortable ${s.k===k?"sorted":""}" data-k="${k}" tabindex="0" aria-sort="${s.k===k?(s.dir===1?"ascending":"descending"):"none"}">${l}</th>`;
  let h=`<thead><tr><th scope="col" class="name">TEAM</th>${th("ovr",state.punt?"不算AST":"9項綜合")}${th("win","H2H 勝率")}${cats.map(c=>th(c.k,c.l)).join("")}</tr></thead><tbody>`;
  list.forEach(r=>{
    const me=r.name===ME,prev=(PREV[state.src][r.name]||[])[state.punt?1:0];
    const d=prev?prev-r.ovr:0;
    const dl=d>0?`<span class="delta up">${d}</span>`:d<0?`<span class="delta dn">${-d}</span>`:`<span class="delta">–</span>`;
    h+=`<tr class="${me?"me":""}"><td class="name"><span class="tn">${emblem(r.name)}<span>${esc(r.name)}</span>${me?'<span class="tag">1P</span>':""}</span></td>
    <td><div class="cell"><span class="ovr">${r.ovr}</span>${dl}<span class="pos">平均第 ${f1(r.avgUse)}</span></div></td>
    <td class="${tier(r.winRk)}"><div class="cell"><span>${pctTxt(r.win)}</span><span class="pos">贏 ${f1(r.expCats)} 項 · 第 ${r.winRk}</span></div></td>
    ${cats.map(c=>`<td class="${tier(r.r[c.k])}"><div class="cell"><span>${fmt(c,r.v[c.k])}</span>${rk(r.r[c.k])}</div></td>`).join("")}</tr>`;
  });
  document.getElementById("league").innerHTML=h+"</tbody>";
  const missT=rows.reduce((a,r)=>a+r.miss,0);
  document.getElementById("league-note").textContent=
    "數字是全隊（不含 IL）每場數據加總"+(state.inj?"，缺陣（O）不算、出賽存疑（Q）打 75 折":"")+(state.gp?"，每人再乘上出賽率（預測出賽場數 ÷ 整季場數）":"")+"。♛ 前 3 名、☠ 第 14–16 名；格子越深名次越前（1–4、5–8、9–12、13–16 四階）。點欄位標題可排序。H2H 勝率＝跟其他 15 隊各對戰一次、9 項贏 5 項以上的平均機率（放棄助攻也是 9 項都比）。"
    +(!["pr","mix"].includes(state.src)&&missT?` ${state.src==="ls"?"上季":"本季"}版有 ${missT} 位球員沒有${state.src==="ls"?"上季":"本季"}數據，不計入加總。`:"");
  document.querySelectorAll("#league th.sortable").forEach(el=>{
    const go=()=>{const k=el.dataset.k;state.sort=state.sort.k===k?{k,dir:-state.sort.dir}:{k,dir:1};render();};
    el.onclick=go;el.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go();}};
  });
}

function renderVS(rows){
  const sel=document.getElementById("opp");
  const others=rows.filter(r=>r.name!==ME).sort((a,b)=>a.ovr-b.ovr),mt=matchNow();
  // 對手：自己選的優先；沒選（null）就用 Yahoo 本週對手，再沒有就用排名第一的隊
  if(state.opp&&!others.find(r=>r.name===state.opp))state.opp=null;
  const opp=state.opp||(mt?mt.opp:others[0].name);
  sel.innerHTML=others.map(r=>`<option value="${esc(r.name)}" ${r.name===opp?"selected":""}>#${r.ovr} ${esc(r.name)}${mt&&r.name===mt.opp?"（本週對手）":""}</option>`).join("");
  const A=rows.find(r=>r.name===ME),B=rows.find(r=>r.name===opp);
  const wk=vsWeek(),ws=document.getElementById("vs-week");
  ws.innerHTML=`<option value="pg">每場平均（不看賽程）</option>`+WEEKS.map(x=>`<option value="${x.key}">第 ${x.i} 週 ${md(x.s)}–${md(x.e)}</option>`).join("");
  ws.value=wk?wk.key:"pg";ws.disabled=!WEEKS.length;
  ws.onchange=()=>{state.week=ws.value;save();render();};
  let va=A.v,vb=B.v,info=SCHED?"":"從 Yahoo 更新過資料後，可以選週次，依每隊這週的出賽場數和每天的先發名額預測。";
  if(wk){const val=playerValues(),ta=weekTotals(A.ps,wk,val),tb=weekTotals(B.ps,wk,val);va=ta.v;vb=tb.v;
    info=`第 ${wk.i} 週（${md(wk.s)}–${md(wk.e)}）預測總數：${esc(ME)} 先發 ${ta.starts} 場次${ta.benched?`（另有 ${ta.benched} 場次排不進先發）`:""}；${esc(B.name)} 先發 ${tb.starts} 場次${tb.benched?`（另有 ${tb.benched} 場次排不進先發）`:""}。每天最多 10 人上場，依位置排出最好的陣容${state.inj?"，缺陣不算、存疑打 75 折":""}${state.gp?"，再乘上出賽率":""}。`;}
  document.getElementById("vs-info").innerHTML=info;
  document.getElementById("vs-live").innerHTML=liveScore(B.name,mt);
  const M=matchup(va,vb);
  let w=0,l=0,t=0;
  const rowsH=CATS.map((c,ci)=>{
    const a=va[c.k],b=vb[c.k];const eq=Math.abs(a-b)<1e-9;
    const aw=!eq&&(c.low?a<b:a>b);if(eq)t++;else if(aw)w++;else l++;
    const mx=Math.max(a,b)||1,mn=Math.min(a,b);
    let pa,pb;if(c.pct){const lo=mn-0.03;pa=(a-lo)/(mx-lo)*100;pb=(b-lo)/(mx-lo)*100;}else{pa=a/mx*100;pb=b/mx*100;}
    const pun=state.punt&&c.k==="ast";
    return `<div class="vs-row ${eq?"":aw?"win-l":"win-r"} ${pun?"punted":""}"><span class="val l">${fmt(c,a)}</span><div class="vs-bar l"><i style="width:${pa.toFixed(0)}%"></i></div><span class="cat">${c.l}${c.low?"↓":""}<small>贏面 ${pctTxt(M.ps[ci])}</small></span><div class="vs-bar r"><i style="width:${pb.toFixed(0)}%"></i></div><span class="val r">${fmt(c,b)}</span></div>`;
  }).join("");
  const verdict=w>l?"WIN":w<l?"LOSE":"DRAW";
  document.getElementById("vs-top").innerHTML=`<div class="vs-side">${emblem(ME,40)}<span class="nm">${esc(ME)} <span class="tag">1P</span></span></div>
    <div class="vs-score">${w} : ${l}${t?`<small>平手 ${t} 項</small>`:""}<small>預測 ${verdict}</small><small>勝率 ${pctTxt(M.win)} · 預期贏 ${f1(M.exp)} 項</small></div>
    <div class="vs-side">${emblem(B.name,40)}<span class="nm">${esc(B.name)}</span></div>`;
  document.getElementById("vs-rows").innerHTML=rowsH;
  sel.onchange=()=>{state.opp=sel.value;save();render();};
}

// Yahoo 本週實際比分（只在看的是本週對手時顯示）
function liveScore(opp,mt){
  if(!IMP||!IMP.MATCH)return "";
  if(!mt)return `<p class="note">上次抓到的 Yahoo 對戰是之前的週次。按上方「↻ 更新資料」抓本週對手和目前比分。</p>`;
  if(opp!==mt.opp)return `<p class="note">Yahoo 本週對手是 ${esc(mt.opp)}，你現在看的是別隊。</p>`;
  if(!mt.me||!mt.op)return `<p class="note">本週對手：${esc(mt.opp)}（Yahoo）。比賽開始後再更新資料，就會顯示目前的實際比分。</p>`;
  let w=0,l=0;
  const cells=CATS.map(c=>{const a=mt.me[c.k],b=mt.op[c.k];if(a==null||b==null)return {c,a,b,s:0};const s=a===b?0:(c.low?a<b:a>b)?1:-1;if(s>0)w++;if(s<0)l++;return {c,a,b,s}});
  const v=(x,c,win)=>x==null?'<span class="dash">—</span>':`${win?"♛":""}${c.pct?f3(x):Number.isInteger(x)?x:f1(x)}`;
  return `<div class="vs-live"><p><b>本週實際比分</b>（Yahoo${mt.week?` 第 ${mt.week} 週`:""}，${fmtAt(mt.at)} 抓取）：${esc(ME)} <b>${w} : ${l}</b> ${esc(mt.opp)}</p>
    <div class="scroll"><table><thead><tr><th class="name">實際</th>${cells.map(x=>`<th>${x.c.l}${x.c.low?"↓":""}</th>`).join("")}</tr></thead><tbody>
    <tr><td class="name">${esc(ME)}</td>${cells.map(x=>`<td class="${x.s>0?"h1":""}">${v(x.a,x.c,x.s>0)}</td>`).join("")}</tr>
    <tr><td class="name">${esc(mt.opp)}</td>${cells.map(x=>`<td class="${x.s<0?"h1":""}">${v(x.b,x.c,x.s<0)}</td>`).join("")}</tr></tbody></table></div></div>`;
}

// VS 的週次：state.week 為 null＝自動（本週）、"pg"＝每場平均、"wN"＝第 N 週
function vsWeek(){if(!WEEKS.length||state.week==="pg")return null;return weekOf(state.week)||curWeek()}

function hpBar(v){
  if(v==null)return '<span class="dash">—</span>';
  const max=8,c=Math.max(-max,Math.min(max,v)),half=48;
  const w=Math.abs(c)/max*50;
  const style=c>=0?`left:50%;width:${w}%`:`right:50%;width:${w}%`;
  return `<span class="hp"><span class="hp-track"><span class="hp-fill ${c<0?"neg":""}" style="${style}"></span><span class="hp-mid" style="left:calc(50% - 1px)"></span></span><span class="hp-num">${v>0?"+":""}${v.toFixed(1)}</span></span>`;
}

function renderTeams(rows){
  const pk=document.getElementById("picker");
  const order=[...rows].sort((a,b)=>a.name===ME?-1:b.name===ME?1:a.ovr-b.ovr);
  pk.innerHTML=order.map(r=>`<button class="menu-btn" type="button" data-t="${esc(r.name)}" aria-pressed="${r.name===state.team}">${emblem(r.name,16)}<span class="t">${esc(r.name)}</span>${r.name===ME?'<span class="tag">1P</span>':""}</button>`).join("");
  pk.querySelectorAll("button").forEach(b=>b.onclick=()=>{state.team=b.dataset.t;save();render();});
  if(!rows.find(r=>r.name===state.team))state.team=ME;
  const r=rows.find(x=>x.name===state.team),si=SI(),val=playerValues(),wk=vsWeek();
  const body=r.ps.map(p=>{
    const s=p[si],out=!active(p);
    const badge=out?'<span class="badge b-il">IL</span>':p[3]==="Q"?'<span class="badge">Q</span>':"";
    const cells=s?[`${f3(s[2]?s[1]/s[2]:0)}<span class="pos">${f1(s[1])}/${f1(s[2])}</span>`,`${f3(s[4]?s[3]/s[4]:0)}<span class="pos">${f1(s[3])}/${f1(s[4])}</span>`,f1(s[5]),f1(s[6]),f1(s[7]),f1(s[8]),f1(s[9]),f1(s[10]),f1(s[11])]:Array(9).fill('<span class="dash">—</span>');
    const keep=CATS.map((c,i)=>state.punt&&c.k==="ast"?null:cells[i]).filter(x=>x!==null);
    return `<tr class="${out?"out":""}"><td class="name"><span class="slot">${esc(p[1])}</span><span class="pname">${esc(p[0])}</span>${badge}${p[2]?`<span class="pos" style="padding-left:36px">${esc(p[2])}</span>`:""}</td><td>${hpBar(val(s))}</td><td>${s?s[0]:'<span class="dash">—</span>'}</td>${wk?`<td>${gamesIn(p,wk)}</td>`:""}${keep.map(c=>`<td>${c}</td>`).join("")}</tr>`;
  }).join("");
  const cats=visCats();
  const tot=`<tr class="total"><td class="name">球隊每場加總（${r.n} 人）</td><td></td><td></td>${wk?"<td></td>":""}${cats.map(c=>`<td>${fmt(c,r.v[c.k])}</td>`).join("")}</tr>
    <tr class="ranks"><td class="name" style="color:var(--mid)">16 隊排名</td><td></td><td></td>${wk?"<td></td>":""}${cats.map(c=>`<td class="${tier(r.r[c.k])}">${rk(r.r[c.k])}</td>`).join("")}</tr>`;
  document.getElementById("team").innerHTML=`<article class="team" style="display:flex;flex-direction:column;gap:8px">
    <div class="team-head"><h3>${emblem(r.name,28)}${esc(r.name)}${r.name===ME?'<span class="tag">1P</span>':""}</h3><span class="summary">${state.punt?"不算 AST":"9 項綜合"}第 ${r.ovr}</span></div>
    <div class="scroll"><table><thead><tr><th class="name" scope="col">PLAYER</th><th scope="col">價值</th><th scope="col">GP</th>${wk?`<th scope="col">第 ${wk.i} 週</th>`:""}${cats.map(c=>`<th scope="col">${c.l}</th>`).join("")}</tr></thead><tbody>${body}${tot}</tbody></table></div></article>`;
}

// my team summary: 9-cat / punt-AST overall rank with change, best and worst categories
function renderMe(rows){
  const r=rows.find(x=>x.name===ME),prev=PREV[state.src][ME]||[];
  const dl=(now,before)=>{const d=before?before-now:0;return d>0?`▲${d}`:d<0?`▼${-d}`:"–"};
  const cats=visCats().map(c=>({l:c.l,n:r.r[c.k]})).sort((a,b)=>a.n-b.n);
  const list=a=>a.map(c=>`${c.l} ${c.n}`).join(" · ");
  document.getElementById("me-sum").innerHTML=`
    <div class="ms-card"><span class="k">${esc(ME)} 1P · 9 CAT</span><div class="v"><b>第 ${r.ovr9} 名</b><span>${dl(r.ovr9,prev[0])}</span></div><span class="s">H2H 預期勝率 ${pctTxt(r.win)}（第 ${r.winRk}）</span></div>
    <div class="ms-card"><span class="k">${esc(ME)} 1P · PUNT AST</span><div class="v"><b>第 ${r.ovrNA} 名</b><span>${dl(r.ovrNA,prev[1])}${r.ovrNA===1?" ♛":""}</span></div></div>
    <div class="ms-card line"><span class="k">強項 ／ 弱項</span><p>♛ ${list(cats.slice(0,3))}</p><p>☠ ${list(cats.slice(-2).reverse())}</p></div>`;
}

function render(){
  const rows=compute();rankAll(rows,true);renderMe(rows);renderVS(rows);renderTrade(rows);renderFA(rows);renderLeague(rows);renderTeams(rows);
  const set=(id,on)=>document.getElementById(id).setAttribute("aria-pressed",on);
  set("src-pr",state.src==="pr");set("src-ls",state.src==="ls");set("src-cur",state.src==="cur");set("src-mix",state.src==="mix");set("inj-on",state.inj);set("inj-off",!state.inj);set("gp-on",state.gp);set("gp-off",!state.gp);set("mode-9",!state.punt);set("mode-p",state.punt);
}
document.getElementById("src-pr").onclick=()=>{state.src="pr";save();render()};
document.getElementById("src-ls").onclick=()=>{state.src="ls";save();render()};
document.getElementById("src-cur").onclick=()=>{state.src="cur";save();render()};
document.getElementById("src-cur").hidden=!hasCur();
document.getElementById("src-mix").onclick=()=>{state.src="mix";save();render()};
document.getElementById("src-mix").hidden=!hasCur();
document.getElementById("inj-on").onclick=()=>{state.inj=true;save();render()};
document.getElementById("inj-off").onclick=()=>{state.inj=false;save();render()};
document.getElementById("gp-on").onclick=()=>{state.gp=true;save();render()};
document.getElementById("gp-off").onclick=()=>{state.gp=false;save();render()};
document.getElementById("mode-9").onclick=()=>{state.punt=false;save();render()};
document.getElementById("mode-p").onclick=()=>{state.punt=true;save();render()};

// splash: once per session, auto-dismiss
(function(){
  const sp=document.getElementById("splash");let seen=false;
  try{seen=sessionStorage.getItem("lp-splash")==="1";sessionStorage.setItem("lp-splash","1");}catch(e){seen=true;}
  if(seen||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  sp.hidden=false;const close=()=>{sp.classList.add("gone");setTimeout(()=>sp.hidden=true,400);document.removeEventListener("keydown",close);};
  sp.onclick=close;document.addEventListener("keydown",close);setTimeout(close,1400);
})();
