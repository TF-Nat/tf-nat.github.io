/* TF. Knights Frontier mission view (used on the home page and the Missions page).
   Data lives in missions.js. One building per mission, one window per star. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var $ = function (q) { return document.querySelector(q); };
  var DEFAULT_STARS = 3;

  var items = (window.MISSIONS || []).map(function (m) {
    var stars = Math.max(1, m.stars || DEFAULT_STARS);
    var got = m.got != null ? m.got : (m.status === 'done' ? stars : 0);
    return { title: m.title, date: m.date, link: m.link, stars: stars, got: Math.min(got, stars) };
  });
  var total = Math.max(window.MISSIONS_TOTAL || 0, items.length);
  var lit = items.reduce(function (n, m) { return n + m.got; }, 0);
  var done = items.filter(function (m) { return m.got >= m.stars; }).length;

  var set = function (q, v) { var el = $(q); if (el) el.textContent = v; };
  set('[data-program]', window.MISSIONS_PROGRAM || 'Knights Frontier');
  set('[data-lit]', lit); set('[data-done]', done); set('[data-total]', total);

  /* skyline: window grid, 3 panes per row; a lit pane is an earned star */
  var box = $('[data-skyline]');
  if (box) {
    var COLS = 3, WW = 9, WH = 11, GX = 5, GY = 5, PADX = 6, PADT = 9, PADB = 7;
    var BW = PADX * 2 + COLS * WW + (COLS - 1) * GX, MINROWS = 2, EXTRA = [0, 1, 0, 2, 1, 0, 2, 1];
    var rowsOf = function (m) { return Math.ceil(m.stars / COLS); };
    var maxRows = Math.max(MINROWS, rowsOf({ stars: DEFAULT_STARS }), Math.max.apply(null, items.map(rowsOf))) + 2;
    var bodyH = function (rows) { return PADT + rows * WH + (rows - 1) * GY + PADB; };
    var H = bodyH(maxRows) + 16, GAP = 10;
    var width = Math.max(total, 1) * (BW + GAP) - GAP;
    var svg = '<svg viewBox="-2 -2 ' + (width + 4) + ' ' + (H + 6) + '" role="img" aria-label="' + lit + ' stars lit, ' + done + ' of ' + total + ' missions completed">';
    for (var i = 0; i < total; i++) {
      var m = items[i] || { title: 'Not started', stars: DEFAULT_STARS, got: 0 };
      var pr = rowsOf(m), rows = Math.max(pr, MINROWS) + EXTRA[i % EXTRA.length], bh = bodyH(rows), x = i * (BW + GAP), y = H - bh;
      var g = '<rect class="bld" x="' + x + '" y="' + y + '" width="' + BW + '" height="' + bh + '"/>';
      if (i % 3 === 1) g += '<rect class="bld" x="' + (x + BW / 2 - 6) + '" y="' + (y - 12) + '" width="12" height="12"/>';
      for (var s = 0; s < m.stars; s++) {
        var wx = x + PADX + (s % COLS) * (WW + GX), wy = y + bh - PADB - (pr * WH + (pr - 1) * GY) + Math.floor(s / COLS) * (WH + GY);
        g += '<rect class="win' + (s < m.got ? ' on' : '') + '" x="' + wx + '" y="' + wy + '" width="' + WW + '" height="' + WH + '"/>';
      }
      var tip = esc(m.title) + ' (' + m.got + '/' + m.stars + ')';
      svg += (m.link ? '<a href="' + esc(m.link) + '"><title>' + tip + '</title>' + g + '</a>' : '<g tabindex="0"><title>' + tip + '</title>' + g + '</g>');
    }
    svg += '<line class="ground" x1="-2" y1="' + H + '" x2="' + (width + 2) + '" y2="' + H + '"/></svg>';
    box.innerHTML = svg; box.style.maxWidth = Math.max(total, 1) * 84 + 'px';
  }

  /* log: newest entry first (Missions page only) */
  var log = $('[data-log]');
  if (log) {
    if (!items.length) { log.innerHTML = '<li class="none">No missions logged yet.</li>'; return; }
    log.innerHTML = items.slice().reverse().map(function (m) {
      var inner = esc(m.title) + (m.date ? '<span class="d">' + esc(m.date) + '</span>' : '');
      var name = m.link ? '<a class="t" href="' + esc(m.link) + '">' + inner + '</a>' : '<span class="t">' + inner + '</span>';
      var stars = '<b>' + new Array(m.got + 1).join('★') + '</b>' + new Array(m.stars - m.got + 1).join('☆');
      return '<li>' + name + '<span class="s" aria-label="' + m.got + ' of ' + m.stars + ' stars">' + stars + '</span></li>';
    }).join('');
  }
})();
