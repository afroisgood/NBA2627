# CLAUDE.md

這是 Yahoo Fantasy Basketball 聯盟「杰西卡的AI實驗室」（ID 1031）的戰力表網頁。完整背景、資料來源、演算法和歷程都在 **DEVLOG.md**，動手前先讀它。

## 使用者
- 一律用**繁體中文**回覆，介面文字也用繁體中文
- 使用者沒有寫程式經驗：說明要白話，指令要能直接複製貼上
- 隊伍是「石」，打法是放棄助攻（Punt AST）

## 開發
- 原始碼在 `src/`，建置：`python3 build.py` → `dist/league-power.html`（直接用瀏覽器打開）
- JS 順序：data.js → market.js → app.js → trade.js；`initTrade(); render();` 必須留在 trade.js 最後
- 數據陣列格式：`[gp, fgm, fga, ftm, fta, tpm, pts, reb, ast, stl, blk, to]`（場均）
- IL 球員不計入球隊數據、不佔名單位
- 保持 90 年代掌機風格：顏色只用 layout.html `:root` 裡的 token

## 驗證
- 改完跑 `python3 build.py`，再用瀏覽器打開 `dist/league-power.html`，確認 console 沒有錯誤、手機寬度（400px）沒有橫向捲動
