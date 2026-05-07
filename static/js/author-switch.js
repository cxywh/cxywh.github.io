/**
 * 双作者切换功能
 * 
 * 每篇文章 front-matter 中含 author 字段: "luoji" | "meimei"
 * 侧边栏作者名右侧有两个圆点按钮，点击切换
 * Cookie 记住当前选中作者
 * 各页面按当前作者筛选/切换
 * 罗辑=蓝色简洁风，妹妹=二次元灵梦风
 */

(function() {
  'use strict';

  const AUTHORS = {
    luoji: {
      key: 'luoji',
      name: '罗辑',
      avatar: '/avatar/01.webp',
      description: '记录一些日常',
      color: '#4a90d9',
      cssClass: 'author-luoji',
      banner: '/images/banner-luoji.webp',
      cursor: 'default',
      preloaderIcon: ''  // 用蓝色默认
    },
    meimei: {
      key: 'meimei',
      name: '妹妹',
      avatar: '/avatar/meimei.webp',
      description: '妹妹的小世界',
      color: '#e87d9e',
      cssClass: 'author-meimei',
      banner: '/images/banner.webp',
      cursor: 'reimu',
      preloaderIcon: ''
    }
  };

  var currentAuthor = null;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + '; path=/' + expires;
  }

  function init() {
    var saved = getCookie('blog_author');
    currentAuthor = (saved && AUTHORS[saved]) ? saved : 'luoji';

    if (document.body.classList.contains('home-page')) applyHomeFilter();
    if (document.querySelector('.archives-outer-wrap')) applyArchiveFilter();
    applyPageContent();

    bindSidebarButtons();
    applySidebar(currentAuthor);
    applyAuthorTheme(currentAuthor);
    applyPageStyle(currentAuthor);
    updateSidebarBtnActive();
  }

  function applyHomeFilter() {
    document.querySelectorAll('.post-wrapper').forEach(function(w) {
      w.style.display = (w.getAttribute('data-author') || 'luoji') === currentAuthor ? '' : 'none';
    });
  }

  function applyArchiveFilter() {
    document.querySelectorAll('.archives-wrap').forEach(function(section) {
      var hasVisible = false;
      section.querySelectorAll('.archive-article').forEach(function(item) {
        var visible = (item.getAttribute('data-author') || 'luoji') === currentAuthor;
        item.style.display = visible ? '' : 'none';
        if (visible) hasVisible = true;
      });
      section.style.display = hasVisible ? '' : 'none';
    });
  }

  function applyPageContent() {
    document.querySelectorAll('.about-author-content').forEach(function(el) {
      el.style.display = (el.getAttribute('data-author') || 'luoji') === currentAuthor ? '' : 'none';
    });
    document.querySelectorAll('.post-wrapper').forEach(function(w) {
      w.style.display = (w.getAttribute('data-author') || 'luoji') === currentAuthor ? '' : 'none';
    });
    // 对于单篇文章（不是关于/友链等独立页面），按作者隐藏
    document.querySelectorAll('article.h-entry').forEach(function(el) {
      // 如果页面内已经有 .about-author-content 过滤了，就不要隐藏 article 本身
      // 只隐藏没有 .about-author-content 子元素的文章（即普通博客文章页）
      if (!el.querySelector('.about-author-content')) {
        el.style.display = (el.getAttribute('data-author') || 'luoji') === currentAuthor ? '' : 'none';
      }
    });
  }

  function bindSidebarButtons() {
    document.querySelectorAll('.author-switch-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var key = this.getAttribute('data-author');
        if (key !== currentAuthor) switchAuthor(key);
      });
    });
  }

  function updateSidebarBtnActive() {
    document.querySelectorAll('.author-switch-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-author') === currentAuthor);
    });
  }

  function switchAuthor(key) {
    if (!AUTHORS[key]) return;
    currentAuthor = key;
    setCookie('blog_author', key, 365);

    applyHomeFilter();
    applyArchiveFilter();
    applyPageContent();
    applySidebar(key);
    applyAuthorTheme(key);
    applyPageStyle(key);
    updateSidebarBtnActive();
  }

  function applySidebar(key) {
    var a = AUTHORS[key];
    if (!a) return;
    var avatar = document.querySelector('.sidebar-author img');
    var name = document.querySelector('.sidebar-author-name');
    var desc = document.querySelector('.sidebar-description');
    if (avatar) { avatar.setAttribute('data-src', a.avatar); avatar.src = a.avatar; }
    if (name) name.textContent = a.name;
    if (desc) desc.textContent = a.description;
  }

  function applyAuthorTheme(key) {
    var a = AUTHORS[key];
    if (!a) return;
    
    // 更新根元素 CSS 变量
    var root = document.documentElement;
    if (key === 'luoji') {
      root.style.setProperty('--author-color', '#4a90d9');
      root.style.setProperty('--red-0', '#4a90d9');
      root.style.setProperty('--red-1', '#4a90d9');
      root.style.setProperty('--red-2', '#4a90d9');
      root.style.setProperty('--red-3', '#4a90d9');
      root.style.setProperty('--red-4', '#d6e4f5');
      root.style.setProperty('--red-5', '#d6e4f5');
      root.style.setProperty('--red-5-5', '#e8f0fa');
      root.style.setProperty('--color-link', '#4a90d9');
      root.style.setProperty('--color-link-hover', '#4a90d9');
      root.style.setProperty('--color-h2-after', '#4a90d9');
      root.style.setProperty('--color-red-6-shadow', 'rgba(74, 144, 217, 0.6)');
      root.style.setProperty('--color-red-3-shadow', 'rgba(74, 144, 217, 0.3)');
    } else {
      root.style.setProperty('--author-color', '#e87d9e');
      root.style.setProperty('--red-0', '#e87d9e');
      root.style.setProperty('--red-1', '#e87d9e');
      root.style.setProperty('--red-2', '#e87d9e');
      root.style.setProperty('--red-3', '#e87d9e');
      root.style.setProperty('--red-4', '#fce4ec');
      root.style.setProperty('--red-5', '#fce4ec');
      root.style.setProperty('--red-5-5', '#fdf0f4');
      root.style.setProperty('--color-link', '#e87d9e');
      root.style.setProperty('--color-link-hover', '#e87d9e');
      root.style.setProperty('--color-h2-after', '#e87d9e');
      root.style.setProperty('--color-red-6-shadow', 'rgba(232, 125, 158, 0.6)');
      root.style.setProperty('--color-red-3-shadow', 'rgba(232, 125, 158, 0.3)');
    }
    
    document.body.classList.remove('author-luoji', 'author-meimei');
    document.body.classList.add(a.cssClass);
  }

  // ====== 页面级风格切换（banner、光标、标题、副标题等） ======
  function applyPageStyle(key) {
    var a = AUTHORS[key];
    if (!a) return;

    // 1. Banner 头图
    var headerImg = document.querySelector('#header img');
    if (headerImg && a.banner) {
      headerImg.src = a.banner;
    }

    // 2. 光标
    if (a.cursor === 'default') {
      document.body.style.cursor = 'auto';
    } else {
      document.body.style.cursor = '';
    }

    // 3. 首页标题切换
    document.querySelectorAll('.author-title').forEach(function(el) {
      el.style.display = (el.getAttribute('data-author') === key) ? '' : 'none';
    });

    // 4. 副标题切换
    document.querySelectorAll('.author-subtitle').forEach(function(el) {
      el.style.display = (el.getAttribute('data-author') === key) ? '' : 'none';
    });

    // 按页面显示对应的副标题图片
    var path = window.location.pathname.replace(/\/$/, '') || '';
    var pageMap = { '': 'home', '/archives': 'archives', '/about': 'about', '/friend': 'friend' };
    var page = pageMap[path] || 'home';
    document.querySelectorAll('.meimei-subtitle-img').forEach(function(img) {
      var show = (img.getAttribute('data-page') === page && key === 'meimei');
      if (show) {
        img.style.cssText = 'height:128px;width:auto;max-width:100%;object-fit:contain;display:block;position:relative;left:50%;transform:translateX(-50%)';
      } else {
        img.style.display = 'none';
      }
    });
    // 强制父容器文本居中
    var wrapper = document.getElementById('subtitle-meimei');
    if (wrapper) {
      wrapper.style.setProperty('text-align', 'center', 'important');
    }
    var subtitleWrap = document.getElementById('subtitle-wrap');
    if (subtitleWrap) {
      subtitleWrap.style.setProperty('text-align', 'center', 'important');
    }

    // 5. 侧边栏 widget（分类/标签/标签云/最新文章）切换
    document.querySelectorAll('.author-widget').forEach(function(el) {
      el.style.display = (el.getAttribute('data-author') === key) ? '' : 'none';
    });

    // 6. 侧边栏状态（文章数/分类数/标签数）切换
    document.querySelectorAll('.author-state').forEach(function(el) {
      var show = el.getAttribute('data-author') === key;
      el.style.setProperty('display', show ? 'flex' : 'none', 'important');
    });

    // 7. 归档页 tag-wrap / category-wrap 切换
    document.querySelectorAll('.archives-tag-luoji, .archives-tag-meimei, .archives-category-luoji, .archives-category-meimei').forEach(function(el) {
      el.style.display = (el.getAttribute('data-author') === key) ? '' : 'none';
    });

    // 8. 罗辑板块图标全部替换成图片
    var iconImg = '/images/10.svg';
    if (key === 'luoji') {
      // 8a. 替换整个 sidebar-top（10.svg 完整展示于方形区域内，点击回到顶部）
      document.querySelectorAll('.sidebar-top').forEach(function(el) {
        el.setAttribute('data-luoji-top', 'true');
        el.innerHTML = '';
        el.style.borderRadius = '0';
        el.style.background = 'none';
        el.style.boxShadow = 'none';
        el.style.width = '96px';
        el.style.height = '96px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        var img = document.createElement('img');
        img.src = '/images/10.svg';
        img.style.cssText = 'max-width:80%;max-height:80%;width:auto;height:auto;display:block';
        el.appendChild(img);
        el.addEventListener('click', function() { window.scrollTo({top:0,behavior:'smooth'}); });
      });
      // 8b. 替换菜单项图标（逆时针旋转45°修正）
      document.querySelectorAll('.sidebar-menu-icon, .main-nav-icon').forEach(function(el) {
        el.innerHTML = '<img src="' + iconImg + '" style="width:20px;height:20px;display:inline-block;vertical-align:middle;transform:rotate(-90deg)">';
        el.style.fontSize = '0';
      });
      // 8d. 罗辑副标题按页面显示不同文字
      var path = window.location.pathname.replace(/\/$/, '') || '';
      var subtitleTexts = {
        '': 'Rick:Hey...hey,morty,press...press...uh..up,up,down,down!',
        '/archives': 'Morty:Ri...rick? A..are you ok?',
        '/about': 'Rick:Do it! morty! just do it!',
        '/friend': 'Morty:Ok...rick..ok..'
      };
      var subtitleEl = document.getElementById('subtitle');
      if (subtitleEl && subtitleTexts[path]) {
        subtitleEl.textContent = subtitleTexts[path];
      }
    } else {
      // 恢复妹妹板块主题默认
      document.querySelectorAll('.sidebar-top[data-luoji-top]').forEach(function(el) {
        el.removeAttribute('data-luoji-top');
        el.style.borderRadius = '';
        el.style.background = '';
        el.style.boxShadow = '';
        el.style.width = '';
        el.style.height = '';
        el.style.display = '';
        el.style.alignItems = '';
        el.style.justifyContent = '';
        el.style.cursor = '';
        el.innerHTML = '<div class="sidebar-top-taichi rotate"></div><div class="arrow-up"></div>';
      });
      document.querySelectorAll('.sidebar-menu-icon, .main-nav-icon').forEach(function(el) {
        el.innerHTML = '&#xe62b;';
        el.style.fontSize = '';
      });
    }
  }

  function doInit() {
    init();
    // 兜底：如果 DOM 刚渲染完但某些元素还没好，再跑一次
    setTimeout(init, 100);
  }

  
  // 科乐美秘技: 上上下下 触发弹窗（监听 body 确保捕获所有按键）
  var konamiKeys = [];
  document.body.addEventListener('keydown', function(e) {
    if (['ArrowUp','ArrowDown'].indexOf(e.key) === -1) { konamiKeys = []; return; }
    console.log('key:', e.key);
    konamiKeys.push(e.key);
    if (konamiKeys.length > 4) konamiKeys.shift();
    console.log('seq:', konamiKeys.join(','));
    if (konamiKeys.join(',') === 'ArrowUp,ArrowUp,ArrowDown,ArrowDown') {
      console.log('MATCH!');
      konamiKeys = [];
      showEasterEgg();
    }
  });
  
  function showEasterEgg() {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
    var card = document.createElement('div');
    card.style.cssText = 'display:flex;align-items:stretch;background:#1a1a2e;border-radius:12px;overflow:hidden;max-width:800px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);cursor:default';
    card.innerHTML = '<img src="/images/11.webp" style="width:300px;object-fit:cover;display:block;flex-shrink:0" /><div style="padding:28px 32px;display:flex;flex-direction:column;justify-content:center;color:#fff;font-size:16px;line-height:1.8;font-family:sans-serif"><p style="margin:0 0 16px 0">Rick: Haha! morty, eat my ass... Labalabalaba... I love you my grandson... Hahaha.</p><p style="margin:0">Morty: F**k you rick.</p></div>';
    overlay.appendChild(card);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', doInit);
  } else {
    doInit();
  }
})();
