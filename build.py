#!/usr/bin/env python3
"""把 src/ 的檔案組成兩個 HTML：
- dist/league-power.html          → 完整獨立網頁（可直接用瀏覽器打開）
- dist/league-power.artifact.html → 發布到 Claude Artifact 用（不含 <html>/<head> 外殼）
- league-power.html（根目錄）       → GitHub Pages 顯示的網頁，和 dist/league-power.html 相同
兩個完整網頁都會先載入 data/latest.js（網站共用資料，window.SHARED_DATA），Artifact 版不載入。
"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
body = (src / "layout.html").read_text(encoding="utf-8")
js = "".join((src / f).read_text(encoding="utf-8") for f in ["data.js", "market.js", "import.js", "model.js", "app.js", "trade.js", "cards.js", "fa.js"])
# 更新程式（tools/yahoo-update.js）原樣放進網頁，給「複製更新程式」和書籤用
upd = (root / "tools" / "yahoo-update.js").read_text(encoding="utf-8")
assert "</script" not in upd.lower()
artifact = f"{body}\n<script type=\"text/plain\" id=\"yahoo-script\">\n{upd}</script>\n<script>\n{js}</script>\n"
def standalone(shared):
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
</head>
<body>
<script src="{shared}"></script>
{artifact}
</body>
</html>
"""
dist = root / "dist"; dist.mkdir(exist_ok=True)
(dist / "league-power.artifact.html").write_text(artifact, encoding="utf-8")
(dist / "league-power.html").write_text(standalone("../data/latest.js"), encoding="utf-8")
(root / "league-power.html").write_text(standalone("data/latest.js"), encoding="utf-8")
print("built:", [p.name for p in dist.iterdir()])
