#!/usr/bin/env bash
# 生产构建。
#
# 为什么要有这个脚本，而不是直接 hugo --minify：
# themes/reimu/static/resources 是主题预打包好的 31 个 npm 包（11.2 MB），
# 是留给「不用 CDN、改自托管」的站点用的。本站前端库全部走 npm.webcache.cn，
# 产出里【没有任何页面引用 /resources/】—— 它占 public/ 的 82%，纯死重。
#
# 试过用 [[module.mounts]] + files 排除，走不通：
#   ① 只要声明了 module.mounts，该组件的默认挂载就被顶掉，
#      项目自己的 static/ 会整个消失（_headers、images/、avatar/ 全丢，实测过）；
#   ② 就算补回项目挂载，theme = 'reimu' 下 Hugo 仍会自动挂载主题的 static，
#      显式挂载里的排除规则对它无效，产出零变化。
# 所以放在构建之后删。仓库里保留原始文件，将来想切自托管还能用（见 DEPLOY 文档）。
#
# Cloudflare Pages 的构建命令填：bash scripts/build.sh
set -euo pipefail
cd "$(dirname "$0")/.."

HUGO_BIN="${HUGO_BIN:-hugo}"
"$HUGO_BIN" --minify --cleanDestinationDir

rm -rf public/resources
echo "== 已剔除 public/resources（主题自托管资源包，无人引用）=="
echo "== 产出大小：$(du -sh public 2>/dev/null | cut -f1) =="
