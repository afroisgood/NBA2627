#!/usr/bin/env python3
"""把 src/ 的檔案組成兩個 HTML：
- dist/league-power.html          → 完整獨立網頁（可直接用瀏覽器打開）
- dist/league-power.artifact.html → 發布到 Claude Artifact 用（不含 <html>/<head> 外殼）
"""
import pathlib
root = pathlib.Path(__file__).parent
src = root / "src"
body = (src / "layout.html").read_text(encoding="utf-8")
js = "".join((src / f).read_text(encoding="utf-8") for f in ["data.js", "market.js", "app.js", "trade.js"])
artifact = f"{body}\n<script>\n{js}</script>\n"
standalone = f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>body{{margin:0}}[hidden]{{display:none!important}}img{{max-width:100%}}</style>
</head>
<body>
{artifact}
</body>
</html>
"""
dist = root / "dist"; dist.mkdir(exist_ok=True)
(dist / "league-power.artifact.html").write_text(artifact, encoding="utf-8")
(dist / "league-power.html").write_text(standalone, encoding="utf-8")
print("built:", [p.name for p in dist.iterdir()])
