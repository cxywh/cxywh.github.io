# 2026-05-06 博客项目日志

## 背景
为罗辑和妹妹搭建双作者切换的个人博客，基于 Hugo + hugo-theme-reimu 主题。
WSL 环境，国内网络（ghproxy.net 代理下载 GitHub 资源）。

## 技术要点
- Hugo v0.145.0
- 双作者隔离：前端 JS + Cookie 方案 + Hugo 模板双输出
- 侧边栏切换按钮：蓝点（罗辑）/粉点（妹妹）
- 作者字段：`author: luoji` 或 `author: meimei`，无 author 的文章需手动补

## 经验教训

### 1. 数据隔离要 Hugo 端做，别全靠前端
- 最初用前端隐藏/显示所有内容，但 sidebar-state（文章数/分类/标签统计）用的全局 `.Site.Taxonomies`，统计不分作者
- 归档页的 tag-wrap/category-wrap 同样遍历全局标签和分类
- **教训**：涉及统计数据的地方，必须在 Hugo 模板层面按 author 过滤后再输出，前端只管显示/隐藏
- 最终方案：遍历两遍，输出两套带 data-author 的 DOM，JS 切换显示

### 2. 内联样式与 CSS 优先级打架
- 对元素同时用内联 `style="display:none"` 和 CSS `!important` 时，!important 永远压 inline
- **教训**：控制显示隐藏的统一用 JS `el.style.setProperty('display', 'none', 'important')`，不要在 CSS 里写死了
- 特别是 flex 容器需要 `display:flex` 时，更要小心 inline 和 CSS 的冲突

### 3. Flex 布局不要嵌套多余容器
- 归档页的 `.tag-wrap`（本身 flex）里套了一个 `.author-tag-wrap`（也是 flex），外层的 flex 把内层当 flex-item 计算宽度，导致宽度只有 113px
- **教训**：flex 容器内直接放子项，不要多套一层容器来控制显示隐藏。直接把两个作者的项目都放在同一个 flex 容器里，用 data-author + display:none 控制

### 4. CSS 变量覆盖要打在根元素上
- 最开始用 `body.author-luoji { --red-0: #4a90d9; }` 覆盖，但主题在 `:root` 里定义的 `--red-0: #ff0000` 优先级更高
- **教训**：CSS 变量以层级靠前的定义为准。要在 `:root` 级覆盖，或者通过 JS 在 `document.documentElement.style.setProperty()` 设值（优先级最高）
- 最终方案：JS 切换作者时直接 `root.style.setProperty('--red-0', '#4a90d9')`

### 5. 头像路径双配置
- `params.yml` 的 avatar 字段 + `author-switch.js` 里 AUTHORS 对象中的 avatar 配置，两处都要改
- 忘了改 JS 里的硬编码，导致改了 params.yml 但页面还是旧头像
- **教训**：头像、banner、封面这些资源路径，一旦在 JS 里也写了，就形成了双配置源，两处都要更新。最好统一到一处

### 6. Banner 图片尺寸
- 主题要求 `#header { min-height: 400px; height: 35vh }`，图片 `width:100%; height:180%; object-fit:cover`
- 推荐宽幅图（≥ 2.5:1），主体内容居中，上下边缘会被裁切
- 1920×1080 的壁纸可用，但最好选主体偏中央的

### 7. 头像需要方形图
- 主题用圆形裁切（`border-radius: 50%`），宽幅图当头像会只显示中间一小块
- 最好准备正方形图片，或者提前居中裁剪

## 关键文件索引
- `config/_default/params.yml` - 站点全局配置（banner、avatar、social 等）
- `data/covers-luoji.yml` - 罗辑文章封面池
- `data/covers-meimei.yml` - 妹妹文章封面池
- `data/covers.yml` - 全局兜底封面池（无 author 文章）
- `static/js/author-switch.js` - 核心切换 JS（含 AUTHORS 对象配置）
- `static/css/author-switch.css` - 覆盖样式（含 CSS 变量重定义）
- `layouts/partials/post/nav.html` - 前后篇导航（按 author 过滤）
- `layouts/partials/sidebar/commonBar.html` - 侧边栏（含双输出 sidebar-state）
- `layouts/partials/archives.html` - 归档页（双输出标签/分类）
- `static/images/` - 各种图片资源（覆盖层、banner、头像等）
- `static/avatar/` - 头像目录

## 待办
- [ ] 妹妹板块的封面池 `covers-meimei.yml` 仍需完善

## 2026-05-07 修复/清理

### fix: tags页"查看更多"内容按作者隔离
- 问题：`/tags/` 页面是 Hugo 的 Taxonomy Terms 页面，用的是 `_default/terms.html`，不是 `_default/taxonomy.html`
- 之前只覆盖了 `taxonomy.html` 和 `archives.html`（partial），没覆盖 `terms.html`
- 修复：覆盖 `layouts/_default/terms.html`，改为调用 `partial `archives.html``
- `archives.html` 已按作者双输出标签（`archives-tag-luoji` + `archives-tag-meimei`），JS 自动过滤

### cleanup: 删除无用文件
- 删除 `static/images/10-orig.svg`（原始SVG备份）
- 删除 `static/images/10-trimmed.svg`（裁剪中间产物）
- 删除 `static/images/10-trim.js`（一次性裁剪脚本）
- 删除 `static/images/taichi.svg`（未引用的孤儿文件）
- 删除 `static/images/25.webp`（不在封面池中）
- 删除 `static/images/10.webp`（未引用）
- 删除 `static/avatar/meimei-reimu.svg` 和 `static/avatar/meimei.svg`（未引用）
- 删除所有 `:Zone.Identifier` Windows下载残留文件
