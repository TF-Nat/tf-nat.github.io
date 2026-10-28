/* ==========================================================
   TF. — blog data + rendering
   To add a post: copy one object in POSTS, give it a unique slug,
   a category id from CATEGORIES, and write the body as HTML.
   (Remove `sample: true` on your own posts.)
   ========================================================== */
var CATEGORIES = [
  { id: 'dev',      label: 'Development',          desc: 'Programming, tooling and build logs.' },
  { id: 'ctf',      label: 'CTF / Wargame',        desc: 'Challenge write-ups and solve notes.' },
  { id: 'bounty',   label: 'Bug Bounty',           desc: 'Web vulnerability research and reports.' },
  { id: 'notes',    label: 'Blog / Tech Docs',     desc: 'Concepts, guides and technical documentation.' },
  { id: 'research', label: 'Papers / Conferences', desc: 'Paper notes and conference takeaways.' },
  { id: 'contest',  label: 'Contests / Certs',     desc: 'Competition and certification records.' }
];

var POSTS = [
  {
    slug: 'github-pages-blog-setup', cat: 'notes', date: '2026.10.27', read: 4, sample: true,
    title: 'Shipping a static blog on GitHub Pages',
    summary: 'From an empty repository to a live site: naming, publishing source, and the small gotchas.',
    body: '<p>GitHub Pages serves static files straight from a repository. No server, no database &mdash; which also means a small attack surface.</p>' +
      '<h2>Setup</h2><ol><li>Create a repository named <code>&lt;username&gt;.github.io</code>.</li><li>Push <code>index.html</code> and the <code>assets/</code> folder to the default branch.</li><li>Open <b>Settings &rarr; Pages</b> and choose <i>Deploy from a branch</i> &rarr; <code>main</code> / <code>/(root)</code>.</li><li>Wait a minute and visit <code>https://&lt;username&gt;.github.io</code>.</li></ol>' +
      '<pre><code>git init\ngit add .\ngit commit -m "init blog"\ngit branch -M main\ngit remote add origin https://github.com/&lt;username&gt;/&lt;username&gt;.github.io.git\ngit push -u origin main</code></pre>' +
      '<h2>Gotchas</h2><ul><li>Paths are case-sensitive on the server even if your laptop is not.</li><li>Use relative paths (<code>assets/css/style.css</code>) so project sites keep working.</li><li>Changes can take a minute or two to appear &mdash; hard-refresh before debugging.</li></ul>'
  },
  {
    slug: 'writing-a-ctf-writeup', cat: 'ctf', date: '2026.10.21', read: 3, sample: true,
    title: 'A repeatable structure for CTF write-ups',
    summary: 'Recon, hypothesis, exploit, lesson. A template that keeps notes useful six months later.',
    body: '<p>A write-up is only useful if future-you can reproduce the solve. This is the skeleton I use for every challenge.</p>' +
      '<h2>Template</h2><pre><code>## Challenge\nName / category / points / link\n\n## Recon\nWhat does the service do? What input do I control?\n\n## Hypothesis\nWhat bug class does this smell like, and why?\n\n## Exploit\nMinimal steps + script\n\n## Lesson\nWhat would have made me find this faster?</code></pre>' +
      '<blockquote>The &ldquo;Lesson&rdquo; section is the one that compounds. Never skip it.</blockquote>' +
      '<p>Keep the exploit script in the post, not in a screenshot &mdash; text is searchable.</p>'
  },
  {
    slug: 'anatomy-of-a-bug-report', cat: 'bounty', date: '2026.10.14', read: 4, sample: true,
    title: 'Anatomy of a good bug bounty report',
    summary: 'What triagers actually need: a clear title, reproducible steps, honest impact and a suggested fix.',
    body: '<p>Triagers read dozens of reports a day. Make yours the easiest one to say &ldquo;yes&rdquo; to.</p>' +
      '<h2>Structure</h2><ul><li><b>Title</b> &mdash; vulnerability + location + impact, in one line.</li><li><b>Summary</b> &mdash; two sentences a manager could read.</li><li><b>Steps to reproduce</b> &mdash; numbered, copy-pasteable, with the exact request.</li><li><b>Impact</b> &mdash; what an attacker gains, without exaggeration.</li><li><b>Remediation</b> &mdash; the smallest fix that closes the hole.</li></ul>' +
      '<h2>Always</h2><p>Stay inside the program scope, use only your own test accounts, and stop as soon as you have proof of impact.</p>'
  },
  {
    slug: 'css-variables-palette', cat: 'dev', date: '2026.10.09', read: 3, sample: true,
    title: 'Designing a palette with CSS custom properties',
    summary: 'How this site defines a moonlight accent and an amber highlight once and reuses them everywhere.',
    body: '<p>Define the palette once, and everything &mdash; borders, glows, selections &mdash; follows.</p>' +
      '<pre><code>:root {\n  --accent: #8fd3ff;        /* moonlight */\n  --accent-rgb: 143, 211, 255;\n  --amber: #ffb347;         /* window light */\n}\n\n.glow { background: rgba(var(--accent-rgb), .2); }</code></pre>' +
      '<p>Keeping a separate <code>--accent-rgb</code> triplet lets you build translucent variants with <code>rgba()</code>. Use the cold accent for structure and the warm amber sparingly, the way a few lit windows break up a dark skyline.</p>'
  },
  {
    slug: 'how-to-read-a-paper', cat: 'research', date: '2026.10.02', read: 3, sample: true,
    title: 'A three-pass checklist for reading security papers',
    summary: 'Skim, understand, then challenge. A routine that makes dense papers manageable.',
    body: '<p>Based on the classic multi-pass approach to reading research.</p>' +
      '<h2>Pass 1 &mdash; 10 minutes</h2><p>Title, abstract, headings, figures, conclusion. Decide if the paper deserves more time.</p>' +
      '<h2>Pass 2 &mdash; 1 hour</h2><p>Read carefully but skip proofs. Note the threat model, assumptions and the evaluation setup.</p>' +
      '<h2>Pass 3 &mdash; challenge it</h2><ul><li>Which assumptions would break in the real world?</li><li>What is missing from the evaluation?</li><li>Could I reproduce one result?</li></ul>'
  },
  {
    slug: 'certification-study-log', cat: 'contest', date: '2026.09.25', read: 2, sample: true,
    title: 'Keeping a certification study log',
    summary: 'A simple weekly log format to track what you studied, what you missed and what to redo.',
    body: '<p>Studying for an exam is easier when you can see your own progress.</p>' +
      '<h2>Weekly log</h2><pre><code>Week of: 2026-10-05\nTopics: IAM policies, VPC basics\nHours: 6\nMissed questions: 4 (all about policy evaluation order)\nRedo next week: policy evaluation, SCPs</code></pre>' +
      '<p>Review the &ldquo;missed&rdquo; line before starting each session. Repetition on weak spots beats re-reading what you already know.</p>'
  }
];

POSTS.sort(function (a, b) { return a.date < b.date ? 1 : -1; });

function tfCat(id) { return CATEGORIES.filter(function (c) { return c.id === id; })[0] || { label: id }; }
function tfEsc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function tfPostCard(p, i) {
  return '<article class="post-card reveal" style="--i:' + (i || 0) + '">' +
    '<div class="post-meta"><span>' + p.date + '</span><span class="cat">' + tfEsc(tfCat(p.cat).label) + '</span></div>' +
    '<div><h3>' + tfEsc(p.title) + '</h3><p>' + tfEsc(p.summary) + '</p></div>' +
    '<span class="arrow" aria-hidden="true">&nearr;</span>' +
    '<a class="stretch" href="post.html?slug=' + encodeURIComponent(p.slug) + '" aria-label="Read: ' + tfEsc(p.title) + '"></a></article>';
}

(function () {
  /* home: latest 3 */
  var recent = document.querySelector('[data-recent]');
  if (recent) {
    recent.innerHTML = POSTS.slice(0, 3).map(tfPostCard).join('');
    window.tfReveal && window.tfReveal(recent);
  }

  /* archive: category cards + search */
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
        '<h3>' + tfEsc(c.label) + '</h3><p>' + tfEsc(c.desc) + '</p></button>';
    }).join('');

    function render() {
      var q = state.q.trim().toLowerCase();
      var items = POSTS.filter(function (p) {
        return (state.cat === 'all' || p.cat === state.cat) &&
          (!q || (p.title + ' ' + p.summary + ' ' + tfCat(p.cat).label).toLowerCase().indexOf(q) > -1);
      });
      list.innerHTML = items.length ? items.map(tfPostCard).join('') : '<p class="empty">// no entries match this filter.</p>';
      count.textContent = items.length + ' / ' + POSTS.length + ' ENTRIES' + (state.cat !== 'all' ? ' · ' + tfCat(state.cat).label.toUpperCase() : '');
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

  /* detail page */
  var detail = document.querySelector('[data-post]');
  if (detail) {
    var slug = new URLSearchParams(location.search).get('slug');
    var idx = -1;
    POSTS.forEach(function (p, i) { if (p.slug === slug) idx = i; });
    if (idx < 0) {
      detail.innerHTML = '<div class="post-head"><a class="back" href="posts.html">&larr; BACK TO ARCHIVE</a><p class="eyebrow">404 / NOT FOUND</p><h1>Entry not found</h1></div><div class="prose"><p>That post does not exist. Head back to the <a href="posts.html">archive</a>.</p></div>';
    } else {
      var p = POSTS[idx], prev = POSTS[idx + 1], next = POSTS[idx - 1];
      document.title = p.title + ' | TF. Security Archive';
      detail.innerHTML =
        '<header class="post-head"><a class="back" href="posts.html">&larr; BACK TO ARCHIVE</a>' +
        '<p class="eyebrow">' + tfEsc(tfCat(p.cat).label) + (p.sample ? '<span class="sample-badge">SAMPLE</span>' : '') + '</p>' +
        '<h1>' + tfEsc(p.title) + '</h1>' +
        '<div class="post-meta" style="margin-top:1.6rem"><span>' + p.date + '</span><span>' + p.read + ' MIN READ</span></div></header>' +
        '<article class="prose">' + p.body + '</article>' +
        '<nav class="post-nav" aria-label="Post navigation">' +
        (prev ? '<a href="post.html?slug=' + prev.slug + '"><small>&larr; OLDER</small>' + tfEsc(prev.title) + '</a>' : '<span></span>') +
        (next ? '<a class="next" href="post.html?slug=' + next.slug + '"><small>NEWER &rarr;</small>' + tfEsc(next.title) + '</a>' : '<span></span>') +
        '</nav>';
    }
  }
})();
