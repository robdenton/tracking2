// Render one article's review page: full prose with inline highlights, a
// sticky side panel of findings in document order, prev/next nav bound to the
// arrow keys, and accept/dismiss decisions persisted in localStorage.
//
// A page is produced for EVERY article including clean ones — a clean page you
// can open is how you know it was actually read.

import { buildRanges } from './anchor.mjs';

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const DISPOSITION_CLASS = {
  red: 'd-red',
  amber: 'd-amber',
  'cleared-negated': 'd-cleared',
  'cleared-in-context': 'd-cleared',
  'about-competitor': 'd-competitor',
  'not-audited': 'd-notaudited',
};

const SANITY_STUDIO = (id) =>
  `https://oy7f1h9b.sanity.studio/structure/post;${encodeURIComponent(id)}`;

// Render one segment's text with its highlights spliced in.
function renderSegmentText(seg, findings) {
  const ranges = buildRanges(findings);
  if (ranges.length === 0) return esc(seg.text);
  let out = '';
  let cursor = 0;
  for (const r of ranges) {
    out += esc(seg.text.slice(cursor, r.start));
    const nums = r.findings.map((f) => f.number);
    // Worst disposition wins the colour: red > amber > competitor > cleared.
    const rank = (d) => (d === 'red' ? 0 : d === 'amber' ? 1 : d === 'about-competitor' ? 2 : 3);
    const worst = [...r.findings].sort((a, b) => rank(a.disposition) - rank(b.disposition))[0];
    const cls = DISPOSITION_CLASS[worst.disposition] || 'd-cleared';
    out += `<mark class="hl ${cls}" data-findings="${nums.join(',')}" id="hl-${nums[0]}" tabindex="0">` +
      esc(seg.text.slice(r.start, r.end)) +
      `<sup class="hlnum">${nums.join(',')}</sup></mark>`;
    cursor = r.end;
  }
  out += esc(seg.text.slice(cursor));
  return out;
}

// Group segments into labelled sections so every text-bearing field is shown.
function renderBody(segments, findingsBySeg) {
  const parts = [];
  const meta = segments.filter((s) => ['title', 'slug', 'summary'].includes(s.field));
  const bodySegs = segments.filter((s) => !['title', 'slug', 'summary'].includes(s.field));

  const seg = (s) => renderSegmentText(s, findingsBySeg.get(s.id) || []);

  if (meta.length) {
    parts.push('<section class="fieldgroup"><h3 class="fieldlabel">Title, slug &amp; meta/summary</h3>');
    for (const s of meta) {
      parts.push(`<div class="metafield"><span class="metakey">${esc(s.label)}</span><div class="metaval">${seg(s)}</div></div>`);
    }
    parts.push('</section>');
  }

  parts.push('<section class="fieldgroup"><h3 class="fieldlabel">Article body</h3>');
  let inList = false;
  for (const s of bodySegs) {
    const isList = s.field === 'listItem';
    if (isList && !inList) { parts.push('<ul class="body-list">'); inList = true; }
    if (!isList && inList) { parts.push('</ul>'); inList = false; }

    switch (s.field) {
      case 'heading': {
        const lvl = Math.min(Math.max(s.meta?.level || 2, 2), 4);
        parts.push(`<h${lvl} class="body-h">${seg(s)}</h${lvl}>`);
        break;
      }
      case 'blockquote':
        parts.push(`<blockquote class="body-quote"><span class="tag-inline">Blockquote / testimonial</span>${seg(s)}</blockquote>`);
        break;
      case 'listItem':
        parts.push(`<li>${seg(s)}</li>`);
        break;
      case 'tableHeader':
      case 'tableCell':
        parts.push(`<div class="cell"><span class="tag-inline">${esc(s.label)}</span>${seg(s)}</div>`);
        break;
      case 'linkText':
        parts.push(`<div class="cell"><span class="tag-inline">Link text${s.meta?.href ? ` → ${esc(s.meta.href)}` : ''}</span>${seg(s)}</div>`);
        break;
      case 'linkHref':
        parts.push(`<div class="cell url"><span class="tag-inline">Link URL</span>${seg(s)}</div>`);
        break;
      default:
        parts.push(`<p class="body-p">${seg(s)}</p>`);
    }
  }
  if (inList) parts.push('</ul>');
  parts.push('</section>');
  return parts.join('\n');
}

function renderPanel(findings) {
  if (findings.length === 0) {
    return '<p class="clean">✓ No findings on this article. Every text-bearing field was read; nothing failed the governing test.</p>';
  }
  return findings.map((f) => `
    <div class="finding ${DISPOSITION_CLASS[f.disposition] || 'd-cleared'}" id="finding-${f.number}" data-num="${f.number}">
      <div class="fhead">
        <span class="fnum">${f.number}</span>
        <span class="fdisp">${esc(f.disposition)}</span>
        <span class="flayer" title="Which layer caught it">Layer ${esc(f.layer)}${f.term ? ` · "${esc(f.term)}"` : ''}</span>
      </div>
      <div class="ffield">${esc(f.label)}</div>
      <blockquote class="fquote">${esc(f.quote)}</blockquote>
      <div class="ftake"><b>Reader takeaway:</b> ${esc(f.reader_takeaway)}</div>
      ${f.suggested_rewrite ? `<div class="frewrite"><b>Suggested rewrite:</b> ${esc(f.suggested_rewrite)}</div>` : ''}
      <div class="fdecide">
        <label><input type="radio" name="dec-${f.number}" value="accept" data-num="${f.number}"> Accept</label>
        <label><input type="radio" name="dec-${f.number}" value="dismiss" data-num="${f.number}"> Dismiss</label>
        <button class="clearbtn" data-num="${f.number}" type="button" title="Remove this suggestion from the list and record it as discarded">Discard</button>
      </div>
      <div class="fstatus" data-num="${f.number}"></div>
      <textarea class="fnote" data-num="${f.number}" rows="2" placeholder="Note…"></textarea>
    </div>`).join('\n');
}

export function renderArticlePage({ post, segments, findings, counts, prev, next, generatedAt, rulesHash, buildError }) {
  const findingsBySeg = new Map();
  for (const f of findings) {
    if (!findingsBySeg.has(f.segmentId)) findingsBySeg.set(f.segmentId, []);
    findingsBySeg.get(f.segmentId).push(f);
  }

  const countPills = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([d, n]) => `<span class="pill ${DISPOSITION_CLASS[d] || 'd-cleared'}">${esc(d)} ${n}</span>`)
    .join(' ') || '<span class="pill d-clean">clean</span>';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review — ${esc(post.title)}</title>
<style>
  :root{--bg:#fbfbfa;--card:#fff;--ink:#1a1a1a;--muted:#6b7280;--line:#e5e7eb;--accent:#4f46e5;
        --red:#b91c1c;--redbg:#fee2e2;--amber:#b45309;--amberbg:#fef3c7;--comp:#7c3aed;--compbg:#ede9fe;--clr:#6b7280;--ok:#15803d}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
       font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  header{background:var(--card);border-bottom:1px solid var(--line);padding:16px 24px;position:sticky;top:0;z-index:20}
  h1{font-size:19px;margin:0 0 6px;line-height:1.35}
  .meta{color:var(--muted);font-size:13px;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center}
  .meta a{color:var(--accent)}
  .nav{display:flex;gap:8px;margin-top:10px;align-items:center;flex-wrap:wrap}
  .nav a,.nav span{font-size:13px;padding:5px 11px;border:1px solid var(--line);border-radius:7px;
       background:var(--card);text-decoration:none;color:var(--ink)}
  .nav a:hover{border-color:var(--accent);color:var(--accent)}
  .nav .disabled{color:#c0c0c0}
  .nav .sep{border:none;padding:0;width:10px}
  .wrap{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:28px;max-width:1500px;margin:0 auto;padding:24px}
  @media (max-width:1100px){.wrap{grid-template-columns:1fr}.panel{position:static!important;max-height:none!important}}
  .prose{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:28px 32px;
         max-width:72ch;line-height:1.75}
  .fieldgroup{margin-bottom:28px}
  .fieldlabel{font-size:11px;text-transform:uppercase;letter-spacing:.09em;color:var(--muted);
              font-weight:700;border-bottom:1px solid var(--line);padding-bottom:6px;margin:0 0 14px}
  .metafield{margin-bottom:12px}
  .metakey{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
  .metaval{font-size:15px}
  .body-h{margin:26px 0 10px;line-height:1.35}
  h2.body-h{font-size:22px} h3.body-h{font-size:18px} h4.body-h{font-size:16px}
  .body-p{margin:0 0 15px}
  .body-list{margin:0 0 15px 22px} .body-list li{margin-bottom:7px}
  .body-quote{margin:0 0 16px;padding:10px 16px;border-left:3px solid var(--accent);background:#f8f7ff;font-style:italic}
  .cell{margin:0 0 8px;padding:7px 10px;background:#f8f8f7;border-radius:6px;font-size:14px}
  .cell.url{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;word-break:break-all}
  .tag-inline{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:2px;font-style:normal}
  mark.hl{padding:1px 0;border-radius:2px;cursor:pointer;background:none}
  mark.hl.d-red{background:var(--redbg);box-shadow:0 1px 0 var(--red)}
  mark.hl.d-amber{background:var(--amberbg);box-shadow:0 1px 0 var(--amber)}
  mark.hl.d-competitor{background:var(--compbg);box-shadow:0 1px 0 var(--comp)}
  mark.hl.d-cleared,mark.hl.d-notaudited{background:none;border-bottom:2px dotted #b6b6b6;color:#555}
  mark.hl:focus{outline:2px solid var(--accent)}
  mark.hl.pulse{animation:pulse 1.1s ease-out 2}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.55)}50%{box-shadow:0 0 0 7px rgba(79,70,229,0)}}
  .hlnum{font-size:10px;font-weight:700;color:var(--accent);vertical-align:super;margin-left:1px}
  .panel{position:sticky;top:104px;max-height:calc(100vh - 128px);overflow:auto}
  .panelhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px}
  .panelhead h2{font-size:14px;margin:0;text-transform:uppercase;letter-spacing:.07em;color:var(--muted)}
  .finding{background:var(--card);border:1px solid var(--line);border-left-width:4px;border-radius:9px;
           padding:13px 15px;margin-bottom:11px;font-size:13.5px;scroll-margin-top:110px}
  .finding.d-red{border-left-color:var(--red)} .finding.d-amber{border-left-color:var(--amber)}
  .finding.d-competitor{border-left-color:var(--comp)} .finding.d-cleared,.finding.d-notaudited{border-left-color:#c9c9c9}
  .finding.active{box-shadow:0 0 0 2px var(--accent)}
  .fhead{display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap}
  .fnum{background:var(--accent);color:#fff;border-radius:50%;width:21px;height:21px;display:inline-flex;
        align-items:center;justify-content:center;font-size:11px;font-weight:700;flex:none}
  .fdisp{font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .d-red .fdisp{color:var(--red)} .d-amber .fdisp{color:var(--amber)}
  .d-competitor .fdisp{color:var(--comp)} .d-cleared .fdisp,.d-notaudited .fdisp{color:var(--clr)}
  .flayer{font-size:11px;color:var(--muted);margin-left:auto}
  .ffield{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .fquote{margin:0 0 8px;padding:7px 11px;background:#f7f7f6;border-radius:6px;font-style:italic;font-size:13px}
  .ftake,.frewrite{margin-bottom:7px;font-size:13px}
  .frewrite{color:#065f46;background:#f0fdf4;padding:7px 10px;border-radius:6px}
  .fdecide{display:flex;gap:12px;align-items:center;font-size:12.5px;margin:9px 0 6px}
  .fdecide label{cursor:pointer} .clearbtn{margin-left:auto;font-size:11px;color:var(--muted);
        background:none;border:1px solid var(--line);border-radius:5px;padding:2px 7px;cursor:pointer}
  .fnote{width:100%;font:inherit;font-size:12.5px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;resize:vertical}
  .finding.decided-accept{background:#f0fdf4} .finding.decided-dismiss{opacity:.62}
  .finding.discarded{display:none}
  .panel.reveal-discarded .finding.discarded{display:block;opacity:.5;border-left-color:#c9c9c9}
  mark.hl.hl-discarded{background:none!important;box-shadow:none!important;border-bottom:1px dotted #d0d0d0;color:inherit}
  #outstanding{font-size:11px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted);margin-left:6px}
  #showdiscarded{font-size:11px;font-weight:400;text-transform:none;letter-spacing:0;margin-left:8px;color:var(--accent)}
  .fstatus{font-size:11.5px;margin:2px 0 6px;min-height:14px;color:var(--muted)}
  .fstatus.ok{color:#15803d;font-weight:600}
  .fstatus.warn{color:#b45309;font-weight:600}
  .pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:700}
  .pill.d-red{background:var(--redbg);color:var(--red)} .pill.d-amber{background:var(--amberbg);color:var(--amber)}
  .pill.d-competitor{background:var(--compbg);color:var(--comp)}
  .pill.d-cleared,.pill.d-notaudited{background:#f0f0f0;color:var(--clr)}
  .pill.d-clean{background:#dcfce7;color:var(--ok)}
  .clean{background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;padding:14px;border-radius:9px;font-size:14px}
  .exportbtn{font-size:12px;padding:5px 11px;border:1px solid var(--line);border-radius:7px;background:var(--card);cursor:pointer}
  .exportbtn:hover{border-color:var(--accent);color:var(--accent)}
  .builderr{background:#fee2e2;border:1px solid var(--red);color:var(--red);padding:12px 15px;border-radius:9px;margin-bottom:16px;font-size:13.5px}
  code{background:#f0f0ef;padding:1px 5px;border-radius:4px;font-size:12.5px}
</style></head><body>
<header>
  <h1>${esc(post.title)}</h1>
  <div class="meta">
    <span><code>${esc(post.slug)}</code></span>
    <span>Published ${esc(post.publishedAt || '—')}</span>
    <span><code>${esc(post._id)}</code></span>
    <a href="https://www.granola.ai/blog/${esc(post.slug)}" target="_blank" rel="noopener">Live page ↗</a>
    <a href="${SANITY_STUDIO(post._id)}" target="_blank" rel="noopener">Sanity Studio ↗</a>
    <span>${countPills}</span>
  </div>
  <div class="nav">
    <a href="/seo-audit">All articles</a>
    <a href="index.html">Review status</a>
    <a href="/seo-review/changes">Change log</a>
    <span class="sep"></span>
    ${prev ? `<a href="${esc(prev)}.html" id="prevlink">← Previous</a>` : '<span class="disabled">← Previous</span>'}
    ${next ? `<a href="${esc(next)}.html" id="nextlink">Next →</a>` : '<span class="disabled">Next →</span>'}
    <span class="disabled" style="border:none">← / → arrow keys</span>
  </div>
</header>
<div class="wrap">
  <main class="prose">
    ${buildError ? `<div class="builderr"><b>BUILD ERROR — this article is marked <code>error</code>.</b><br>${esc(buildError)}</div>` : ''}
    ${renderBody(segments, findingsBySeg)}
  </main>
  <aside class="panel">
    <div class="panelhead">
      <h2>Findings <span id="outstanding">${findings.length} of ${findings.length} outstanding</span>
        <a href="#" id="showdiscarded" style="display:none">show discarded</a></h2>
      <button class="exportbtn" id="export">Export decisions to CSV</button>
    </div>
    ${renderPanel(findings)}
  </aside>
</div>
<script>
(function(){
  var SLUG = ${JSON.stringify(post.slug)};
  var KEY = 'granola-review-decisions:' + SLUG;
  var FINDINGS = ${JSON.stringify(findings.map((f) => ({
    number: f.number, id: f.findingId, disposition: f.disposition, layer: f.layer, term: f.term || '',
    field: f.label, quote: f.quote, takeaway: f.reader_takeaway, rewrite: f.suggested_rewrite || '',
  })))};
  var API = '/api/seo-review/decisions';
  var idOf = {}; FINDINGS.forEach(function(f){ idOf[f.number] = f.id; });

  // ---- decisions persisted SERVER-SIDE ----
  // Accepting writes the rewrite to the article's Sanity draft. localStorage is
  // kept only as an offline mirror so a failed request is visibly unsaved
  // rather than silently lost.
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) { state = {}; }
  function mirror(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
  function paint(num){
    var el = document.getElementById('finding-' + num);
    if (!el) return;
    var d = state[num] || {};
    el.classList.toggle('decided-accept', d.decision === 'accept');
    el.classList.toggle('decided-dismiss', d.decision === 'dismiss');
  }
  function setStatus(num, text, cls){
    var el = document.querySelector('.fstatus[data-num="' + num + '"]');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'fstatus' + (cls ? ' ' + cls : '');
    el.setAttribute('data-num', num);
  }

  // Restore decisions from the server (authoritative), falling back to the
  // local mirror if the API is unreachable.
  function restore(){
    fetch(API + '?slug=' + encodeURIComponent(SLUG), {credentials:'same-origin'})
      .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(j){
        var byId = {}; (j.findings||[]).forEach(function(x){ byId[x.id] = x; });
        FINDINGS.forEach(function(f){
          var s = byId[f.id]; if (!s) return;
          state[f.number] = { decision: s.decision, note: s.note || '' };
          if (s.decision) {
            var r = document.querySelector('input[name="dec-' + f.number + '"][value="' + s.decision + '"]');
            if (r) r.checked = true;
          }
          if (s.note) { var t = document.querySelector('.fnote[data-num="' + f.number + '"]'); if (t) t.value = s.note; }
          if (s.decision === 'discard') { setStatus(f.number, 'Discarded', ''); hideFinding(f.number); }
          else if (s.appliedToDraft) setStatus(f.number, '✓ Written to the Sanity draft', 'ok');
          else if (s.decision === 'accept') setStatus(f.number, '⚠ Accepted but not yet written to the draft — click Accept again to retry', 'warn');
          paint(f.number);
        });
        mirror();
        updateOutstanding();
      })
      .catch(function(e){
        // Offline / not signed in: show local mirror but say it is unsaved.
        FINDINGS.forEach(function(f){
          var d = state[f.number]; if (!d) return;
          if (d.decision) {
            var r = document.querySelector('input[name="dec-' + f.number + '"][value="' + d.decision + '"]');
            if (r) r.checked = true;
          }
          if (d.note) { var t = document.querySelector('.fnote[data-num="' + f.number + '"]'); if (t) t.value = d.note; }
          setStatus(f.number, '⚠ Not saved to the server — this browser only', 'warn');
          paint(f.number);
        });
      });
  }
  restore();

  function send(num, decision, note){
    var id = idOf[num];
    if (!id) { setStatus(num, '⚠ No server id for this finding', 'warn'); return; }
    setStatus(num, 'Saving…', '');
    fetch(API, {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id: id, decision: decision, note: note || null }),
    })
      .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
      .then(function(res){
        if (!res.ok) { setStatus(num, '⚠ ' + (res.j.error || 'save failed'), 'warn'); return; }
        if (decision === 'accept') {
          if (res.j.appliedToDraft) {
            setStatus(num, res.j.alreadyApplied
              ? '✓ Already in the Sanity draft'
              : '✓ Written to the Sanity draft — not published', 'ok');
          } else {
            setStatus(num, '⚠ Saved, but NOT applied: ' + (res.j.warning || 'unknown reason'), 'warn');
          }
        } else if (decision === 'dismiss') {
          setStatus(num, res.j.warning ? '⚠ ' + res.j.warning : 'Dismissed', res.j.warning ? 'warn' : '');
        } else {
          setStatus(num, res.j.warning ? '⚠ ' + res.j.warning : '', res.j.warning ? 'warn' : '');
        }
      })
      .catch(function(e){ setStatus(num, '⚠ Save failed: ' + e.message, 'warn'); });
  }

  // Use 'click' rather than 'change' so re-selecting an already-selected option
  // retries. A previous attempt can fail (e.g. a bad token) leaving the choice
  // selected but unapplied — with 'change' alone that is a dead end.
  document.querySelectorAll('.fdecide input[type=radio]').forEach(function(r){
    r.addEventListener('click', function(){
      var n = r.getAttribute('data-num');
      state[n] = state[n] || {}; state[n].decision = r.value; mirror(); paint(n);
      send(n, r.value, (state[n] && state[n].note) || null);
    });
  });
  var noteTimer = {};
  document.querySelectorAll('.fnote').forEach(function(t){
    t.addEventListener('input', function(){
      var n = t.getAttribute('data-num');
      state[n] = state[n] || {}; state[n].note = t.value; mirror();
      clearTimeout(noteTimer[n]);
      noteTimer[n] = setTimeout(function(){
        if (state[n] && state[n].decision) send(n, state[n].decision, t.value);
      }, 900);
    });
  });
  // Discard: record the suggestion as deliberately rejected, then remove it from
  // the panel so what remains is what is still outstanding. It is NOT deleted —
  // it stays in the log as a discarded decision.
  function hideFinding(n){
    var el = document.getElementById('finding-' + n);
    if (el) el.classList.add('discarded');
    document.querySelectorAll('mark.hl').forEach(function(m){
      var nums = m.getAttribute('data-findings').split(',');
      if (nums.indexOf(String(n)) !== -1 && nums.length === 1) m.classList.add('hl-discarded');
    });
    updateOutstanding();
  }
  function updateOutstanding(){
    var all = document.querySelectorAll('.finding').length;
    var gone = document.querySelectorAll('.finding.discarded').length;
    var el = document.getElementById('outstanding');
    if (el) el.textContent = (all - gone) + ' of ' + all + ' outstanding';
    var t = document.getElementById('showdiscarded');
    if (t) t.style.display = gone ? 'inline' : 'none';
  }
  document.querySelectorAll('.clearbtn').forEach(function(b){
    b.addEventListener('click', function(){
      var n = b.getAttribute('data-num');
      state[n] = state[n] || {}; state[n].decision = 'discard'; mirror();
      document.querySelectorAll('input[name="dec-' + n + '"]').forEach(function(r){ r.checked = false; });
      setStatus(n, 'Discarded — recorded in the log', '');
      send(n, 'discard', (state[n] && state[n].note) || null);
      hideFinding(n);
    });
  });
  // Toggle to bring discarded suggestions back into view.
  var toggle = document.getElementById('showdiscarded');
  if (toggle) toggle.addEventListener('click', function(e){
    e.preventDefault();
    document.querySelector('.panel').classList.toggle('reveal-discarded');
    toggle.textContent = document.querySelector('.panel').classList.contains('reveal-discarded')
      ? 'hide discarded' : 'show discarded';
  });

  // ---- highlight <-> panel linking ----
  function activate(num){
    document.querySelectorAll('.finding.active').forEach(function(e){ e.classList.remove('active'); });
    var f = document.getElementById('finding-' + num);
    if (f) { f.classList.add('active'); f.scrollIntoView({behavior:'smooth', block:'center'}); }
  }
  document.querySelectorAll('mark.hl').forEach(function(m){
    m.addEventListener('click', function(){ activate(m.getAttribute('data-findings').split(',')[0]); });
  });
  document.querySelectorAll('.finding').forEach(function(el){
    el.addEventListener('click', function(e){
      if (e.target.closest('.fdecide') || e.target.closest('.fnote')) return;
      var num = el.getAttribute('data-num');
      var hl = document.querySelector('mark.hl[data-findings~="' + num + '"]')
            || document.getElementById('hl-' + num)
            || Array.prototype.find.call(document.querySelectorAll('mark.hl'), function(m){
                 return m.getAttribute('data-findings').split(',').indexOf(num) !== -1; });
      if (hl) {
        hl.scrollIntoView({behavior:'smooth', block:'center'});
        hl.classList.remove('pulse'); void hl.offsetWidth; hl.classList.add('pulse');
      }
    });
  });

  // ---- CSV export ----
  function csv(v){ v = v == null ? '' : String(v); return /[",\\n\\r]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v; }
  document.getElementById('export').addEventListener('click', function(){
    var head = ['slug','finding_number','disposition','layer','term','field','verbatim_quote','reader_takeaway','suggested_rewrite','decision','note'];
    var lines = [head.join(',')];
    FINDINGS.forEach(function(f){
      var d = state[f.number] || {};
      lines.push([SLUG,f.number,f.disposition,f.layer,f.term,f.field,f.quote,f.takeaway,f.rewrite,d.decision||'',d.note||''].map(csv).join(','));
    });
    var blob = new Blob([lines.join('\\n')], {type:'text/csv'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'decisions-' + SLUG + '.csv';
    a.click(); URL.revokeObjectURL(a.href);
  });

  // ---- arrow-key navigation ----
  document.addEventListener('keydown', function(e){
    var t = e.target.tagName;
    if (t === 'TEXTAREA' || t === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft')  { var p = document.getElementById('prevlink'); if (p) location.href = p.getAttribute('href'); }
    if (e.key === 'ArrowRight') { var n = document.getElementById('nextlink'); if (n) location.href = n.getAttribute('href'); }
  });
})();
</script>
<footer style="max-width:1500px;margin:0 auto;padding:0 24px 40px;color:#6b7280;font-size:12px">
  Generated ${esc(generatedAt)} · RULES.md sha256 <code>${esc(rulesHash)}</code> · model claude-opus-5
</footer>
</body></html>`;
}
