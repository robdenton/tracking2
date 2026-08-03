// Render results.json into a self-contained static HTML dashboard.
// Fully server-side rendered (no runtime JS needed to read it) so the page is
// as deterministic as the data behind it.

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Columns that every finding row carries; rendered specially.
const BASE_COLS = ['title', 'summary', 'url'];

function detailColumns(check) {
  const skip = new Set(['postId', 'title', 'summary', 'url']);
  const cols = new Set();
  for (const r of check.rows) for (const k of Object.keys(r)) if (!skip.has(k)) cols.add(k);
  return [...cols];
}

function postCell(r) {
  const link = r.url
    ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a>`
    : '<span class="muted">no slug</span>';
  return `<td class="title"><div class="t">${esc(r.title)}</div>` +
    `<div class="s">${esc(r.summary)}</div>` +
    `<div class="l">${link}</div></td>`;
}

function renderCheck(check) {
  const cols = detailColumns(check);
  if (check.count === 0) {
    return `<section id="${esc(check.id)}"><h2>${esc(check.title)} <span class="pill ok">0</span></h2>
      <p class="desc">${esc(check.description)}</p><p class="clean">✓ No findings.</p></section>`;
  }
  const head = `<tr><th>Post (title · summary · link)</th>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`;
  const body = check.rows.map((r) =>
    `<tr>${postCell(r)}${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('');
  return `<section id="${esc(check.id)}">
    <h2>${esc(check.title)} <span class="pill ${check.count ? 'bad' : 'ok'}">${check.count}</span>
      ${check.deterministic ? '<span class="tag det">deterministic</span>' : '<span class="tag net">network</span>'}</h2>
    <p class="desc">${esc(check.description)}</p>
    <div class="tablewrap"><table>${head}${body}</table></div>
  </section>`;
}

// The hero: every article, one row each, with title · summary · link · flags.
function renderArticles(results) {
  const arts = results.articles || [];
  const rows = arts.map((a, i) => {
    const link = a.url
      ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a>`
      : '<span class="muted">no slug</span>';
    return `<tr data-text="${esc((a.title + ' ' + a.slug).toLowerCase())}">
      <td class="idx">${i + 1}</td>
      <td class="title"><div class="t">${esc(a.title)}</div><div class="l">${link}</div></td>
    </tr>`;
  }).join('');
  return `<section id="all-articles">
    <h2>All articles <span class="pill">${arts.length}</span></h2>
    <input id="filter" placeholder="Filter by title or slug…" oninput="filterArticles(this.value)">
    <div class="tablewrap"><table id="articles">
      <tr><th>#</th><th>Title &amp; link</th></tr>
      ${rows}
    </table></div>
  </section>
  <script>
    function filterArticles(q){
      q=q.trim().toLowerCase();
      for(const tr of document.querySelectorAll('#articles tr[data-text]')){
        tr.style.display = !q || tr.getAttribute('data-text').includes(q) ? '' : 'none';
      }
    }
  </script>`;
}

const STYLE = `<style>
  :root{--bg:#fafafa;--card:#fff;--ink:#1a1a1a;--muted:#6b7280;--line:#e5e7eb;--bad:#b91c1c;--ok:#15803d;--accent:#4f46e5}
  *{box-sizing:border-box}
  body{margin:0;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
  .wrap{max-width:1200px;margin:0 auto;padding:28px 20px 80px}
  h1{font-size:22px;margin:0 0 4px}
  .meta{color:var(--muted);margin:0 0 24px}
  .meta b{color:var(--ink)}
  .warn{color:var(--bad);font-weight:600;margin-left:8px}
  h2{font-size:17px;margin:34px 0 6px;scroll-margin-top:16px}
  .desc{color:var(--muted);margin:0 0 12px;max-width:80ch}
  table{border-collapse:collapse;width:100%;background:var(--card);font-size:13px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}
  th{background:#f3f4f6;font-weight:600;position:sticky;top:0}
  .tablewrap{overflow-x:auto;border:1px solid var(--line);border-radius:8px}
  td.title{min-width:320px;max-width:460px}
  td.title .t{font-weight:600}
  td.title .s{color:var(--muted);font-size:12px;margin:2px 0}
  td.title .l a{color:var(--accent);text-decoration:none;font-size:12px;word-break:break-all}
  .overview{border:1px solid var(--line);border-radius:8px;overflow:hidden;max-width:640px}
  .overview td.num{font-weight:700;text-align:right;font-variant-numeric:tabular-nums}
  .num.bad,.pill.bad{color:var(--bad)} .num.ok{color:var(--ok)}
  .pill{display:inline-block;min-width:22px;text-align:center;padding:1px 8px;border-radius:999px;font-size:13px;font-weight:700;background:#f3f4f6}
  .pill.bad{background:#fee2e2}.pill.ok{background:#dcfce7;color:var(--ok)}
  .tag{display:inline-block;font-size:11px;padding:1px 7px;border-radius:6px;margin-left:6px;font-weight:600;vertical-align:middle}
  .tag.det{background:#eef2ff;color:#4338ca}.tag.net{background:#fff7ed;color:#c2410c}
  .clean{color:var(--ok)} .muted{color:var(--muted)}
  a{color:var(--accent)}
  code{background:#f3f4f6;padding:1px 4px;border-radius:4px}
  td.idx{color:var(--muted);text-align:right;font-variant-numeric:tabular-nums}
  td.sum{color:#374151;max-width:420px;font-size:12px}
  td.nowrap{white-space:nowrap;font-variant-numeric:tabular-nums;color:var(--muted)}
  td.num{text-align:right;font-variant-numeric:tabular-nums}
  td.flags{min-width:180px}
  .flag{display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;padding:1px 6px;border-radius:5px;margin:1px 2px;white-space:nowrap}
  #filter{width:100%;max-width:520px;padding:8px 12px;margin:0 0 12px;border:1px solid var(--line);border-radius:8px;font-size:14px}
  #articles td.title{min-width:280px;max-width:360px}
</style>`;

// The page body (everything inside .wrap) — shared by the standalone file and
// the hosted Artifact so both stay identical.
function bodyContent(results) {
  const overview = results.checks.map((c) =>
    `<tr>
      <td><a href="#${esc(c.id)}">${esc(c.title)}</a></td>
      <td class="num ${c.count ? 'bad' : 'ok'}">${c.count}</td>
      <td>${c.deterministic ? '<span class="tag det">deterministic</span>' : '<span class="tag net">network</span>'}</td>
    </tr>`).join('');

  const countWarn = results.inScope !== results.expected
    ? `<span class="warn">⚠ in-scope ${results.inScope} ≠ expected ${results.expected}</span>` : '';

  return `<div class="wrap">
  <h1>Granola SEO Audit</h1>
  <p class="meta">
    Project <b>${esc(results.project)}</b> ·
    Generated <b>${esc(results.generatedAt)}</b> ·
    In scope <b>${esc(results.inScope)}</b> posts ${countWarn} ·
    Links checked <b>${esc(results.linksChecked)}</b>${results.linksSkipped ? ' <span class="tag net">links skipped</span>' : ''}
  </p>
  ${renderArticles(results)}
  <h2 style="margin-top:44px;border-top:2px solid var(--line);padding-top:24px">Findings by check</h2>
  ${results.checks.map(renderCheck).join('')}
  <h2 style="margin-top:44px;border-top:2px solid var(--line);padding-top:24px">Check summary</h2>
  <div class="overview"><table>
    <tr><th>Check</th><th class="num">Findings</th><th>Type</th></tr>
    ${overview}
  </table></div>
  <p class="meta" style="margin-top:40px">
    <b>deterministic</b> = computed purely from the content snapshot (identical every run).
    <b>network</b> = depends on live HTTP checks at generation time and can vary as target sites change.
  </p>
</div>`;
}

// Standalone HTML file (local report.html).
export function renderReport(results) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Granola SEO Audit — ${esc(results.generatedAt)}</title>
${STYLE}</head><body>${bodyContent(results)}</body></html>`;
}

// Artifact body — no doctype/html/head/body (the Artifact host supplies them).
export function renderArtifact(results) {
  return `<title>Granola SEO Audit</title>\n${STYLE}\n${bodyContent(results)}`;
}
