// Render review/index.html. The Status column is GENERATED FROM state.json —
// never hand-written. A status that isn't derived from a completed check is a
// claim, not a fact, so anything without a `done` ledger entry shows as
// Queued/Checking/Error rather than as a result.

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Derive the status pill purely from the ledger entry.
function statusOf(entry) {
  if (!entry) return { key: 'queued', text: 'Queued', cls: 'st-queued' };
  if (entry.status === 'error') return { key: 'error', text: 'Error', cls: 'st-error', title: entry.error || 'unknown error' };
  if (entry.status === 'in-progress') return { key: 'checking', text: 'Checking', cls: 'st-checking' };
  if (entry.status !== 'done') return { key: 'queued', text: 'Queued', cls: 'st-queued' };
  const c = entry.counts || {};
  const red = c.red || 0;
  const amber = c.amber || 0;
  if (red > 0 && amber > 0) return { key: 'red', text: `Red ${red} · Amber ${amber}`, cls: 'st-red' };
  if (red > 0) return { key: 'red', text: `Red ${red}`, cls: 'st-red' };
  if (amber > 0) return { key: 'amber', text: `Amber ${amber}`, cls: 'st-amber' };
  return { key: 'clean', text: 'Clean', cls: 'st-clean' };
}

export function renderIndex({ inventory, ledger, generatedAt, rulesHash, expected }) {
  const rows = inventory.map((p) => {
    const entry = ledger[p._id];
    const st = statusOf(entry);
    const c = (entry && entry.counts) || {};
    return {
      ...p,
      st,
      red: c.red || 0,
      amber: c.amber || 0,
      total: entry && entry.status === 'done' ? (entry.findingsTotal || 0) : 0,
      reviewed: !!(entry && entry.status === 'done'),
    };
  });

  const nReviewed = rows.filter((r) => r.reviewed).length;
  const nRed = rows.filter((r) => r.st.key === 'red').length;
  const nAmber = rows.filter((r) => r.st.key === 'amber').length;
  const nClean = rows.filter((r) => r.st.key === 'clean').length;
  const nError = rows.filter((r) => r.st.key === 'error').length;
  // The unchecked figure proves the run completed — show it even at zero.
  const nUnchecked = rows.length - nReviewed - nError;

  const tbody = rows.map((r, i) => `
    <tr class="row" data-status="${r.st.key}"
        data-text="${esc((r.title + ' ' + r.slug).toLowerCase())}"
        data-red="${r.red}" data-amber="${r.amber}" data-idx="${i}"
        ${r.reviewed || r.st.key === 'error' ? `onclick="openRow(event,'${esc(r.slug)}')"` : ''}
        ${r.reviewed || r.st.key === 'error' ? 'style="cursor:pointer"' : ''}>
      <td class="idx">${i + 1}</td>
      <td class="title">
        <div class="t">${esc(r.title)}</div>
        <div class="s"><code>${esc(r.slug)}</code></div>
      </td>
      <td class="stcell"><span class="st ${r.st.cls}"${r.st.title ? ` title="${esc(r.st.title)}"` : ''}>${esc(r.st.text)}</span></td>
      <td class="nowrap">${esc(r.publishedAt || '—')}</td>
      <td class="links">
        ${r.reviewed || r.st.key === 'error' ? `<a href="${esc(r.slug)}.html" onclick="event.stopPropagation()">Review page</a>` : '<span class="muted">—</span>'}
        <a href="https://www.granola.ai/blog/${esc(r.slug)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">Live ↗</a>
      </td>
    </tr>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Granola SEO — consent &amp; disclosure review</title>
<style>
  :root{--bg:#fbfbfa;--card:#fff;--ink:#1a1a1a;--muted:#6b7280;--line:#e5e7eb;--accent:#4f46e5;
        --red:#b91c1c;--redbg:#fee2e2;--amber:#b45309;--amberbg:#fef3c7;--ok:#15803d;--okbg:#dcfce7}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:1280px;margin:0 auto;padding:26px 22px 70px}
  .topnav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}
  .topnav a{font-size:13px;padding:6px 13px;border:1px solid var(--line);border-radius:8px;
            background:var(--card);text-decoration:none;color:var(--muted)}
  .topnav a:hover{border-color:var(--accent);color:var(--accent)}
  .topnav a.on{background:var(--ink);color:#fff;border-color:var(--ink);font-weight:600}
  h1{font-size:22px;margin:0 0 4px}
  .sub{color:var(--muted);font-size:13px;margin:0 0 18px}
  .summary{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
  .sm{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:9px 14px;font-size:13px}
  .sm b{font-size:17px;display:block;line-height:1.25}
  .sm.red b{color:var(--red)} .sm.amber b{color:var(--amber)} .sm.clean b{color:var(--ok)}
  .sm.unchecked b{color:#334155} .sm.error b{color:var(--red)}
  .controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}
  #filter{flex:1;min-width:230px;max-width:430px;padding:8px 12px;font:inherit;font-size:14px;
          border:1px solid var(--line);border-radius:8px;background:var(--card)}
  .chips{display:flex;gap:6px;flex-wrap:wrap}
  .chip{padding:6px 13px;border:1px solid var(--line);border-radius:999px;background:var(--card);
        font-size:13px;cursor:pointer;user-select:none}
  .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  select{padding:7px 10px;border:1px solid var(--line);border-radius:8px;background:var(--card);font:inherit;font-size:13px}
  .count{color:var(--muted);font-size:12.5px;margin-bottom:8px}
  .tablewrap{background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
  table{border-collapse:collapse;width:100%;font-size:14px}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);vertical-align:top}
  th{background:#f6f6f5;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);font-weight:700}
  tr.row:hover{background:#f9f9ff}
  td.idx{color:var(--muted);text-align:right;width:46px;font-variant-numeric:tabular-nums}
  td.title .t{font-weight:600;line-height:1.35}
  td.title .s{font-size:12px;color:var(--muted);margin-top:2px}
  td.nowrap{white-space:nowrap;color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
  td.links a{color:var(--accent);text-decoration:none;font-size:13px;margin-right:12px;white-space:nowrap}
  td.links a:hover{text-decoration:underline}
  .st{display:inline-block;padding:3px 11px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}
  .st-queued{background:#f0f0f0;color:#6b7280}
  .st-checking{background:#f0f0f0;color:#6b7280;animation:blink 1.3s ease-in-out infinite}
  @keyframes blink{50%{opacity:.45}}
  .st-clean{background:var(--okbg);color:var(--ok)}
  .st-amber{background:var(--amberbg);color:var(--amber)}
  .st-red{background:var(--redbg);color:var(--red)}
  .st-error{background:#fff;color:var(--red);border:1px solid var(--red)}
  .muted{color:var(--muted)}
  code{background:#f1f1f0;padding:1px 5px;border-radius:4px;font-size:12px}
  footer{color:var(--muted);font-size:12px;margin-top:26px}
</style></head><body><div class="wrap">
  <nav class="topnav">
    <a href="/seo-audit">All articles</a>
    <a href="index.html" class="on">Review status</a>
    <a href="/seo-review/changes">Change log</a>
  </nav>
  <h1>Granola SEO — consent &amp; disclosure review</h1>
  <p class="sub">Sanity <code>oy7f1h9b/production</code> · <code>*[_type == "post" &amp;&amp; hidden == true]</code> ·
     Generated ${esc(generatedAt)} · RULES.md sha256 <code>${esc(rulesHash)}</code></p>

  <div class="summary">
    <div class="sm"><b>${expected}</b>in scope</div>
    <div class="sm"><b>${nReviewed}</b>reviewed</div>
    <div class="sm red"><b>${nRed}</b>red</div>
    <div class="sm amber"><b>${nAmber}</b>amber</div>
    <div class="sm clean"><b>${nClean}</b>clean</div>
    <div class="sm unchecked"><b>${nUnchecked}</b>unchecked</div>
    <div class="sm error"><b>${nError}</b>error</div>
  </div>

  <div class="controls">
    <input id="filter" placeholder="Filter by title or slug…" oninput="applyFilters()">
    <div class="chips" id="chips">
      <span class="chip on" data-f="all">All</span>
      <span class="chip" data-f="red">Red</span>
      <span class="chip" data-f="amber">Amber</span>
      <span class="chip" data-f="clean">Clean</span>
      <span class="chip" data-f="unchecked">Unchecked</span>
      <span class="chip" data-f="error">Error</span>
    </div>
    <select id="sort" onchange="applySort()">
      <option value="worst">Sort: worst first (red ↓, amber ↓)</option>
      <option value="original">Sort: original order</option>
    </select>
  </div>
  <div class="count" id="count"></div>

  <div class="tablewrap"><table id="tbl">
    <thead><tr><th>#</th><th>Article</th><th>Status</th><th>Published</th><th>Links</th></tr></thead>
    <tbody id="tbody">${tbody}</tbody>
  </table></div>

  <footer>
    Status is generated from <code>state.json</code>; it is never hand-written. “Unchecked” counts articles with no
    completed check — it is shown even at zero, because that is the number that proves the run completed.
  </footer>
</div>
<script>
  var activeFilter = 'all';
  function openRow(e, slug){ if (e.target.tagName === 'A') return; location.href = slug + '.html'; }
  function applyFilters(){
    var q = (document.getElementById('filter').value || '').trim().toLowerCase();
    var shown = 0, rows = document.querySelectorAll('#tbody tr.row');
    rows.forEach(function(tr){
      var st = tr.getAttribute('data-status');
      var matchStatus = activeFilter === 'all' ? true
        : activeFilter === 'unchecked' ? (st === 'queued' || st === 'checking')
        : st === activeFilter;
      var matchText = !q || tr.getAttribute('data-text').indexOf(q) !== -1;
      var show = matchStatus && matchText;   // chips COMBINE with the text filter
      tr.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    document.getElementById('count').textContent = 'Showing ' + shown + ' of ' + rows.length;
  }
  document.getElementById('chips').addEventListener('click', function(e){
    var c = e.target.closest('.chip'); if (!c) return;
    document.querySelectorAll('.chip').forEach(function(x){ x.classList.remove('on'); });
    c.classList.add('on'); activeFilter = c.getAttribute('data-f'); applyFilters();
  });
  function applySort(){
    var mode = document.getElementById('sort').value;
    var tbody = document.getElementById('tbody');
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr.row'));
    rows.sort(function(a,b){
      if (mode === 'original') return (+a.getAttribute('data-idx')) - (+b.getAttribute('data-idx'));
      var ar = +a.getAttribute('data-red'), br = +b.getAttribute('data-red');
      if (ar !== br) return br - ar;
      var aa = +a.getAttribute('data-amber'), ba = +b.getAttribute('data-amber');
      if (aa !== ba) return ba - aa;
      return (+a.getAttribute('data-idx')) - (+b.getAttribute('data-idx'));
    });
    rows.forEach(function(r){ tbody.appendChild(r); });
  }
  applySort(); applyFilters();
</script>
</body></html>`;
}
