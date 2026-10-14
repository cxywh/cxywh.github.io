# 博客接入 cxywh.cn —— 部署与维护说明

---

## 一、本次重构做了什么

按**可维护性 / 可拓展性 / 安全性 / 速度与性能**四条整理。

### 可维护性

| 之前 | 现在 |
|---|---|
| `"luoji"` 硬编码在 **11 个模板 + JS** 里，加第三作者要改十几处 | 全部收敛到 **`data/authors.yml`**：`grep -rn "luoji\|meimei" layouts/ config/` = **0 处** |
| 作者信息在模板、JS、两套 `covers-*.yml` 里各存一份 | 删掉 `covers-luoji.yml` / `covers-meimei.yml`，封面池并入 `authors.yml`，单一真源 |
| 侧边栏统计码重复 4 段 | `commonBar.html` 合并成一个循环 |
| 图标尺寸 / 彩蛋卡片等样式散在 JS 里靠 `el.style.xxx` 堆 | 全部搬进 `author-switch.css`，改样式不用翻 JS |
| 没有测试 | `tests/author-switch.test.js`，**47 项断言** |

### 可拓展性

加一个作者只需在 `data/authors.yml` 里加一段（名字 / 头像 / 配色 / 封面池 / 每页文案 / 挂件），
模板与前端脚本都从这份数据读，不用改代码。
`assets/js/author-switch.js` 里的 `TOGGLEABLE` 数组加一个选择器，就能让新的一类元素也跟随作者切换。

### 安全性

- `static/_headers`：CSP、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`X-Frame-Options`、`frame-ancestors`、`object-src 'none'`
- Cookie 带 `SameSite=Lax` + `path=/`，第三方页面读不到也带不上
- `robots.txt` 默认 **Disallow: /**（站内有真人照片）
- **不给自己加 `integrity`**：同源资源有文件名指纹已足够，而 `integrity` 一旦校验失败，浏览器会**静默丢弃**整个文件；本机装了代理或改写流量的工具时，这是个极难排查的故障点。实测主题自己那几条 `integrity` 是**空值**（等于没校验），全站真正会挂的只有我自己加的那些，已去掉。

### 速度与性能

| 项 | 处理 |
|---|---|
| KaTeX | **关闭**。原来 16 页里有 11 页加载 277KB 的 `katex.min.js` + CSS，而站内一个公式都没有 |
| 不蒜子 | 关闭（统计的是全网使用量、不是本站数据，且要发外部请求） |
| 鼠标烟花 | 移动端关闭 |
| `author-switch.css/js` | 走 Hugo Pipes：压缩 + sha256 指纹，可永久缓存 |
| 产出体积 | **13.69 MB → 2.48 MB**，见第五节 |

---

## 二、部署

### Cloudflare Pages（推荐）

| 配置项 | 值 |
|---|---|
| 框架预设 | Hugo |
| 构建命令 | `bash scripts/build.sh` |
| 输出目录 | `public` |
| 环境变量 | `HUGO_VERSION` = `0.168.0` |

然后 Pages 项目 → 自定义域 → 填 `blog.cxywh.cn`，DNS 记录由它自动添加。
**不要在 DNS 页面手写这条记录**，容易把 SSL 配成"灵活"，导致重定向死循环。

国内访问比 GitHub Pages 快、带宽无限、SSL 自动、push 即重建。

### 保留 GitHub Pages

仓库 Settings → Pages → Custom domain 填 `blog.cxywh.cn`，GitHub 会生成 `CNAME` 文件；DNS 侧加：

| 类型 | 名称 | 内容 | 代理 |
|---|---|---|---|
| CNAME | `blog` | `cxywh.github.io` | **灰（关橙云）** |

**必须关橙云**，否则 GitHub 的证书签发校验会失败，会一直卡在"证书正在申请中"。

### 本地

```bash
hugo server -D          # 带草稿，热重载，http://localhost:1313
bash scripts/build.sh   # 生产构建（含剔除死重）
```

---

## 三、回归测试

双作者切换有一份 jsdom 测试，**读的是真实构建产物**。它钉住的是几个真的踩过的坑：

- `#header` 里不止一张图——妹妹的四张副标题图也在里面，用 `querySelectorAll('#header img')` 通配会把它们全改成头图
- 主题的 `#header img` 是 **ID 选择器（特异性 101）**，`.subtitle-img { display: none }` 只有 10，**不加 `!important` 必被压掉**，四张图会在所有页面显示
- 同一个层叠问题还会把图片渲染成 `position:absolute / width:100% / z-index:-2 / 带渐隐遮罩` 的"铺满页头的背景图"
- 文章详情页切到非作者本人时，不能原地把正文隐藏掉、留下"只有标题没有内容"的死胡同

```bash
npm install jsdom --no-save
bash scripts/build.sh
node tests/author-switch.test.js      # 47 项断言，全过则退出码 0
```

**第 6 组断言会加载真实主题 CSS 并检查 `getComputedStyle`**——只查 DOM 属性是抓不到层叠问题的，
之前就是这么漏掉的。改这块 CSS 后务必跑一遍。

---

## 四、上游主题的坑（已在本仓库绕过）

| 坑 | 处理 |
|---|---|
| `head.html` 无条件加载 katex 的 CSS，不跟随 `math.katex.enable`（JS 是跟随的） | 覆写 `layouts/partials/helpers/cdnCss.html` 补判断。**升级主题后要重新核对上游是否已修** |
| `resources.Get` 读不到 `static/` 下的文件 | `author-switch.css/js` 放在 `assets/`，否则 Hugo Pipes 不生效 |
| 主题自己的 `integrity` 是空值（`integrity crossorigin=anonymous`） | 无害（空值不校验），不动 |
| `languageCode`、`Site.Data`、`css.Sass` 等已被 Hugo 标记废弃 | 暂未处理，升级 Hugo 前要跟着改 |

---

## 五、产出体积：82% 是死重

`themes/reimu/static/resources` 预打包了 31 个 npm 包（11.2 MB：mermaid 2.62MB、mathjax 2.2MB、
gitalk 0.75MB、twikoo、instantsearch……），**是留给"不用 CDN、改自托管"的站点的**。
本站前端库全部走 `npm.webcache.cn`，产出 HTML 里引用 `/resources/` 的页面数 = **0**。

```
public/  13.69 MB  →  2.48 MB
         └ 11.21 MB 是 resources/（179 个文件，无人引用）
```

用 `[[module.mounts]]` + `files` 排除**走不通**，实测结论：

- 只要声明了 `module.mounts`，该组件的**默认挂载就被顶掉**，项目自己的 `static/` 整个消失（`_headers`、`images/`、`avatar/` 全丢）
- 补回项目挂载后，因为 `theme = 'reimu'` 下 Hugo **仍会自动挂载主题的 static**，显式挂载里的排除规则对它无效，产出**零变化**

所以放在构建脚本里删（`scripts/build.sh`），仓库里保留原始文件。

> ⚠️ 哪天把 `themes/reimu/data/vendor.yml` 的 `webcache|` 换成 `local|`（改自托管），
> 这些文件就会被真正引用，**必须去掉脚本里那句 `rm -rf public/resources`**。两者只能留一个。

### 可选：改成自托管（能摆脱 CDN）

主题已内置这个开关，`themes/reimu/data/vendor.yml` 顶部有：

```yaml
local: /resources/    # 本地资源路径
```

把各条 `src: webcache|包@版本/文件` 改成 `src: local|包@版本/文件` 即可。
**注意同时删掉对应的 `integrity` 行**，否则会拿本地文件和 CDN 的哈希比对。
（改之前先在项目根建 `data/vendor.yml` 覆盖主题那份，别直接改主题文件。）

**为什么值得做**：实测 `npm.webcache.cn` **不带 Referer 就返回 403**。
浏览器正常会带 Referer，但用 `file://` 直接打开产出时不带，那 6 个资源会集体 403 ——
`lazysizes` 一挂，所有 `class=lazyload` 的图片（封面、头像）就永远停在 `opacity:0`，
表现就是"图片都没加载"。自托管可以彻底消掉这个外部依赖。

---

## 六、域名分工

| 域名 | 内容 | 理由 |
|---|---|---|
| `cxywh.cn` | 项目索引 / 作品集 | 对外、可索引，给 HR 或合作方看 |
| `blog.cxywh.cn` | 「罗辑 & 妹妹」 | 私人生活记录，含真人照片，默认 noindex |

想让博客占根域：把 `hugo.toml` 的 `baseURL` 改成 `https://cxywh.cn/` 重新构建即可，其余不用动。

---

## 七、待补内容（需要你自己填）

| 文件 | 现状 |
|---|---|
| `content/post/luoji-hello.md` | `title: 'example'`，正文一句英文示例 |
| `content/post/meimei-hello.md` | 同上 |
| `content/about.md` | 「关于罗辑」「关于妹妹」正文都是 `example` |
| `content/friend.md` | 友链是 `example.com` |
| `data/authors.yml` | 封面池 5 张 / 人，标了待完善 |

> 已确认**不再是问题**：妹妹的头图 `/images/banner.webp` 来自主题 static 目录
> （`themes/reimu/static/images/banner.webp`），文件实际存在，切到妹妹不会裂图。
