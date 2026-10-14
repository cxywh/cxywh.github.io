/**
 * 双作者切换的回归测试
 * ------------------------------------------------------------------
 * 跑法：
 *   cd <仓库根>
 *   npm install jsdom --no-save
 *   hugo --minify                       # 先构建，测试读的是 public/index.html
 *   node tests/author-switch.test.js
 *
 * 覆盖的重点是「#header 里不止一张图」这个坑：
 * 妹妹的四张副标题图也躺在 #header 里面，主题还塞了若干 visibility:hidden 的占位图。
 * 换头图的代码一旦用 querySelectorAll('#header img') 通配，就会把副标题图
 * 全部覆盖成头图（曾经真的这么坏过）。这里把这条钉死。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'public', 'index.html');
const JS = path.join(ROOT, 'assets', 'js', 'author-switch.js');

if (!fs.existsSync(HTML)) {
  console.error('找不到 public/index.html，请先跑 hugo --minify');
  process.exit(2);
}

// 页面上还有主题自己的内联脚本（aosInit / setupFirework 之类），它们依赖 CDN 上的库，
// 测试环境不加载 CDN，必然抛「AOS is not defined」。那和本次要测的东西无关，屏蔽掉，
// 否则 jsdom 会把页面的未捕获异常抛回 Node，直接带崩测试进程。
const virtualConsole = new VirtualConsole();
// jsdom 不支持真的跳转，遇到 location.href=... 会抛一条 "Not implemented: navigation"。
// 这不算错误，反而是我们要断言的行为（文章页切作者应当跳走），所以单独收起来。
const NAV_ATTEMPTS = [];
virtualConsole.on('jsdomError', (e) => {
  if (e && /navigation/i.test(String(e.message))) NAV_ATTEMPTS.push(String(e.message));
});
virtualConsole.on('error', () => {});
virtualConsole.on('warn', () => {});
virtualConsole.on('info', () => {});
virtualConsole.on('log', () => {});

const dom = new JSDOM(fs.readFileSync(HTML, 'utf8'), {
  url: 'https://blog.cxywh.cn/',
  runScripts: 'dangerously', // 只让内联的 window.__BLOG_AUTHORS__ 执行
  virtualConsole,
});
const { window } = dom;
const doc = window.document;

const EXPECTED = {
  home: '/images/shouye.png',
  archives: '/images/guidang.png',
  about: '/images/guanyu.png',
  friend: '/images/youlian.png',
};

let failures = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`      实际: ${JSON.stringify(actual)}\n      期望: ${JSON.stringify(expected)}`);
}

const subtitleImgs = () => Array.from(doc.querySelectorAll('.subtitle-img'));
const subtitleSrcs = () => subtitleImgs().map((i) => i.getAttribute('src'));
const activePages = () =>
  subtitleImgs().filter((i) => i.classList.contains('is-active')).map((i) => i.dataset.page);
const bannerSrc = () => {
  const el = doc.querySelector('#header img[fetchpriority="high"]');
  return el ? el.getAttribute('src') : null;
};
const sidebarName = () => doc.querySelector('.sidebar-author-name').textContent;
const titleDisplay = (k) => doc.querySelector(`.author-title[data-author="${k}"]`).style.display;
const click = (sel) => doc.querySelector(sel).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

// 罗辑的副标题文字是逐页不同的，键是页面路径。文章详情页没有配置，应保持模板默认文案。
const PAGE_CASES = [
  { file: 'public/index.html', url: 'https://blog.cxywh.cn/', text: 'Rick:Hey...hey,morty,press...press...uh..up,up,down,down!' },
  { file: 'public/archives/index.html', url: 'https://blog.cxywh.cn/archives/', text: 'Morty:Ri...rick? A..are you ok?' },
  { file: 'public/about/index.html', url: 'https://blog.cxywh.cn/about/', text: 'Rick:Do it! morty! just do it!' },
  { file: 'public/friend/index.html', url: 'https://blog.cxywh.cn/friend/', text: 'Morty:Ok...rick..ok..' },
  { file: 'public/post/luoji-hello/index.html', url: 'https://blog.cxywh.cn/post/luoji-hello/', text: '记录一些日常' },
];

/** 单独起一个页面环境，等它就绪后跑一遍脚本，返回 document */
async function bootPage(file, url) {
  const d = new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf8'), {
    url,
    runScripts: 'dangerously',
    virtualConsole,
  });
  const w = d.window;
  // jsdom 构造完文档常常还停在 loading，脚本自己会挂 DOMContentLoaded，
  // 这里等它走到 complete 再注入，行为就和浏览器里 defer 脚本一致了。
  if (w.document.readyState === 'loading') {
    await new Promise((res) => w.addEventListener('load', res, { once: true }));
  }
  w.eval(fs.readFileSync(JS, 'utf8'));
  return w.document;
}

async function checkSubtitlePerPage() {
  console.log('\n--- 5. 罗辑：逐页副标题文字 ---');
  for (const c of PAGE_CASES) {
    let pageDoc;
    try {
      pageDoc = await bootPage(c.file, c.url);
    } catch (e) {
      failures++;
      console.log(`FAIL  ${c.url}  打开失败: ${e.message}`);
      continue;
    }
    const el = pageDoc.querySelector('.author-subtitle[data-author="luoji"]');
    check(`${c.url} 的副标题文字`, el ? el.textContent : '(找不到元素)', c.text);

    // 顺带确认这些页面里妹妹的四张图也没被动过
    const srcs = Array.from(pageDoc.querySelectorAll('.subtitle-img')).map((i) => i.getAttribute('src'));
    check(`  ${c.url} 副标题图未被误改`, JSON.stringify(srcs), JSON.stringify(Object.values(EXPECTED)));
  }
}

/* ------------------------------------------------------------------
 * 第 6 组：算上主题 CSS 之后的真实可见性
 *
 * 这一组是被现实打脸补上的：之前所有断言都只查 DOM 属性，
 * 没有一条经过 CSS 层叠。而主题的 `#header img` 是 ID 选择器（特异性 101），
 * 会把 `.subtitle-img { display:none }`（特异性 10）压掉，
 * 于是妹妹的四张副标题图在罗辑页面上也照样显示。
 * 所以这里把真实的主题 CSS + 本站 CSS 一起注进去，查 getComputedStyle。
 * ------------------------------------------------------------------ */
function loadAllCss() {
  const dir = path.join(ROOT, 'public', 'css');
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n');
}
const CSS_ALL = loadAllCss();

async function bootWithCss(file, url) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf8'), {
    url, runScripts: 'dangerously', virtualConsole,
  });
  const w = dom.window;
  const style = w.document.createElement('style');
  style.textContent = CSS_ALL;
  w.document.head.appendChild(style);
  if (w.document.readyState === 'loading') {
    await new Promise((r) => w.addEventListener('load', r, { once: true }));
  }
  w.eval(fs.readFileSync(JS, 'utf8'));
  return w;
}

const dispOf = (w, el) => w.getComputedStyle(el).display;

async function checkComputedVisibility() {
  console.log('\n--- 6. 算上主题 CSS 后，副标题图到底显不显示 ---');

  // 罗辑（默认身份）
  let w = await bootWithCss('public/index.html', 'https://blog.cxywh.cn/');
  let d = w.document;
  let vis = Array.from(d.querySelectorAll('.subtitle-img'))
    .map((i) => `${i.dataset.page}=${dispOf(w, i)}`);
  check('罗辑页面：四张副标题图全部不显示', vis.join(' '), 'home=none archives=none about=none friend=none');
  check('罗辑页面：妹妹副标题块整体隐藏', dispOf(w, d.querySelector('#subtitle-meimei')), 'none');

  // 切到妹妹
  const btn = d.querySelector('.author-switch-btn[data-author="meimei"]')
    || Array.from(d.querySelectorAll('.author-switch-btn')).find((b) => b.dataset.author === 'meimei');
  if (!btn) {
    failures++;
    console.log('FAIL  找不到切到妹妹的按钮');
  } else {
    btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    vis = Array.from(d.querySelectorAll('.subtitle-img'))
      .map((i) => `${i.dataset.page}=${dispOf(w, i)}`);
    check('妹妹页面：只有 home 那张显示', vis.join(' '), 'home=inline-block archives=none about=none friend=none');
    check('妹妹页面：妹妹副标题块显示', dispOf(w, d.querySelector('#subtitle-meimei')), 'block');
    // 主题那套"背景图"属性必须被顶掉，否则图会铺满页头
    const first = d.querySelector('.subtitle-img');
    const cs = w.getComputedStyle(first);
    check('副标题图没被当背景图（position）', cs.position, 'static');
    check('副标题图没被当背景图（z-index）', cs.zIndex, 'auto');
    check('副标题图没被当背景图（width）', cs.width !== '100%', true);
  }

  // 归档页也要确认
  w = await bootWithCss('public/archives/index.html', 'https://blog.cxywh.cn/archives/');
  d = w.document;
  vis = Array.from(d.querySelectorAll('.subtitle-img')).map((i) => `${i.dataset.page}=${dispOf(w, i)}`);
  check('罗辑归档页：四张也全不显示', vis.join(' '), 'home=none archives=none about=none friend=none');
}

/* ------------------------------------------------------------------
 * 第 7 组：文章详情页切作者不能留下"只有标题没有内容"的死胡同
 *
 * 单篇文章按 data-author 归属，切到另一个作者时那篇会被隐藏。
 * 以前的行为是原地隐藏，页面上只剩页头那个标题、正文全空，且没有出口。
 * 现在的行为：这种页面直接跳回首页（首页已经按新作者过滤好）。
 * ------------------------------------------------------------------ */
async function checkPostPageSwitch() {
  console.log('\n--- 7. 文章详情页切作者 ---');

  // 先确认这确实是一篇"单篇、有归属、非关于页"的文章
  let w = await bootWithCss('public/post/luoji-hello/index.html', 'https://blog.cxywh.cn/post/luoji-hello/');
  let d = w.document;
  const arts = d.querySelectorAll('article.h-entry');
  check('文章页只有一篇 h-entry', arts.length, 1);
  check('文章带 data-author', arts[0].getAttribute('data-author'), 'luoji');
  check('文章页初始可见（罗辑自己）', w.getComputedStyle(arts[0]).display !== 'none', true);

  // 切到妹妹：应当发生跳转，而不是留在原地把正文隐藏掉
  const before = NAV_ATTEMPTS.length;
  const btn = Array.from(d.querySelectorAll('.author-switch-btn'))
    .find((b) => b.getAttribute('data-author') === 'meimei');
  if (!btn) {
    failures++;
    console.log('FAIL  文章页找不到切到妹妹的按钮');
  } else {
    btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    check('切到妹妹时发起了跳转（而不是原地空白）', NAV_ATTEMPTS.length > before, true);
    // jsdom 的 location 是不可重定义的【unforgeable】属性，跳转消息里也不带目标地址，
    // 所以「跳到哪」没法行为化断言。改成两条合起来钉：
    //   ① 行为上：没有走"原地隐藏正文"的老路（正文仍然可见，说明在 render 之前就 return 了）
    //   ② 源码上：跳转目标写的是首页
    check('没有原地把正文隐藏掉（说明走的是跳转分支）',
      w.getComputedStyle(arts[0]).display !== 'none', true);
    const jsSrc = fs.readFileSync(JS, 'utf8');
    check('跳转目标写的是首页', /window\.location\.href\s*=\s*'\/'/.test(jsSrc), true);
  }

  // 首页上切作者不该跳转，应当原地换内容
  let w2 = await bootWithCss('public/index.html', 'https://blog.cxywh.cn/');
  const before2 = NAV_ATTEMPTS.length;
  const btn2 = Array.from(w2.document.querySelectorAll('.author-switch-btn'))
    .find((b) => b.getAttribute('data-author') === 'meimei');
  btn2.dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
  check('首页切作者不跳转', NAV_ATTEMPTS.length, before2);

  // 回归：文章页在同一作者内点击（点自己）也不该跳转
  let w3 = await bootWithCss('public/post/luoji-hello/index.html', 'https://blog.cxywh.cn/post/luoji-hello/');
  const before3 = NAV_ATTEMPTS.length;
  const self = Array.from(w3.document.querySelectorAll('.author-switch-btn'))
    .find((b) => b.getAttribute('data-author') === 'luoji');
  self.dispatchEvent(new w3.MouseEvent('click', { bubbles: true }));
  check('点当前作者自己不跳转', NAV_ATTEMPTS.length, before3);
}

async function run() {
  check('window.__BLOG_AUTHORS__ 已注入', typeof window.__BLOG_AUTHORS__, 'object');

  // 源 HTML 里的四张副标题图
  check('四张副标题图', subtitleImgs().length, 4);
  subtitleImgs().forEach((img) =>
    check(`  data-page=${img.dataset.page} 的 src`, img.getAttribute('src'), EXPECTED[img.dataset.page])
  );

  // document.cookie 读取时不回显 SameSite，拦截 setter 才能验证
  const cookieWrites = [];
  Object.defineProperty(doc, 'cookie', {
    configurable: true,
    get() {
      return cookieWrites.map((c) => c.split(';')[0]).join('; ');
    },
    set(v) {
      cookieWrites.push(v);
    },
  });

  try {
    window.eval(fs.readFileSync(JS, 'utf8'));
  } catch (e) {
    failures++;
    console.log('FAIL  脚本抛异常:', e && e.message);
  }

  // 默认作者
  check('侧边栏名字', sidebarName(), '罗辑');
  check('body 带 author-luoji', doc.body.classList.contains('author-luoji'), true);
  check('罗辑时副标题图都不激活', JSON.stringify(activePages()), '[]');
  check('★ 副标题图未被头图覆盖', JSON.stringify(subtitleSrcs()), JSON.stringify(Object.values(EXPECTED)));

  // 切到妹妹
  click('.author-switch-btn[data-author="meimei"]');
  check('侧边栏名字变妹妹', sidebarName(), '妹妹');
  check('body 带 author-meimei', doc.body.classList.contains('author-meimei'), true);
  check('body 不再带 author-luoji', doc.body.classList.contains('author-luoji'), false);
  check('头图指向妹妹的 banner', bannerSrc(), '/images/banner.webp');
  check('主题色 --red-0 变粉', doc.documentElement.style.getPropertyValue('--red-0'), '#e87d9e');
  check('罗辑标题隐藏', titleDisplay('luoji'), 'none');
  check('妹妹标题显示', titleDisplay('meimei'), '');
  check('is-active 只有 home 那张', JSON.stringify(activePages()), JSON.stringify(['home']));
  check('★ 切换后副标题图仍未被改', JSON.stringify(subtitleSrcs()), JSON.stringify(Object.values(EXPECTED)));

  // 切回
  click('.author-switch-btn[data-author="luoji"]');
  check('切回侧边栏名字', sidebarName(), '罗辑');
  check('cookie 写了两条 path 与 SameSite 正确', 
    cookieWrites.length === 2 && cookieWrites.every((c) => c.includes('SameSite=Lax') && c.includes('path=/')),
    true);

  await checkSubtitlePerPage();
  await checkComputedVisibility();
  await checkPostPageSwitch();

  console.log(failures === 0 ? '\n全部通过' : `\n${failures} 项失败`);
  process.exit(failures === 0 ? 0 : 1);
}

if (doc.readyState === 'loading') {
  window.addEventListener('load', run, { once: true });
} else {
  run();
}
