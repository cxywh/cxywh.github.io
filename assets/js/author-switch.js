/**
 * 双作者切换
 * ------------------------------------------------------------------
 * 本文件不保存任何作者信息。
 * 作者元数据（名字、头像、头图、配色、封面池、每页副标题……）全部来自
 * data/authors.yml，由 Hugo 注入到 window.__BLOG_AUTHORS__。加作者只改那一个文件。
 *
 * 与模板的约定：任何需要按作者隔离的元素，挂 data-author="<key>"。
 * 脚本只认这个属性，不认任何具体的作者名。
 * ------------------------------------------------------------------
 */
(function () {
  'use strict';

  var CFG = window.__BLOG_AUTHORS__ || {};
  var AUTHORS = CFG.authors || {};
  var KEYS = Object.keys(AUTHORS);
  if (!KEYS.length) return;            // 没有配置就别往下走

  var DEFAULT_KEY = AUTHORS[CFG.default] ? CFG.default : KEYS[0];
  var COOKIE_NAME = 'blog_author';
  var COOKIE_DAYS = 365;
  var ICON_IMG = '/images/10.svg';

  // 路径 -> 页面标识，用于选对应的副标题
  var PAGE_BY_PATH = { '': 'home', '/archives': 'archives', '/about': 'about', '/friend': 'friend' };

  // 需要按作者显示/隐藏的元素种类。
  // 以后新增一类「按作者区分」的元素，在这里加一个选择器就够了，
  // 不用再写一段 querySelectorAll + forEach。
  var TOGGLEABLE = [
    '.post-wrapper',
    '.about-author-content',
    '.author-title',
    '.author-subtitle',
    '.author-widget',
    '.archives-tag-list-item',
    '.archives-category-list-item'
  ];

  var current = DEFAULT_KEY;
  var initialized = false;

  /* ------------------------------------------------------------------
   * 小工具
   * ------------------------------------------------------------------ */

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? decodeURIComponent(m[2]) : null;
  }

  function writeCookie(name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 864e5);
      expires = '; expires=' + d.toUTCString();
    }
    // SameSite=Lax：只在本站导航时携带，第三方页面读不到也带不上
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; path=/' + expires + '; SameSite=Lax';
  }

  /** 读元素归属的作者，缺省归给默认作者 */
  function authorOf(el) {
    var key = el.getAttribute('data-author');
    return AUTHORS[key] ? key : DEFAULT_KEY;
  }

  /** 当前路径，'' 表示首页。副标题文字按它取 —— 键就是路径本身 */
  function pathOf() {
    return window.location.pathname.replace(/\/$/, '') || '';
  }

  /** 页面标识 home/archives/about/friend，用于选副标题图片。
      不在表里的页面（例如文章详情页）按原来的行为落到 home。 */
  function pageId() {
    return PAGE_BY_PATH[pathOf()] || 'home';
  }

  function show(el) { el.style.display = ''; }
  function hide(el) { el.style.display = 'none'; }

  /* ------------------------------------------------------------------
   * 按作者过滤 —— 全站唯一的筛选入口
   * ------------------------------------------------------------------ */

  function applyVisibility() {
    TOGGLEABLE.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (authorOf(el) === current) show(el); else hide(el);
      });
    });

    // 侧边栏统计条：显示时必须是 flex
    document.querySelectorAll('.author-state').forEach(function (el) {
      el.style.setProperty('display', authorOf(el) === current ? 'flex' : 'none', 'important');
    });

    // 文章详情页整篇按作者显示。
    // 「关于」这类页面内部自带 .about-author-content 做隔离，外层 article 不能一起隐藏。
    document.querySelectorAll('article.h-entry').forEach(function (el) {
      if (el.querySelector('.about-author-content')) return;
      if (authorOf(el) === current) show(el); else hide(el);
    });

    // 归档页：整段年份只有在还有可见条目时才显示
    document.querySelectorAll('.archives-wrap').forEach(function (section) {
      var anyVisible = false;
      section.querySelectorAll('.archive-article').forEach(function (item) {
        var visible = authorOf(item) === current;
        if (visible) { show(item); anyVisible = true; } else hide(item);
      });
      if (anyVisible) show(section); else hide(section);
    });
  }

  /* ------------------------------------------------------------------
   * 侧边栏
   * ------------------------------------------------------------------ */

  function applySidebar() {
    var a = AUTHORS[current];

    document.querySelectorAll('.sidebar-author img').forEach(function (img) {
      var src = '/avatar/' + a.avatar;
      img.setAttribute('data-src', src);
      img.setAttribute('alt', a.name);
      img.src = src;
    });

    document.querySelectorAll('.sidebar-author-name').forEach(function (el) {
      el.textContent = a.name;
    });

    document.querySelectorAll('.sidebar-description').forEach(function (el) {
      el.textContent = a.subtitle || a.name;
    });

    document.querySelectorAll('.author-switch-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-author') === current);
    });
  }

  /* ------------------------------------------------------------------
   * 主题色：变量表来自 authors.yml，这里只负责套用
   * ------------------------------------------------------------------ */

  function applyTheme() {
    var a = AUTHORS[current];
    var root = document.documentElement;

    Object.keys(a.theme_vars || {}).forEach(function (name) {
      root.style.setProperty(name, a.theme_vars[name]);
    });

    KEYS.forEach(function (k) { document.body.classList.remove('author-' + k); });
    document.body.classList.add('author-' + current);

    // cursor 为 default 表示不启用自定义光标，交回主题样式
    document.body.style.cursor = (a.cursor === 'default') ? 'auto' : '';
  }

  /* ------------------------------------------------------------------
   * 页面皮肤：头图、副标题、每页文案、图标
   * ------------------------------------------------------------------ */

  function applyPageSkin() {
    var a = AUTHORS[current];

    // 头图。文件缺失时保留原来那张，不留裂图。
    //
    // 注意：#header 里面不止头图，妹妹那四张副标题图（.subtitle-img）也在里面，
    // 主题还塞了若干 visibility:hidden 的占位图。原来用 querySelector 只取第一个
    // 正好命中头图，改成 querySelectorAll 会把副标题图一起覆盖成头图。
    // 这里用主题给真头图打的 fetchpriority="high" 标记来锁定，取不到时退回「只取第一张」。
    var bannerImgs = document.querySelectorAll('#header img[fetchpriority="high"]');
    if (!bannerImgs.length) {
      var firstImg = document.querySelector('#header img:not(.subtitle-img)');
      bannerImgs = firstImg ? [firstImg] : [];
    }
    bannerImgs.forEach(function (img) {
      var fallback = img.getAttribute('src') || '';
      img.onerror = function () {
        img.onerror = null;
        img.src = fallback;
      };
      img.src = a.banner;
    });

    // 副标题图片：按 data-page 匹配当前页；归属看最近的 [data-author] 祖先。
    // 尺寸和位置交给 CSS 的 .is-active，这里只切换类名。
    var page = pageId();
    document.querySelectorAll('.subtitle-img').forEach(function (img) {
      var owner = img.closest('[data-author]');
      var belongs = !owner || authorOf(owner) === current;
      var matched = belongs && img.getAttribute('data-page') === page;
      img.classList.toggle('is-active', matched);
    });

    // 每页不同的副标题文字（来自 authors.yml 的 page_subtitles）。
    //
    // 键是【页面路径】而不是 pageId：'' = 首页、/archives、/about、/friend。
    // 这四个之外的页面（例如文章详情页）查不到对应文字，就保留模板里的默认文案
    // —— 这是原本就有的行为，别顺手改成「落到 home」。
    var texts = a.page_subtitles || {};
    var text = texts[pathOf()];
    if (text) {
      var subEl = document.querySelector('.author-subtitle[data-author="' + current + '"]');
      if (subEl && !subEl.querySelector('.subtitle-img')) subEl.textContent = text;
    }

    applyIcons(a);
  }

  /**
   * 罗辑那边要把「回到顶部」按钮和菜单图标换成图片。
   * 用 onclick 赋值而不是 addEventListener —— 后者每执行一次就多挂一个监听器，
   * 作者切来切去会越积越多，最后点一下滚好几次。
   */
  function applyIcons(a) {
    var useImageIcon = a.cursor === 'default';   // 目前只有罗辑用默认光标

    document.querySelectorAll('.sidebar-top').forEach(function (el) {
      if (useImageIcon) {
        if (el.getAttribute('data-icon-mode') === 'image') return;   // 已换过，别重复插
        el.setAttribute('data-icon-mode', 'image');
        el.innerHTML = '';
        var img = document.createElement('img');
        img.src = ICON_IMG;
        img.alt = '';
        img.className = 'sidebar-top-icon';
        el.appendChild(img);
        el.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
      } else {
        if (el.getAttribute('data-icon-mode') !== 'image') return;
        el.removeAttribute('data-icon-mode');
        el.onclick = null;
        el.innerHTML = '<div class="sidebar-top-taichi rotate"></div><div class="arrow-up"></div>';
      }
    });

    document.querySelectorAll('.sidebar-menu-icon, .main-nav-icon').forEach(function (el) {
      if (useImageIcon) {
        if (el.classList.contains('menu-icon-replaced')) return;
        el.innerHTML = '';
        var img = document.createElement('img');
        img.src = ICON_IMG;
        img.alt = '';
        img.className = 'menu-icon-img';
        el.appendChild(img);
        el.classList.add('menu-icon-replaced');
      } else {
        if (!el.classList.contains('menu-icon-replaced')) return;
        el.classList.remove('menu-icon-replaced');
        el.innerHTML = '&#xe62b;';
      }
    });
  }

  /* ------------------------------------------------------------------
   * 渲染与切换
   * ------------------------------------------------------------------ */

  function render() {
    applyVisibility();
    applySidebar();
    applyTheme();
    applyPageSkin();
  }

  /** 当前是不是「单篇文章详情页」——整页只有一篇归属某个作者的文章。
      这种页面切到另一个作者后，那篇文章按归属被隐藏，页面上就只剩页头那个标题、
      正文一片空白，是个出不去也看不成的死胡同（从首页点文章进来再切就会遇到）。
      关于/友链那种页面内部有 .about-author-content 自己做隔离，切换是原地换内容，不算。 */
  function detailArticleOwner() {
    var arts = document.querySelectorAll('article.h-entry');
    if (arts.length !== 1) return null;
    var el = arts[0];
    if (el.querySelector('.about-author-content')) return null;
    return authorOf(el);
  }

  function switchAuthor(key) {
    if (!AUTHORS[key] || key === current) return;

    var owner = detailArticleOwner();
    current = key;
    writeCookie(COOKIE_NAME, key, COOKIE_DAYS);

    // 正在看的是别人写的单篇文章：留在原地只会剩一个光秃秃的标题，
    // 所以直接把对方的内容调出来 —— 回首页，首页本来就按当前作者过滤好了。
    if (owner && owner !== key) {
      window.location.href = '/';
      return;
    }

    render();
  }

  /** 事件委托：一个监听器管所有切换按钮，不用逐个绑定，也不会重复绑定 */
  function bindSwitch() {
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var btn = e.target.closest('.author-switch-btn');
      if (btn) switchAuthor(btn.getAttribute('data-author'));
    });
  }

  /* ------------------------------------------------------------------
   * 科乐美秘技彩蛋（上上下下）
   * ------------------------------------------------------------------ */

  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown'];
  var buffer = [];

  function bindKonami() {
    document.addEventListener('keydown', function (e) {
      if (KONAMI.indexOf(e.key) === -1) { buffer = []; return; }
      buffer.push(e.key);
      if (buffer.length > KONAMI.length) buffer.shift();
      if (buffer.join('|') === KONAMI.join('|')) {
        buffer = [];
        showEasterEgg();
      }
    });
  }

  function showEasterEgg() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (document.getElementById('easter-egg')) return;   // 已经开着就别叠第二层

    var overlay = document.createElement('div');
    overlay.id = 'easter-egg';

    var card = document.createElement('div');
    card.className = 'easter-egg-card';

    var img = document.createElement('img');
    img.src = '/images/11.webp';
    img.alt = '';
    img.className = 'easter-egg-img';

    var text = document.createElement('div');
    text.className = 'easter-egg-text';
    ['Rick: Haha! morty, eat my ass... Labalabalaba... I love you my grandson... Hahaha.',
     'Morty: F**k you rick.'].forEach(function (line) {
      var p = document.createElement('p');
      p.textContent = line;
      text.appendChild(p);
    });

    card.appendChild(img);
    card.appendChild(text);
    overlay.appendChild(card);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', onEsc);
    }
    function onEsc(e) { if (e.key === 'Escape') close(); }

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onEsc);

    document.body.appendChild(overlay);
  }

  /* ------------------------------------------------------------------
   * 启动
   * ------------------------------------------------------------------ */

  function init() {
    if (initialized) return;         // 只跑一次：原来这里会跑两遍，监听器和样式都翻倍
    initialized = true;

    var saved = readCookie(COOKIE_NAME);
    current = AUTHORS[saved] ? saved : DEFAULT_KEY;

    render();
    bindSwitch();
    bindKonami();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
