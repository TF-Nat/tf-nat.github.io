/* ==========================================================
   TF. — blog data + rendering

   POSTS come from two places (merged, newest first):
     1) Tistory RSS  -> set TISTORY_RSS below. Posts open on Tistory.
     2) LOCAL_POSTS  -> posts written directly on this site (optional).
   With neither, the site shows clearly-marked placeholder rows.
   ========================================================== */

// e.g. 'https://yourblog.tistory.com/rss'  (leave '' to disable)
var TISTORY_RSS = '';  // auto-sync is off for now. Set to 'https://tf-korea.tistory.com/rss' to turn it on.

var CATEGORIES = [
  { id: 'dev',      label: 'Development',          ko: '개발',            desc: 'Programming, tooling and build logs.' },
  { id: 'ctf',      label: 'CTF / Wargame',        ko: 'CTF/Wargame',     desc: 'Challenge write-ups and solve notes.' },
  { id: 'bounty',   label: 'Bug Bounty',           ko: 'Bug Bounty',      desc: 'Web vulnerability research and reports.' },
  { id: 'notes',    label: 'Blog / Tech Docs',     ko: '블로그/기술문서',   desc: 'Concepts, guides and technical documentation.' },
  { id: 'research', label: 'Papers / Conferences', ko: '논문/컨퍼런스',     desc: 'Paper notes and conference takeaways.' },
  { id: 'contest',  label: 'Contests / Certs',     ko: '공모전/자격증',     desc: 'Competition and certification records.' }
];

/* Optional: posts written on this site (opens post.html?slug=...).
   Example:
   { slug: 'my-first-post', cat: 'ctf', date: '2026.10.28', title: 'Title', summary: 'One line.', body: '<p>HTML here</p>' }
*/
var LOCAL_POSTS = [];

/* ---------- helpers ---------- */
function tfCat(id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0] || { label: id, ko: '' }; }
function tfEsc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* Your Tistory category  ->  one of the six site categories.
   Edit the left side to match your Tistory category names. */
var TISTORY_CATEGORY_MAP = {
  'web': 'notes', 'web3': 'notes', 'cloud': 'notes', 'network': 'notes', 'etc': 'notes',
  'wargame': 'ctf',
  'programming': 'dev'
};

/* map a Tistory category name onto one of our six */
function tfMapCategory(names) {
  var list = names || [];
  for (var k = 0; k < list.length; k++) {
    // Tistory may report nested names like "Web/XSS": check each part
    var parts = String(list[k]).toLowerCase().split('/');
    for (var m = 0; m < parts.length; m++) {
      var hit = TISTORY_CATEGORY_MAP[parts[m].trim()];
      if (hit) return hit;
    }
  }
  var hay = list.join(' ').toLowerCase();
  for (var i = 0; i < CATEGORIES.length; i++) {
    var c = CATEGORIES[i];
    var keys = [c.id, c.label, c.ko].map(function (k) { return k.toLowerCase(); });
    for (var j = 0; j < keys.length; j++) if (keys[j] && hay.indexOf(keys[j]) > -1) return c.id;
  }
  if (/ctf|wargame|워게임/.test(hay)) return 'ctf';
  if (/bounty|버그/.test(hay)) return 'bounty';
  if (/논문|컨퍼런스|paper/.test(hay)) return 'research';
  if (/공모전|자격증|cert/.test(hay)) return 'contest';
  if (/개발|dev/.test(hay)) return 'dev';
  return 'notes';
}

function tfLoadTistory() {
  if (!TISTORY_RSS) return Promise.resolve([]);
  var key = 'tf-rss:' + TISTORY_RSS;
  try { var c = JSON.parse(sessionStorage.getItem(key)); if (c && Date.now() - c.t < 600000) return Promise.resolve(c.v); } catch (e) {}
  var url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(TISTORY_RSS);
  return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || j.status !== 'ok') return [];
    var v = j.items.map(function (it) {
      var txt = (it.description || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        external: it.link, cat: tfMapCategory(it.categories), date: (it.pubDate || '').slice(0, 10).replace(/-/g, '.'),
        title: it.title, summary: txt.length > 120 ? txt.slice(0, 120) + '…' : txt
      };
    });
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
    return v;
  }).catch(function () { return []; });
}

function tfPostCard(p, i) {
  var href = p.external ? p.external : 'post.html?slug=' + encodeURIComponent(p.slug);
  var ext = p.external ? ' target="_blank" rel="noopener"' : '';
  return '<article class="post-card reveal" style="--i:' + (i || 0) + '">' +
    '<div class="post-meta"><span>' + p.date + '</span><span class="cat">' + tfEsc(tfCat(p.cat).label) + '</span></div>' +
    '<div><h3>' + tfEsc(p.title) + '</h3><p>' + tfEsc(p.summary) + '</p></div>' +
    '<span class="arrow" aria-hidden="true">&nearr;</span>' +
    '<a class="stretch" href="' + href + '"' + ext + ' aria-label="Read: ' + tfEsc(p.title) + '"></a></article>';
}
function tfPlaceholders(n) {
  var out = '';
  for (var i = 0; i < n; i++) {
    out += '<article class="post-card is-placeholder reveal" style="--i:' + i + '"><div class="post-meta"><span>YYYY.MM.DD</span><span class="cat">CATEGORY</span></div>' +
      '<div><h3>Your next post goes here</h3><p>Full posts live on the Tistory blog for now.</p></div><span class="arrow" aria-hidden="true">&middot;</span></article>';
  }
  return out;
}

function tfInit(POSTS) {
  POSTS.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

  /* home: latest 3 */
  var recent = document.querySelector('[data-recent]');
  if (recent) {
    recent.innerHTML = POSTS.length ? POSTS.slice(0, 3).map(tfPostCard).join('') : tfPlaceholders(3);
    window.tfReveal && window.tfReveal(recent);
  }

  /* archive */
  var archive = document.querySelector('[data-archive]');
  if (archive) {
    var grid = document.querySelector('[data-cats]');
    var list = archive.querySelector('[data-list]');
    var count = document.querySelector('[data-count]');
    var input = document.querySelector('[data-search]');
    var resetBtn = document.querySelector('[data-reset]');
    var state = { cat: new URLSearchParams(location.search).get('cat') || 'all', q: '' };
    if (state.cat !== 'all' && !CATEGORIES.some(function (c) { return c.id === state.cat; })) state.cat = 'all';

    grid.innerHTML = CATEGORIES.map(function (c, i) {
      var n = POSTS.filter(function (p) { return p.cat === c.id; }).length;
      return '<button class="cat-card reveal" style="--i:' + i + '" data-cat="' + c.id + '" aria-pressed="false">' +
        '<div class="top"><span>' + String(i + 1).padStart(2, '0') + '</span><span class="count">' + String(n).padStart(2, '0') + ' POSTS</span></div>' +
        '<h3>' + tfEsc(c.label) + '</h3><span class="ko">' + tfEsc(c.ko) + '</span><p>' + tfEsc(c.desc) + '</p></button>';
    }).join('');

    function render() {
      var q = state.q.trim().toLowerCase();
      var items = POSTS.filter(function (p) {
        return (state.cat === 'all' || p.cat === state.cat) &&
          (!q || (p.title + ' ' + p.summary + ' ' + tfCat(p.cat).label).toLowerCase().indexOf(q) > -1);
      });
      if (!POSTS.length) list.innerHTML = tfPlaceholders(3);
      else list.innerHTML = items.length ? items.map(tfPostCard).join('') : '<p class="empty">// no entries match this filter.</p>';
      count.textContent = POSTS.length ? items.length + ' / ' + POSTS.length + ' ENTRIES' + (state.cat !== 'all' ? ' · ' + tfCat(state.cat).label.toUpperCase() : '') : 'NO ENTRIES YET';
      grid.querySelectorAll('.cat-card').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)); });
      resetBtn.setAttribute('aria-pressed', String(state.cat === 'all'));
      window.tfReveal && window.tfReveal(list);
    }
    function setCat(c) {
      state.cat = c;
      try { history.replaceState(null, '', c === 'all' ? location.pathname : '?cat=' + c); } catch (e) {}
      render();
    }
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.cat-card'); if (!b) return;
      setCat(state.cat === b.dataset.cat ? 'all' : b.dataset.cat);
    });
    resetBtn.addEventListener('click', function () { setCat('all'); });
    input.addEventListener('input', function () { state.q = input.value; render(); });
    render();
    window.tfReveal && window.tfReveal(grid);
  }

  /* detail page (local posts only) */
  var detail = document.querySelector('[data-post]');
  if (detail) {
    var local = POSTS.filter(function (p) { return !p.external; });
    var slug = new URLSearchParams(location.search).get('slug');
    var idx = -1;
    local.forEach(function (p, i) { if (p.slug === slug) idx = i; });
    if (idx < 0) {
      detail.innerHTML = '<div class="post-head"><a class="back" href="posts.html">&larr; BACK TO BLOG</a><p class="eyebrow">404 / NOT FOUND</p><h1>Entry not found</h1></div><div class="prose"><p>That post does not exist. Head back to the <a href="posts.html">blog</a>.</p></div>';
    } else {
      var p = local[idx], prev = local[idx + 1], next = local[idx - 1];
      document.title = p.title + ' | TF.';
      detail.innerHTML =
        '<header class="post-head"><a class="back" href="posts.html">&larr; BACK TO BLOG</a>' +
        '<p class="eyebrow">' + tfEsc(tfCat(p.cat).label) + '</p>' +
        '<h1>' + tfEsc(p.title) + '</h1>' +
        '<div class="post-meta" style="margin-top:1.6rem"><span>' + p.date + '</span></div></header>' +
        '<article class="prose">' + p.body + '</article>' +
        '<nav class="post-nav" aria-label="Post navigation">' +
        (prev ? '<a href="post.html?slug=' + prev.slug + '"><small>&larr; OLDER</small>' + tfEsc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="next" href="post.html?slug=' + next.slug + '"><small>NEWER &rarr;</small>' + tfEsc(next.title) + '</a>' : '<span></span>') +
        '</nav>';
    }
  }
}

tfLoadTistory().then(function (ext) { tfInit(LOCAL_POSTS.concat(ext)); });
