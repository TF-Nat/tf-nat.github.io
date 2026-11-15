/* ==========================================================
   TF. blog data and rendering

   Posts come from three places (merged, newest first):
     1) MD_POSTS     posts/<name>.md  (write in Markdown; main way)
     2) LOCAL_POSTS  posts written as HTML right here (optional)
     3) TISTORY_RSS  Tistory feed (off by default; opens on Tistory)
   ========================================================== */

// e.g. 'https://yourblog.tistory.com/rss'  (leave '' to disable)
var TISTORY_RSS = 'https://tf-korea.tistory.com/rss';  // set '' to turn Tistory sync off

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

/* Markdown posts: one file per post in the posts/ folder.
   Add the file name (without .md) to this list, newest first or any order.
   Start from posts/_template.md. */
var MD_POSTS = [
  'blackhat-2025-ecscape',
  'me'
];

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

/* Tistory feeds double-encode text (e.g. "&amp;ndash;"); decode until it is plain text. */
function tfDecode(str) {
  var t = document.createElement('textarea'), cur = String(str || '');
  for (var i = 0; i < 3; i++) { t.innerHTML = cur; if (t.value === cur) break; cur = t.value; }
  return cur;
}
/* rss2json gives UTC; the blog is written in Korea time (UTC+9). */
function tfKstDate(pub) {
  var d = new Date(String(pub || '').replace(' ', 'T') + 'Z');
  if (isNaN(d.getTime())) return String(pub || '').slice(0, 10).replace(/-/g, '.');
  var k = new Date(d.getTime() + 9 * 3600 * 1000), z = function (n) { return (n < 10 ? '0' : '') + n; };
  return k.getUTCFullYear() + '.' + z(k.getUTCMonth() + 1) + '.' + z(k.getUTCDate());
}

function tfLoadTistory() {
  if (!TISTORY_RSS) return Promise.resolve([]);
  var key = 'tf-rss:' + TISTORY_RSS;
  try { var c = JSON.parse(sessionStorage.getItem(key)); if (c && Date.now() - c.t < 600000) return Promise.resolve(c.v); } catch (e) {}
  var url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(TISTORY_RSS);
  return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
    if (!j || j.status !== 'ok') return [];
    var v = j.items.map(function (it) {
      var txt = tfDecode((it.description || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
      return {
        external: it.link, cat: tfMapCategory(it.categories), date: tfKstDate(it.pubDate),
        title: tfDecode(it.title), summary: txt.length > 120 ? txt.slice(0, 120) + '…' : txt
      };
    });
    try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
    return v;
  }).catch(function () { return []; });
}

function tfBody(p) {
  if (p.md == null) return p.body || '';
  if (window.marked) return window.marked.parse(p.md);
  return '<pre><code>' + tfEsc(p.md) + '</code></pre>';
}

/* ---------- markdown posts ---------- */
function tfParseMd(slug, text) {
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/^\s*(---\n)+(?=[A-Za-z_]+\s*:)/, '---\n');
  var meta = {}, md = text;
  var m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (m) {
    md = text.slice(m[0].length);
    m[1].split('\n').forEach(function (line) {
      var k = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
      if (k) meta[k[1].toLowerCase()] = k[2].trim();
    });
  }
  var plain = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#>*`|\-\[\]()!_]/g, ' ').replace(/\s+/g, ' ').trim();
  return {
    slug: slug, md: md, tistory: meta.tistory || '',
    cat: meta.cat || 'notes', date: meta.date || '',
    title: meta.title || slug,
    summary: meta.summary || (plain.length > 120 ? plain.slice(0, 120) + '…' : plain)
  };
}
function tfLoadMarkdown() {
  return Promise.all(MD_POSTS.map(function (slug) {
    return fetch('posts/' + encodeURIComponent(slug) + '.md', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (t) { return tfParseMd(slug, t); })
      .catch(function (e) { if (window.console) console.warn('TF: could not load posts/' + slug + '.md (' + e.message + ')'); return null; });
  })).then(function (list) { return list.filter(Boolean); });
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
function tfPlaceholders() {
  return '<p class="empty-note reveal">Posts are on the Tistory blog for now. <a href="https://tf-korea.tistory.com/" target="_blank" rel="noopener">Read on Tistory &nearr;</a></p>';
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
        '<div class="top"><span class="count">' + String(n).padStart(2, '0') + ' posts</span></div>' +
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
      count.textContent = POSTS.length ? items.length + ' of ' + POSTS.length + ' posts' + (state.cat !== 'all' ? ' in ' + tfCat(state.cat).label : '') : '';
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
      detail.innerHTML = '<div class="post-head"><a class="back" href="posts.html">&larr; Back to blog</a><p class="eyebrow">404 / NOT FOUND</p><h1>Entry not found</h1></div><div class="prose"><p>That post does not exist. Head back to the <a href="posts.html">blog</a>.</p></div>';
    } else {
      var p = local[idx], prev = local[idx + 1], next = local[idx - 1];
      document.title = p.title + ' | TF';
      detail.innerHTML =
        '<header class="post-head"><a class="back" href="posts.html">&larr; Back to blog</a>' +
        '<p class="eyebrow">' + tfEsc(tfCat(p.cat).label) + '</p>' +
        '<h1>' + tfEsc(p.title) + '</h1>' +
        '<div class="post-meta" style="margin-top:1.6rem"><span>' + p.date + '</span></div></header>' +
        '<article class="prose">' + tfBody(p) + '</article>' +
        '<nav class="post-nav" aria-label="Post navigation">' +
        (prev ? '<a href="post.html?slug=' + prev.slug + '"><small>&larr; Older</small>' + tfEsc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="next" href="post.html?slug=' + next.slug + '"><small>Newer &rarr;</small>' + tfEsc(next.title) + '</a>' : '<span></span>') +
        '</nav>';
      detail.querySelectorAll('.prose a[href^="http"]').forEach(function (a) { a.target = '_blank'; a.rel = 'noopener'; });
    }
  }
}

/* A post that exists on this site hides its Tistory twin.
   Matched by title, or by the optional "tistory: <url>" line in the .md file. */
function tfKey(t) { return String(t).toLowerCase().replace(/[^0-9a-z\u3131-\uD79D]/g, ''); }
function tfUrlKey(u) { return String(u).toLowerCase().replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); }

function tfWithTimeout(promise, ms) {
  return Promise.race([promise, new Promise(function (res) { setTimeout(function () { res([]); }, ms); })]);
}

Promise.all([tfLoadMarkdown(), tfWithTimeout(tfLoadTistory(), 4000)]).then(function (r) {
  var mine = LOCAL_POSTS.concat(r[0]);
  var titles = {}, urls = {};
  mine.forEach(function (p) { titles[tfKey(p.title)] = true; if (p.tistory) urls[tfUrlKey(p.tistory)] = true; });
  var ext = r[1].filter(function (p) { return !titles[tfKey(p.title)] && !urls[tfUrlKey(p.external || '')]; });
  tfInit(mine.concat(ext));
});
