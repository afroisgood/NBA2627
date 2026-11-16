// ---------- 對戰前瞻（WEEKLY PREVIEW）：本週／下週 8 組對戰的預測卡片，可以下載成一張圖 ----------
// 數字來自 model.js 的 previewWeek()：固定設定（有本季數據用預測＋本季、扣傷兵、考慮出賽率、9 項），不受畫面上的選擇影響

const PV_CN={fg:"命中率",ft:"罰球",tpm:"三分",pts:"得分",reb:"籃板",ast:"助攻",stl:"抄截",blk:"阻攻",to:"低失誤"};
const pv={which:"next"};
// 隊名太長（超過 8 個字）時，只留第一個空白或標點之前的部分
const pvShort=n=>{if([...n].length<=8)return n;const m=n.match(/^(.{2,}?)[\s：:，,～~]/u);return m?m[1]:n};
const pvLast=n=>{const a=n.normalize("NFC").split(" ");return a.length>1?a.slice(1).join(" "):n};
// 贏面 60% 以上算優勢、40–60% 算五五波
function pvCats(m){
  const ks=CATS.map((c,i)=>({k:c.k,p:m.ps[i]}));
  return {a:ks.filter(x=>x.p>=.6).sort((x,y)=>y.p-x.p),b:ks.filter(x=>x.p<=.4).sort((x,y)=>x.p-y.p),sw:ks.filter(x=>x.p>.4&&x.p<.6)};
}
const pvVerdict=w=>{const v=Math.max(w,1-w);return v>=.75?"大幅領先":v>=.6?"較有利":v>.55?"略優":"五五波"};
// 標題：照勝率和雙方優勢項目自動組出來
function pvHead(g){
  const c=pvCats(g.m),w=g.m.win,fav=w>=.5?g.A:g.B,dog=w>=.5?g.B:g.A,fc=w>=.5?c.a:c.b,dc=w>=.5?c.b:c.a;
  const top=a=>a.slice(0,2).map(x=>PV_CN[x.k]).join("、");
  if(Math.max(w,1-w)>=.75)return `${pvShort(fav.name)} 大幅領先，${pvShort(dog.name)} ${dc.length?`靠${top(dc)}突圍`:"難以招架"}`;
  const part=(t,cs)=>cs.length?`${pvShort(t.name)} 拚${top(cs)}`:`${pvShort(t.name)} 沒有明顯優勢`;
  return `${part(g.A,c.a)}，${part(g.B,c.b)}${pvVerdict(w)==="五五波"?"｜五五波":""}`;
}
// 主力的場均：得分一定列，再加價值最突出的兩項
function pvStat(s,cz){
  const z=cz(s)||{},st={pts:[s[6],"分"],reb:[s[7],"板"],ast:[s[8],"助"],tpm:[s[5],"三分"],stl:[s[9],"抄"],blk:[s[10],"帽"]};
  const ks=Object.keys(st).filter(k=>k!=="pts").sort((a,b)=>(z[b]??0)-(z[a]??0)).slice(0,2);
  return ["pts","reb","ast","tpm","stl","blk"].filter(k=>k==="pts"||ks.includes(k)).map(k=>`${st[k][0].toFixed(1)} ${st[k][1]}`).join(" · ");
}
// 卡片下方的說明：傷停（整週不打）、新聞判斷只缺一場的人
function pvNotes(g){
  const out=[...g.A.out,...g.B.out].map(pvLast),rest=[...g.A.rest,...g.B.rest].map(pvLast);
  return [out.length&&`傷停：${out.join("、")}`,rest.length&&`只缺一場照常算：${rest.join("、")}`].filter(Boolean).join("；");
}
function pvData(){
  if(pv.which==="next"&&!hasNext())pv.which="now";
  return previewWeek(pv.which);
}
function renderReport(){
  const out=document.getElementById("pv-out"),info=document.getElementById("pv-info"),P=pvData();
  document.getElementById("pv-now").setAttribute("aria-pressed",pv.which==="now");
  document.getElementById("pv-next").setAttribute("aria-pressed",pv.which==="next");
  document.getElementById("pv-next").disabled=!hasNext();
  document.getElementById("pv-dl").disabled=!P;
  if(!P){
    out.innerHTML="";
    info.textContent=!IMP?"從 Yahoo 更新過資料後，這裡會列出 8 組對戰的預測，可以下載成一張週報圖片。"
      :!WEEKLY?"這份資料沒有對戰組合（可能是舊版書籤抓的）。請按上方「↻ 更新資料」，把書籤重新拖一次，再更新。"
      :"這份資料的週次對不上賽程，沒辦法預測。請再更新一次資料。";
    return;
  }
  const cz=catZ(),me=TID[ME];
  info.textContent=`Yahoo 第 ${P.y} 週（${md(P.s)}–${md(P.e)}）${P.next?"下週":"本週"}對戰，資料 ${fmtAt(IMP.at)}。${hasNext()?"":"這份資料沒有下週的對戰組合（新版書籤才會抓），先顯示本週。"}`;
  const side=(T,cls)=>`<div class="pv-tm ${cls}">${T.star?avatarHTML(T.star.n):""}<div class="pv-tx"><span class="pv-nm" title="${esc(T.name)}">${esc(pvShort(T.name))}${TID[T.name]===me?'<span class="tag">1P</span>':""}</span>
    ${T.star?`<span class="pv-st">${esc(pvLast(T.star.n))} · 本週 ${T.star.g} 場</span><span class="pos">${pvStat(T.star.s,cz)}</span>`:'<span class="pos">沒有可上場的球員</span>'}</div></div>`;
  const chip=(x,inv)=>`<span class="pv-chip ${inv?"b":""}">${PV_CN[x.k]} ${pctTxt(inv?1-x.p:x.p)}</span>`;
  out.innerHTML=P.g.map((g,i)=>{
    const c=pvCats(g.m),w=Math.round(g.m.win*100),nt=pvNotes(g);
    return `<article class="pv-card ${g.a===me||g.b===me?"mine":""}">
      <h3 class="pv-h"><span class="pv-no">${String(i+1).padStart(2,"0")}</span><span>${esc(pvHead(g))}</span></h3>
      <div class="pv-vs">${side(g.A,"a")}<div class="pv-mid"><span class="pos">預測勝率</span><b>${w}:${100-w}</b><span class="pos">預期贏 ${f1(g.m.exp)} : ${f1(9-g.m.exp)} 項</span></div>${side(g.B,"b")}</div>
      <div class="pv-chips"><div>${c.a.slice(0,4).map(x=>chip(x)).join("")||'<span class="pos">沒有明顯優勢</span>'}</div><div class="r">${c.b.slice(0,4).map(x=>chip(x,true)).join("")||'<span class="pos">沒有明顯優勢</span>'}</div></div>
      <p class="pv-key"><b>${c.sw.length?`關鍵項目：${c.sw.map(x=>`${PV_CN[x.k]} ${pctTxt(x.p)}`).join("、")}`:"沒有五五波的項目"}</b><span>先發場次 ${Math.round(g.A.starts)} : ${Math.round(g.B.starts)}</span></p>
      ${nt?`<p class="pos">${esc(nt)}</p>`:""}</article>`;
  }).join("");
  loadPhotos();
}

// ----- 下載成圖片：用 canvas 自己畫（不靠截圖，手機也能用），顏色讀 :root 的 token -----
function pvFit(ctx,t,w){if(ctx.measureText(t).width<=w)return t;let s=t;while(s.length>1&&ctx.measureText(s+"…").width>w)s=s.slice(0,-1);return s+"…"}
function pvImg(src){return new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=src;})}
// 主力頭像：有照片點陣就用，沒有就用名字圖案
function pvAvatar(name,ink){
  const id=PIDS[name],ph=id&&PHOTO[id];
  if(ph&&ph!=="fail"&&ph!=="wait")return pvImg(ph);
  return pvImg("data:image/svg+xml,"+encodeURIComponent(pixAvatar(name,96).replace("<svg ",`<svg xmlns="http://www.w3.org/2000/svg" fill="${ink}" `)));
}
async function drawReport(P){
  const css=getComputedStyle(document.documentElement),tk=n=>css.getPropertyValue(n).trim();
  const C={lcd:tk("--lcd"),lcd2:tk("--lcd-2"),lcd3:tk("--lcd-3"),mid:tk("--mid"),ink:tk("--ink")};
  const TXT=`"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif`,DOT=`"DotGothic16",${TXT}`,PIX=`"Press Start 2P",monospace`;
  const cz=catZ(),me=TID[ME],cards=P.g.map(g=>({g,c:pvCats(g.m),head:pvHead(g),nt:pvNotes(g)}));
  // 先把會用到的字載進來（中文字型是分段下載的，canvas 不會自己觸發）
  const all=cards.map(x=>x.head+x.nt+x.g.A.name+x.g.B.name).join("")+Object.values(PV_CN).join("")+"第週對戰前瞻預測勝率期贏項關鍵目先發場次本沒有五波的明顯優勢資料美東傷停只缺一照常算分板助三抄帽下";
  try{await Promise.all([`700 20px ${TXT}`,`900 20px ${TXT}`,`400 20px ${TXT}`,`20px ${DOT}`,`12px ${PIX}`].map(f=>document.fonts.load(f,all+"0123456789:%.·WEEKLYPREVIEW")));}catch(e){}
  const W=1480,M=36,GAP=24,CW=(W-M*2-GAP)/2,CH=300,HEAD=150,rows=Math.ceil(cards.length/2),H=HEAD+rows*(CH+GAP)+56;
  const cv=document.createElement("canvas");cv.width=W;cv.height=H;const x=cv.getContext("2d");
  x.fillStyle=C.lcd;x.fillRect(0,0,W,H);
  x.fillStyle=C.ink;x.fillRect(0,0,W,8);
  x.textBaseline="alphabetic";
  x.font=`13px ${PIX}`;x.fillStyle=C.mid;x.fillText(`WEEKLY PREVIEW · WEEK ${String(P.y).padStart(2,"0")}`,M,52);
  x.font=`900 46px ${TXT}`;x.fillStyle=C.ink;x.fillText(`第 ${P.y} 週對戰前瞻`,M,106);
  x.font=`700 17px ${TXT}`;x.fillStyle=C.mid;x.fillText(`${md(P.s)}–${md(P.e)}（美東）· 資料 ${fmtAt(IMP.at)} · 預測＋本季、每天排 10 人先發`,M,136);
  x.textAlign="right";x.font=`13px ${PIX}`;x.fillText("JESSICA-AI LEAGUE",W-M,52);x.textAlign="left";
  const avs=await Promise.all(cards.flatMap(({g})=>[g.A,g.B].map(T=>T.star?pvAvatar(T.star.n,C.ink):null)));
  cards.forEach(({g,c,head,nt},i)=>{
    const X=M+(i%2)*(CW+GAP),Y=HEAD+Math.floor(i/2)*(CH+GAP),mine=g.a===me||g.b===me;
    x.fillStyle=C.lcd;x.fillRect(X,Y,CW,CH);x.lineWidth=mine?6:3;x.strokeStyle=C.ink;x.strokeRect(X,Y,CW,CH);
    // 編號＋標題
    x.fillStyle=C.ink;x.fillRect(X+16,Y+16,44,30);x.fillStyle=C.lcd;x.font=`12px ${PIX}`;x.textAlign="center";x.fillText(String(i+1).padStart(2,"0"),X+38,Y+37);
    x.textAlign="left";x.fillStyle=C.ink;x.font=`700 21px ${TXT}`;x.fillText(pvFit(x,head,CW-92),X+72,Y+39);
    // 兩隊
    [[g.A,0],[g.B,1]].forEach(([T,r])=>{
      const ax=r?X+CW-16-88:X+16,ay=Y+62,im=avs[i*2+r];
      x.fillStyle=C.lcd2;x.fillRect(ax,ay,88,88);
      if(im){x.imageSmoothingEnabled=false;x.drawImage(im,ax+4,ay+4,80,80);}
      x.strokeStyle=C.ink;x.lineWidth=3;x.strokeRect(ax,ay,88,88);
      const tx=r?ax-12:ax+100,tw=CW/2-88-16-12-66;
      x.textAlign=r?"right":"left";
      x.fillStyle=C.ink;x.font=`900 21px ${TXT}`;x.fillText(pvFit(x,pvShort(T.name)+(TID[T.name]===me?"（1P）":""),tw),tx,ay+24);
      if(T.star){x.font=`700 15px ${TXT}`;x.fillText(pvFit(x,`${pvLast(T.star.n)} · ${T.star.g} 場`,tw),tx,ay+52);
        x.fillStyle=C.mid;x.font=`400 13px ${TXT}`;x.fillText(pvFit(x,pvStat(T.star.s,cz).replace(/ · /g,"　").replace(/(\d) /g,"$1"),tw),tx,ay+76);}
    });
    // 中間：勝率
    const cx=X+CW/2,w=Math.round(g.m.win*100);
    x.textAlign="center";x.fillStyle=C.mid;x.font=`700 13px ${TXT}`;x.fillText("預測勝率",cx,Y+82);
    x.fillStyle=C.ink;x.font=`40px ${DOT}`;x.fillText(`${w}:${100-w}`,cx,Y+124);
    x.fillStyle=C.mid;x.font=`700 13px ${TXT}`;x.fillText(`預期贏 ${f1(g.m.exp)} : ${f1(9-g.m.exp)} 項`,cx,Y+148);
    // 優勢項目：左隊實心、右隊外框
    x.font=`700 15px ${TXT}`;
    const chips=(list,inv)=>{let px=inv?X+CW-16:X+16;
      if(!list.length){x.fillStyle=C.mid;x.textAlign=inv?"right":"left";x.fillText("沒有明顯優勢",px,Y+189);return;}
      list.slice(0,3).forEach(k=>{const t=`${PV_CN[k.k]} ${pctTxt(inv?1-k.p:k.p)}`,tw=x.measureText(t).width+18,bx=inv?px-tw:px;
        if(inv){x.fillStyle=C.lcd3;x.fillRect(bx,Y+168,tw,30);x.strokeStyle=C.ink;x.lineWidth=2;x.strokeRect(bx,Y+168,tw,30);x.fillStyle=C.ink;}
        else{x.fillStyle=C.ink;x.fillRect(bx,Y+168,tw,30);x.fillStyle=C.lcd;}
        x.textAlign="left";x.fillText(t,bx+9,Y+189);px+=inv?-(tw+8):tw+8;});};
    chips(c.a,false);chips(c.b,true);
    // 關鍵項目＋先發場次
    x.fillStyle=C.lcd2;x.fillRect(X+16,Y+212,CW-32,34);
    x.textAlign="right";x.fillStyle=C.mid;x.font=`400 14px ${TXT}`;const st=`先發場次 ${Math.round(g.A.starts)} : ${Math.round(g.B.starts)}`;x.fillText(st,X+CW-26,Y+235);
    x.textAlign="left";x.fillStyle=C.ink;x.font=`700 15px ${TXT}`;
    x.fillText(pvFit(x,c.sw.length?`關鍵項目：${c.sw.map(k=>`${PV_CN[k.k]} ${pctTxt(k.p)}`).join("、")}`:"沒有五五波的項目",CW-52-x.measureText(st).width-20),X+26,Y+235);
    if(nt){x.fillStyle=C.mid;x.font=`400 14px ${TXT}`;x.fillText(pvFit(x,nt,CW-40),X+20,Y+274);}
  });
  x.textAlign="left";x.fillStyle=C.mid;x.font=`400 14px ${TXT}`;
  x.fillText("勝率＝9 項贏 5 項以上的機率；球員後面是那週打幾場和場均；色塊＝贏面 60% 以上的項目；關鍵項目＝40–60% 的五五波。之後的撿人、交易、傷停會改變結果。",M,H-26);
  return cv;
}
async function downloadReport(){
  const P=pvData(),msg=document.getElementById("pv-msg"),btn=document.getElementById("pv-dl");if(!P)return;
  btn.disabled=true;msg.textContent="畫圖中…";
  try{
    const cv=await drawReport(P),blob=await new Promise(r=>cv.toBlob(r,"image/png"));
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`week${P.y}-preview.png`;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    msg.textContent=`已下載 week${P.y}-preview.png。`;
  }catch(e){msg.textContent="圖片產生失敗，請重新整理網頁再試一次。";}
  btn.disabled=false;
}
function initReport(){
  document.getElementById("pv-now").onclick=()=>{pv.which="now";renderReport();};
  document.getElementById("pv-next").onclick=()=>{pv.which="next";renderReport();};
  document.getElementById("pv-dl").onclick=downloadReport;
}
