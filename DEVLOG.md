# 杰西卡的AI實驗室 戰力表：開發紀錄

> 這份文件給接手的人（或 Claude Code）看，記錄專案目的、檔案結構、資料來源、演算法、開發歷程和待辦事項。
> 最後更新：2026-10-09（第 8 版：網頁內一鍵更新資料）

---

## 1. 專案目的

Yahoo Fantasy Basketball 聯盟「杰西卡的AI實驗室」（聯盟 ID **1031**）的戰力分析頁面。

- 賽制：16 隊、H2H 9-Cat（FG%、FT%、3PM、PTS、REB、AST、STL、BLK、TO），拍賣選秀，沒有 keeper
- 使用者的隊伍：**石**（team id 13），打法是**放棄助攻（Punt AST）**
- 使用者沒有寫程式經驗，**所有回覆和介面文字都用繁體中文**
- 聯盟判斷交易時，除了數據，也看 **Yahoo 季前排名（O-Rank）** 和 **Yahoo 全站持有率（% Rostered）**

---

## 2. 檔案結構

```
fantasy-power-table/
├── index.html           ← GitHub Pages 首頁，自動轉到 league-power.html
├── league-power.html    ← GitHub Pages 實際顯示的網頁＝dist/league-power.html 的複本（build.py 會自動更新）
├── DEVLOG.md            ← 本文件
├── CLAUDE.md            ← 給 Claude Code 的簡短指引
├── build.py             ← 把 src/ 組成 dist/ 的兩個 HTML，並更新根目錄 league-power.html
├── src/
│   ├── layout.html      ← <title>、字型、CSS、頁面骨架（沒有 <html>/<head>/<body>）
│   ├── data.js          ← ME（自己隊名）＋ DATA（16 隊名單與每位球員數據）
│   ├── market.js        ← MKT（每位被持有球員的季前排名、持有率）
│   ├── import.js        ← 讀取匯入的資料（localStorage lp-data）蓋過內建 DATA/MKT/ME；「資料更新」面板
│   ├── app.js           ← 主程式：計算、排名、VS、聯盟表、各隊表、開機畫面
│   └── trade.js         ← 交易分析器＋自動找交易，最後呼叫 initTrade() 和 render()
├── tools/
│   ├── fetch-snippets.js← 在已登入 Yahoo 的瀏覽器 console 抓資料用的程式片段（舊，手動整理用）
│   └── yahoo-update.js  ← 一鍵更新程式（書籤／console），build 時嵌進網頁
└── dist/
    ├── league-power.html          ← 完整獨立網頁，直接用瀏覽器打開
    └── league-power.artifact.html ← 發布到 claude.ai Artifact 用
```

建置：`python3 build.py`

**JS 載入順序很重要**：data.js → market.js → import.js → app.js → trade.js。import.js 必須在 app.js 前面（app.js 一載入就會用到 ME、IMP、hasCur）；`initImport()` 放在 trade.js 最後、`render()` 之後。trade.js 裡有 `const`（tm、FA 等），所以 `initTrade(); render();` 必須放在 trade.js 最後，不能放在 app.js，否則會遇到 TDZ 錯誤。

---

## 3. 資料格式

### DATA（src/data.js）

```js
let ME = "石";          // let：匯入的資料可能改隊名
const DATA = [
  ["隊名", [
    ["球員名", "名單位置", "NBA球隊 - 位置", "狀態", proj陣列, last陣列, cur陣列],
    ...
  ]],
  ...16 隊
];
```

- 名單位置：`PG/SG/G/SF/PF/F/C/Util/BN/IL`。**IL 球員不計入球隊數據，也不佔正式名單位。**
- 狀態：`""`、`"Q"`（出賽存疑）、`"O"`（缺陣）
- 數據陣列（都是**場均**）：`[gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to]`
  - `proj`：2026-27 三家預測平均
  - `last`：2025-26 上季實際；新秀或上季沒出賽的是 `null`
  - `cur`：2026-27 本季實際（只有匯入的資料才有）；還沒出賽的是 `null`

### MKT（src/market.js）

```js
const MKT = { "球員名": [季前排名, 持有率%], ... };
```

沒有資料的球員預設 `[260, 3]` 或 `[260, 5]`。

### 匯入資料（localStorage `lp-data`）

`tools/yahoo-update.js` 產生、`src/import.js` 讀取：

```js
{ v: 1, at: "ISO 時間", ME: "自己隊名", DATA: [...同上...], MKT: {...同上...},
  FA: [ ["球員名", "FA" 或 "W", "NBA球隊 - 位置", "狀態", proj, last, cur], ... ],   // 可撿的球員，W＝在 waiver 上
  PREV: { pr: {隊名: [9項名次, 不算AST名次]}, ls: {...}, cur: {...} } }   // PREV 是套用時網頁自己算的
```

- 有效的匯入資料會在載入時**原地取代** `DATA`、`MKT`（splice／delete＋assign），`ME` 換成匯入的隊名，`PREV` 換成套用前的名次
- `checkImport()` 會檢查格式：數據必須是 12 個數字、MKT 必須是 2 個數字（避免奇怪的內容被塞進畫面）
- 只存在使用者自己的瀏覽器；「還原內建資料」會刪掉 `lp-data`

---

## 4. 資料來源與抓取方法

Yahoo 聯盟頁面需要登入，所以資料是在**已登入 Yahoo 的瀏覽器**裡用 `fetch()` 抓的（Claude 的內建瀏覽器或 Claude in Chrome）。程式片段放在 `tools/fetch-snippets.js`。

### 4.0 一鍵更新（v8，`tools/yahoo-update.js`）

使用者在網頁按「↻ 更新資料」，用書籤或 console 在 Yahoo 聯盟頁面執行這支程式：

1. 抓 16 隊名單（`/nba/1031/{1..16}`）；IL／IL+ 都記成 `IL`；狀態 GTD／DTD／Q → `Q`，O／INJ／NA／SUSP → `O`
2. 依季前排名分頁抓 `S_PSR`（預測）、`S_S_2025`（上季總計）、`S_S_2026`（本季總計），一次 4 頁平行，直到所有被持有的球員都找到、而且至少抓滿 16 頁（前 400 名，FA 用），最多 32 頁；總計 ÷ GP 換成場均。沒被持有、至少有一種數據的球員存成 `FA`（`c[4]` 開頭是 W 的記成 waiver）
3. 抓 ESPN 預測（失敗就只用 Yahoo）
4. 預測＝Yahoo 和 ESPN 場均平均（**沒有 FantasyPros**，因為它不能從 Yahoo 頁面跨站抓）
5. 自己的隊伍用 team id 13 找（`MY_TEAM_ID`），所以改隊名也沒關係
6. 右下角視窗按「▶ 打開戰力表」→ 開 `league-power.html#import=<JSON>`，網頁確認後套用；或「複製結果」貼到網頁的框框

書籤是網頁把 `#yahoo-script`（build 時嵌入的 tools/yahoo-update.js）去掉整行註解後做成 `javascript:` 網址。**程式裡不能有行尾 `//` 註解**，也不能有 `</script`（build.py 會檢查後者）。

測試方式：用 Playwright 攔截 `basketball.fantasysports.yahoo.com`、ESPN、`afroisgood.github.io` 的請求回傳假資料，跑完整流程（v8 開發時這樣測過，還沒在真的 Yahoo 上跑過）。

### 4.1 Yahoo（名單、預測、上季數據、排名、持有率）

- 各隊名單：`/nba/1031/{1..16}`，表格 `table tbody tr`，第一個 `td` 是名單位置，`a.name` 是球員名
- 球員列表：`/nba/1031/players?status=ALL&pos=P&stat1=<STAT>&sort=OR&sdir=1&count=<0,25,50…>`
  - `stat1=S_PSR`：本季剩餘預測（Yahoo 的預測由 Rotowire 提供）
  - `stat1=S_S_2025`：2025-26 上季總計
  - 其他參數：`status=A`（可撿）、`fteam=<隊伍id>`（只看某隊）
  - **欄位 index**（`td` 文字）：`c[4]`=持有者或 waiver 狀態，`c[5]`=GP，`c[6]`=季前排名，`c[7]`=目前排名，`c[8]`=持有率%，`c[10]`=FGM/FGA，`c[12]`=FTM/FTA，`c[14]`=3PM，`c[15]`=PTS，`c[16]`=REB，`c[17]`=AST，`c[18]`=STL，`c[19]`=BLK，`c[20]`=TO
  - 數字有千分位逗號，要先去掉；`%` 用 `parseFloat`
- 搜尋球員：`?search=` 參數**無效**，要用 `fteam=` 篩隊伍再找

### 4.2 ESPN 預測

```
GET https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/2027/segments/0/leaguedefaults/1?view=kona_player_info
Header: X-Fantasy-Filter: {"players":{"limit":700,"sortDraftRanks":{"sortPriority":100,"sortAsc":true,"value":"STANDARD"}}}
```

- 取 `player.stats` 裡 `id === "102027"` 的那筆（季預測），`stats` 是**整季總計**
- stat id：`0`=PTS、`1`=BLK、`2`=STL、`3`=AST、`6`=REB、`11`=TO、`13`=FGM、`14`=FGA、`15`=FTM、`16`=FTA、`17`=3PM、`42`=GP
- 有些欄位會缺（undefined），要當 0 或 null 處理
- 從 Yahoo 分頁裡呼叫也能用（沒有 CORS 問題）

### 4.3 FantasyPros 共識預測

- `https://www.fantasypros.com/nba/projections/overall.php`（第一個 `table`，約 266 人）
- 欄位：PLAYER、PTS、REB、AST、BLK、STL、FG%、FT%、3PM、GP、MIN、TO（**整季總計，只有命中率沒有出手數**）
- `ros-overall.php` 開季前顯示「Projections are not available yet」

### 4.4 三家合併規則

- 名字比對：去重音符號、轉小寫、去標點、去掉 Jr/Sr/II/III/IV。特例：Yahoo 的 `N. Alexander-Walker` 對應 `Nickeil Alexander-Walker`
- FantasyPros 沒有出手數：用 Yahoo 和 ESPN 的 FGA、FTA 平均，再乘上 FantasyPros 的命中率
- 三家場均取平均；某家沒有就用其他家
- Hashtag Basketball 免費版只有前 30 名，**沒有使用**

---

## 5. 演算法

### 5.1 球隊數據與排名（聯盟表、VS、交易模擬共用）

1. 每隊把非 IL 球員的**場均**加總；FG%＝總 FGM／總 FGA，FT% 同理
2. 9 項各自排 1–16 名，**TO 越少名次越前**
3. 綜合名次＝9 項名次平均再排序；放棄助攻模式＝不算 AST 的 8 項平均
4. 這套算法**不考慮出賽場次**，2 換 1 會因為少一個人讓累積數據下降

### 5.2 球員價值（z 分數）

- 母體：全聯盟所有非 IL 被持有球員（依目前數據來源）
- FG、FT 用影響力：`fgm − 聯盟FG% × fga`
- 每項 `z = (x − 平均) / 標準差`，TO 取負號
- 價值＝9 項 z 加總；放棄助攻模式不算 AST
- **交易分析器**裡的價值會乘上 `min(gp, 72) / 72`，依出賽場次打折；**各隊表的血條沒有打折**

### 5.3 市場價值（交易公平度）

```
排名分 = 100 × exp(−(季前排名 − 1) / 70)
市場價值 = 0.7 × 排名分 + 0.3 × 持有率
打包價值 = Σ 市場價值^1.4      ← 讓單一好球員比多個普通球員值錢
公平度（對方角度）= 你送出的打包價值 / 你換回的打包價值
```

- ≥ 105%：對方帳面賺；95–105%：公平；< 95%：對方帳面虧

### 5.4 成交機率

- 公平度分數：≥1.05 → 2、≥0.95 → 1.5、≥0.8 → 0.5、其他 → −1
- 加上對方名次變化：變好 +1、掉超過 1 名 −1
- 總分 ≥2.5 → 高；≥1.5 → 中；其他 → 低

### 5.5 交易模擬細節

- **名單位只算非 IL 球員**：送出 IL 球員不會空出正式名單位
- 你收到的人比送出的多：自動釋出你隊上價值最低的非 IL 球員
- 你送出的人比收到的多：可選擇空位補 FA（`FA` 物件；內建只有 Matisse Thybulle、Isaiah Joe，匯入的資料會整個換成匯入的 FA 清單）；選單用 `faList()` 依目前數據來源的價值排序，沒數據的不列；對方也會自動釋出價值最低的人
- **2 換 1 補 FA 時**，比較基準改成「不交易、只用價值最低的人換撿該 FA」，這樣名次變化只反映交易本身

### 5.6 自動找交易（AUTO SCOUT）

- 類型：1 換 1、2 換 1（空位補「名單空位補 FA」選的人，沒選就補價值最高的 FA，見 `scoutFill()`）或兩種都找
- 對象：其他 15 隊所有非 IL 球員
- 篩選：公平度 0.95–1.6；對方名次不會掉超過 1 名；你的平均名次要進步 > 0.05
- 排序：你的平均名次提升，相同時比數據價值淨增；顯示前 8 名，可「套用」到分析器
- 用 `await setTimeout(0)` 分段跑，避免畫面卡住，全部掃完約 3 秒

---

## 6. 介面功能（第 7 版）

風格：**90 年代掌機運動遊戲**，四階柔和抹茶綠螢幕、像素字、掌機外框、A/B 鍵。字型 Press Start 2P（英文標題）＋ DotGothic16（中文和數字），都從 Google Fonts 載入。

| 區塊 | 功能 |
|---|---|
| 開機畫面 | 「PRESS START」約 1.4 秒，點擊或按鍵跳過；每個瀏覽器工作階段只出現一次；減少動態效果設定下不顯示 |
| 資料更新 | 標題下方顯示資料日期；「↻ 更新資料」打開說明面板：書籤、複製更新程式、貼上套用、還原內建資料 |
| 控制列 | 數據來源（三家預測／上季實際／本季實際，本季實際只在匯入的資料有本季數據時出現）、模式（9 項全算／放棄助攻） |
| VS MODE | 選對手，9 項雙向血條比較，♛ 標贏家，預測比分 |
| TRADE MACHINE | 手動交易分析：最多 3 換 3、補 FA、公平度量表、成交機率、雙方各項名次變化 |
| AUTO SCOUT | 自動找交易 |
| 聯盟排名表 | 可排序；♛ 前 3、☠ 後 3；四階熱度色塊；▲▼ 名次變化；8×8 像素隊徽 |
| 各隊球員 | 選單一次顯示一隊（預設石）；球員價值血條；IL 劃線；球隊加總與排名 |

- localStorage 鍵：`lp-state2`（數據來源、模式、選的球隊、VS 對手）、`lp-data`（匯入的資料）；sessionStorage 鍵：`lp-splash`
- `PREV`（app.js）存的是**上一次更新的名次**，用來畫 ▲▼。目前的基準是 10/9 waiver 後、交易前
- 隊徽在 app.js 的 `EMB`，每隊 8 行 8 字元的 0/1 字串；新隊名要記得加（匯入的資料如果有隊伍改名，那隊會沒有隊徽）

---

## 7. 開發歷程

| 版本 | 內容 |
|---|---|
| v1 | 第一版戰力表：16 隊九項場均、球隊加總與排名；可切換預測／上季、石含或不含 waiver 申請 |
| v2 | 10/9 waiver 處理後更新名單（9 位新球員重抓三家預測）；Oubre、Merrill 申請成功，移除名單切換 |
| v3 | 石完成交易：送出 Şengün＋Fox 給「大小小丑與他的歡樂同伴們」，換回 Kyrie Irving＋Tyler Herro；坂木改隊名 |
| v4 | 改成 90 年代掌機風格（原本是 Barlow Condensed＋藍色主色的一般儀表板） |
| v5 | 顏色調柔和：螢幕從亮螢光綠 `#9bbc0f` 改成抹茶綠 `#c9d2a8`，外殼改淺暖灰 |
| v6 | 一次加入 10 項優化：VS 對戰預測、放棄助攻模式、選單選隊、球員價值血條、字體放大到 16px、名次熱度、▲▼、像素隊徽、LCD 格紋、開機畫面 |
| v7 | 交易分析器＋自動找交易；修正 IL 球員佔名單位的誤判、2 換 1 比較基準 |
| v8 | 網頁內一鍵更新資料：書籤／console 在 Yahoo 頁面抓名單和數據，自動帶回網頁套用；新增「2026-27 本季實際」數據來源；FA 補位改成完整 FA 清單，自動找交易的 2 換 1 不再固定補 Thybulle |

Artifact 網址：https://claude.ai/artifact/S6yNHmWyFfDDAvJ3guEij2

---

## 8. 石的隊伍現況（2026-10-09）

- 名單：Edwards、Nesmith、Kyrie、Herbert Jones、Gui Santos、AD、Embiid、Sarr、Gafford、Herro、Keldon Johnson、Oubre、Merrill；IL：Jimmy Butler III
- 預測排名：綜合第 3、不算助攻第 1
- 各項名次：FG% 7、FT% 3、3PM 5、PTS 4、REB 8、AST 16（放棄）、STL 11、BLK 4、TO 3
- 下一步建議：丟 Gui Santos 撿 Matisse Thybulle 補抄截；開季 2–3 週後用實際數據重算

---

## 9. 已知限制

1. **內建資料是靜態快照**。網頁內更新的資料只存在使用者自己的瀏覽器，要讓網站本身更新，得把結果寫進 `src/data.js`、`src/market.js` 再 build
2. 聯盟表的名次算法不考慮出賽場次（Embiid 預測只打 54 場也照算）
3. 季前排名開季後會失效，要換成 Yahoo「目前排名」（`c[7]`）
4. 成交機率只是參考，沒辦法算到對方的個人喜好
5. 上季實際數據模式下，新秀和上季缺賽的球員沒有數據（例如 Kyrie），會低估這些隊伍
6. 內建資料的 FA 只有 Thybulle、Isaiah Joe 兩人（寫死在 trade.js）；從 Yahoo 更新後才有完整 FA 清單（季前排名前 400 名裡沒被持有的球員）
7. 網頁內更新的預測只有 Yahoo＋ESPN 兩家；開季後 Yahoo 的 `S_PSR` 是「剩餘賽季」預測，GP 會變少，交易分析器的出賽場次打折會跟著變大

---

## 10. 給 Claude Code 的建議待辦

1. ~~資料更新腳本~~（v8 改成網頁內更新）；還可以做：把匯入的 JSON 轉回 `data.js`、`market.js` 的小工具，讓網站本身的內建資料也能更新
2. **把資料改成 JSON 檔**（例如 `data/rosters.json`），build 時再嵌入，比較好維護
3. ~~開季後加入「本季實際」數據來源~~（v8 完成，用 `S_S_2026` 本季總計 ÷ GP）
4. ~~FA 清單動態化~~（v8 完成：更新程式從 `status=ALL` 的分頁裡挑出沒被持有的球員）
5. **名次算法加權出賽場次**（可做成選項）
6. **加測試**：用固定資料驗證 `compute()`、`rankAll()`、`judge()` 的結果
