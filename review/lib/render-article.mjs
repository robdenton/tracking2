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
  `https://www.granola.ai/studio/structure/seoPosts;${encodeURIComponent(id)}`;

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
    <div class="finding ${DISPOSITION_CLASS[f.disposition] || 'd-cleared'}${['cleared-in-context', 'cleared-negated', 'about-competitor'].includes(f.disposition) ? ' is-cleared' : ''}" id="finding-${f.number}" data-num="${f.number}" data-disposition="${esc(f.disposition)}">
      <div class="fhead">
        <span class="fnum">${f.number}</span>
        <span class="fdisp">${esc(f.disposition)}</span>
        ${f.category && f.category !== 'disclosure' ? `<span class="fcat cat-${esc(f.category)}">${f.category === 'accuracy' ? 'FACTUAL ACCURACY' : 'BOT DENIGRATION'}</span>` : ''}
        <span class="flayer" title="Which layer caught it">Layer ${esc(f.layer)}${f.term ? ` · "${esc(f.term)}"` : ''}</span>
      </div>
      <div class="fdone" aria-hidden="true"></div>
      <div class="fbody">
      <div class="ffield">${esc(f.label)}</div>
      <blockquote class="fquote">${esc(f.quote)}</blockquote>
      <div class="ftake"><b>Reader takeaway:</b> ${esc(f.reader_takeaway)}</div>
      ${f.deferredToNumber ? `<div class="fdefer">Remedy handled by finding <a href="#finding-${f.deferredToNumber}" class="deferlink" data-goto="${f.deferredToNumber}">#${f.deferredToNumber}</a>, which is anchored to the full phrase.</div>` : ''}
      ${f.deletion_scope && !['none', 'not-advisable'].includes(f.deletion_scope) ? `<div class="fdelete"><b>Option A — delete the ${esc(f.deletion_scope)}:</b> ${esc(f.deletion_rationale || 'Removes the claim entirely.')}</div>` : ''}
      ${f.deletion_scope === 'not-advisable' ? `<div class="fdelete muted-note"><b>Deletion not advised:</b> ${esc(f.deletion_rationale || '')}</div>` : ''}
      ${f.suggested_rewrite ? `<div class="frewrite" data-num="${f.number}"><b>Option B — rewrite the ${esc(f.rewrite_scope || 'sentence')}:</b> ${esc(f.suggested_rewrite)}</div>` : ''}
      <div class="fdecide">
        ${f.deletion_scope && !['none', 'not-advisable'].includes(f.deletion_scope) ? `<label><input type="radio" name="dec-${f.number}" value="accept-delete" data-num="${f.number}"> Delete</label>` : ''}
        ${f.suggested_rewrite ? `<label><input type="radio" name="dec-${f.number}" value="accept" data-num="${f.number}"> Rewrite</label>` : ''}
        <button class="clearbtn" data-num="${f.number}" type="button" title="Remove this suggestion from the list and record it as discarded">Discard</button>
      </div>
      <div class="fstatus" data-num="${f.number}"></div>
      ${f.suggested_rewrite ? `
      <div class="freprompt">
        <textarea class="fdirect" data-num="${f.number}" rows="2"
          placeholder="Not happy with the rewrite? Say what to change and generate a new one…"></textarea>
        <button type="button" class="regenbtn" data-num="${f.number}">Generate new rewrite</button>
        <div class="regenout" data-num="${f.number}"></div>
      </div>` : ''}
      <textarea class="fnote" data-num="${f.number}" rows="2" placeholder="Note (saved with your decision)…"></textarea>
      </div>
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
  .fcat{font-size:10px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:5px}
  .cat-accuracy{background:#1e1b4b;color:#fff}
  .cat-bot-denigration{background:#7c2d12;color:#fff}
  .ffield{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  .fquote{margin:0 0 8px;padding:7px 11px;background:#f7f7f6;border-radius:6px;font-style:italic;font-size:13px}
  .ftake,.frewrite{margin-bottom:7px;font-size:13px}
  .frewrite{color:#065f46;background:#f0fdf4;padding:7px 10px;border-radius:6px;margin-bottom:7px}
  .fdelete{color:#7c2d12;background:#fff7ed;padding:7px 10px;border-radius:6px;margin-bottom:7px}
  .fdelete.muted-note{color:var(--muted);background:#f7f7f6}
  .fdefer{font-size:12px;color:var(--muted);background:#f4f4ff;border-left:2px solid var(--accent);
          padding:6px 9px;border-radius:5px;margin-bottom:7px}
  .fdefer a{color:var(--accent);font-weight:600}
  .fdecide{display:flex;gap:12px;align-items:center;font-size:12.5px;margin:9px 0 6px}
  .fdecide label{cursor:pointer} .clearbtn{margin-left:auto;font-size:11px;color:var(--muted);
        background:none;border:1px solid var(--line);border-radius:5px;padding:2px 7px;cursor:pointer}
  .freprompt{margin:4px 0 7px}
  .fdirect{width:100%;font:inherit;font-size:12.5px;padding:6px 8px;border:1px solid var(--line);
           border-radius:6px;resize:vertical;background:#fcfcff}
  .regenbtn{margin-top:5px;font-size:11.5px;padding:4px 10px;border:1px solid var(--accent);
            color:var(--accent);background:var(--card);border-radius:6px;cursor:pointer;font-weight:600}
  .regenbtn:hover:not(:disabled){background:var(--accent);color:#fff}
  .regenbtn:disabled{opacity:.55;cursor:default}
  .regenout{font-size:12.5px;margin-top:6px}
  .newrw{background:#f0fdf4;border-left:3px solid #16a34a;padding:8px 10px;border-radius:6px;color:#065f46}
  .newrw .why{color:#3f6212;font-size:11.5px;margin-top:4px}
  .newrw .acts{margin-top:6px;display:flex;gap:8px}
  .newrw button{font-size:11.5px;padding:3px 9px;border-radius:5px;cursor:pointer;border:1px solid var(--line);background:#fff}
  .newrw button.use{border-color:#16a34a;color:#166534;font-weight:600}
  .regenerr{background:#fef3c7;border-left:3px solid #d97706;padding:7px 10px;border-radius:6px;color:#78350f}
  .fnote{width:100%;font:inherit;font-size:12.5px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;resize:vertical}
  .finding.decided-accept{background:#f0fdf4} .finding.decided-dismiss{opacity:.62}
  /* Once decided, a finding collapses to a single line so the panel shows what
     is still outstanding at a glance. Click the header to reopen it. */
  .finding.collapsed{padding:8px 13px;cursor:pointer}
  .finding.collapsed .fbody{display:none}
  .finding.collapsed .fhead{margin-bottom:0}
  .finding.collapsed .fdone{display:block}
  .fdone{display:none;font-size:11.5px;font-weight:600;margin-top:3px}
  .finding.collapsed.decided-accept .fdone{color:#15803d}
  .finding.collapsed.decided-dismiss .fdone{color:var(--muted)}
  .finding.collapsed:hover{box-shadow:0 0 0 1px var(--accent)}
  .finding.discarded{display:none}
  /* Cleared items are listed for auditability but hidden by default — at ~70%
     of findings they drown the ones that need a decision. */
  .panel:not(.reveal-cleared) .finding.is-cleared{display:none}
  .panel.reveal-cleared .finding.is-cleared{opacity:.62}
  .panelfilters{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 10px;font-size:12px;color:var(--muted)}
  .tgl{display:inline-flex;align-items:center;gap:5px;cursor:pointer;user-select:none}
  .tgl input{margin:0}
  mark.hl.hl-cleared-hidden{background:none!important;box-shadow:none!important;
    border-bottom:1px dotted #d4d4d4;color:inherit}
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
  .manualbox{background:#fffbeb;border:1px solid #f0c674;border-radius:9px;padding:11px 13px;margin-bottom:11px}
  .manualhead{font-weight:700;font-size:13px;color:#92400e;margin-bottom:7px}
  .manualcount{font-weight:400;color:#a16207}
  .manualitem{background:#fff;border-left:3px solid #d97706;padding:8px 10px;border-radius:6px;margin-bottom:7px;font-size:12.5px}
  .manualitem .why{color:#78350f;margin-top:3px}
  .manualitem .txt{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;
                   background:#faf9f7;padding:5px 7px;border-radius:4px;margin-top:4px;display:block}
  .verifybox{background:var(--card);border:1px solid var(--line);border-radius:9px;padding:11px 13px;margin-bottom:11px}
  .verifyhead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:13px}
  .verifybtn{font-size:12px;padding:5px 11px;border:1px solid var(--accent);color:var(--accent);
             background:var(--card);border-radius:7px;cursor:pointer;font-weight:600}
  .verifybtn:hover{background:var(--accent);color:#fff}
  .verifyout{font-size:12.5px;color:var(--muted);line-height:1.5}
  .vissue{background:#fef3c7;border-left:3px solid #d97706;padding:7px 10px;border-radius:6px;margin:6px 0;color:#78350f}
  .vmanual{background:#eef2ff;border-left:3px solid var(--accent);padding:7px 10px;border-radius:6px;margin:6px 0;color:#312e81}
  .vidle{background:#f7f7f6;border-left:3px solid #c9c9c9;padding:7px 10px;border-radius:6px;color:var(--muted)}
  .vok{background:#f0fdf4;border-left:3px solid #16a34a;padding:7px 10px;border-radius:6px;color:#166534}
  .vsnip{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;display:block;margin-top:3px;opacity:.85}
  .loadwarn{background:#fef3c7;border:1px solid #f0c674;color:#92400e;padding:9px 12px;
            border-radius:8px;font-size:12.5px;margin-bottom:10px;line-height:1.45}
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
    <div id="loadwarn" class="loadwarn" style="display:none"></div>
    <div id="manualbox" class="manualbox" style="display:none">
      <div class="manualhead">Manual Reviews <span id="manualcount" class="manualcount"></span></div>
      <div id="manualout"></div>
    </div>
    <div class="verifybox">
      <div class="verifyhead">
        <b>Draft check</b>
        <span>
          <button type="button" id="repairbtn" class="verifybtn" style="display:none">Fix artifacts</button>
          <button type="button" id="verifybtn" class="verifybtn">Re-check</button>
        </span>
      </div>
      <div id="verifyout" class="verifyout">Checking the draft…</div>
    </div>
    <div class="panelhead">
      <h2>Findings <span id="outstanding"></span></h2>
      <div class="panelfilters">
        <label class="tgl"><input type="checkbox" id="tglcleared"> Show cleared (<span id="nclr">0</span>)</label>
        <label class="tgl"><input type="checkbox" id="tgldiscarded"> Show discarded (<span id="ndis">0</span>)</label>
      </div>
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
    var isAccept = d.decision === 'accept' || d.decision === 'accept-delete';
    el.classList.toggle('decided-accept', isAccept);
    el.classList.toggle('decided-dismiss', d.decision === 'dismiss');
    // Collapse anything decided, unless the reviewer has reopened it.
    if (d.decision && !el.dataset.reopened) el.classList.add('collapsed');
    if (!d.decision) el.classList.remove('collapsed');
  }
  function setDone(num, text){
    var el = document.getElementById('finding-' + num);
    if (!el) return;
    var d = el.querySelector('.fdone');
    if (d) d.textContent = text;
  }
  // Clicking a collapsed card reopens it for review.
  document.addEventListener('click', function(e){
    var card = e.target.closest('.finding.collapsed');
    if (!card) return;
    if (e.target.closest('.fdecide') || e.target.closest('.fnote')) return;
    card.dataset.reopened = '1';
    card.classList.remove('collapsed');
  });
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
      .then(function(r){
        if (!r.ok) {
          return r.text().then(function(t){
            throw new Error('HTTP ' + r.status + (t ? ' — ' + t.slice(0, 160) : ''));
          });
        }
        return r.json();
      })
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
          else if (s.appliedToDraft) { setStatus(f.number, '✓ Written to the Sanity draft', 'ok'); setDone(f.number, '✓ Written to the Sanity draft'); }
          else if (s.decision === 'dismiss') setDone(f.number, 'Dismissed — no change made');
          else if (s.decision === 'accept') setStatus(f.number, '⚠ Accepted but not yet written to the draft — click Accept again to retry', 'warn');
          paint(f.number);
        });
        mirror();
        updateOutstanding();
      })
      .catch(function(e){
        // Offline / not signed in: show local mirror but say it is unsaved.
        // Say WHY, not just that it failed — a bare "not saved" gives no way to
        // diagnose. Shown once at the top rather than on every finding.
        var banner = document.getElementById('loadwarn');
        if (banner) {
          banner.style.display = 'block';
          banner.textContent = '⚠ Could not load saved decisions: ' + e.message +
            '  — anything you change now is stored in this browser only. Reload once you are signed in.';
        }
        FINDINGS.forEach(function(f){
          var d = state[f.number]; if (!d) return;
          if (d.decision) {
            var r = document.querySelector('input[name="dec-' + f.number + '"][value="' + d.decision + '"]');
            if (r) r.checked = true;
          }
          if (d.note) { var t = document.querySelector('.fnote[data-num="' + f.number + '"]'); if (t) t.value = d.note; }
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
        if (decision === 'accept' || decision === 'accept-delete') {
          if (res.j.appliedToDraft) {
            var msg = res.j.alreadyApplied
              ? '✓ Already in the Sanity draft'
              : (res.j.deleted
                  ? '✓ ' + (res.j.scope === 'paragraph' ? 'Paragraph' : 'Sentence') + ' removed in the Sanity draft — not published'
                  : '✓ Written to the Sanity draft — not published');
            setStatus(num, msg, 'ok');
            setDone(num, msg);
          } else {
            var w = '⚠ Saved, but NOT applied: ' + (res.j.warning || 'unknown reason');
            setStatus(num, w, 'warn');
            setDone(num, w);
            // A failure must stay open — collapsing it would hide the problem.
            var el = document.getElementById('finding-' + num);
            if (el) { el.dataset.reopened = '1'; el.classList.remove('collapsed'); }
          }
        } else if (decision === 'dismiss') {
          setStatus(num, res.j.warning ? '⚠ ' + res.j.warning : 'Dismissed', res.j.warning ? 'warn' : '');
          setDone(num, res.j.warning ? '⚠ ' + res.j.warning : 'Dismissed — no change made');
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
      updateOutstanding();
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
    var needing = document.querySelectorAll('.finding:not(.is-cleared):not(.discarded)').length;
    var decided = document.querySelectorAll(
      '.finding:not(.is-cleared):not(.discarded).decided-accept, ' +
      '.finding:not(.is-cleared):not(.discarded).decided-dismiss').length;
    var el = document.getElementById('outstanding');
    if (el) el.textContent = (needing - decided) + ' of ' + needing + ' needing a decision';
    var c = document.getElementById('nclr');
    if (c) c.textContent = document.querySelectorAll('.finding.is-cleared').length;
    var d = document.getElementById('ndis');
    if (d) d.textContent = document.querySelectorAll('.finding.discarded').length;
  }
  updateOutstanding();
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
  // Cleared and discarded items stay in the DOM (and in the log) but are hidden
  // by default so the panel shows only what still needs a decision.
  var panel = document.querySelector('.panel');
  var tglC = document.getElementById('tglcleared');
  var tglD = document.getElementById('tgldiscarded');
  function applyToggles(){
    panel.classList.toggle('reveal-cleared', tglC && tglC.checked);
    panel.classList.toggle('reveal-discarded', tglD && tglD.checked);
    // Mute highlights whose only finding is hidden, so the prose matches.
    document.querySelectorAll('mark.hl').forEach(function(m){
      var nums = m.getAttribute('data-findings').split(',');
      var anyVisible = nums.some(function(n){
        var el = document.getElementById('finding-' + n);
        return el && el.offsetParent !== null;
      });
      m.classList.toggle('hl-cleared-hidden', !anyVisible);
    });
    updateOutstanding();
  }
  if (tglC) tglC.addEventListener('change', applyToggles);
  if (tglD) tglD.addEventListener('change', applyToggles);

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

  // ---- re-prompt a rewrite ----
  // The reviewer disagrees with the proposal but does not want a deletion.
  // Their direction goes back to the model, which returns a revised rewrite.
  // Nothing reaches Sanity until they then click Rewrite.
  document.querySelectorAll('.regenbtn').forEach(function(b){
    b.addEventListener('click', function(){
      var n = b.getAttribute('data-num');
      var ta = document.querySelector('.fdirect[data-num="' + n + '"]');
      var out = document.querySelector('.regenout[data-num="' + n + '"]');
      var feedback = (ta && ta.value || '').trim();
      if (!feedback) {
        out.innerHTML = '<div class="regenerr">Say what you want changed first.</div>';
        return;
      }
      b.disabled = true; b.textContent = 'Generating…';
      out.innerHTML = '';
      fetch('/api/seo-review/regenerate', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: idOf[n], feedback: feedback }),
      })
        .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
        .then(function(res){
          b.disabled = false; b.textContent = 'Generate new rewrite';
          if (!res.ok) {
            out.innerHTML = '<div class="regenerr">' + esc2(res.j.error || 'Could not generate a rewrite.') + '</div>';
            return;
          }
          out.innerHTML =
            '<div class="newrw"><b>New rewrite (' + esc2(res.j.scope) + ' scope):</b> ' + esc2(res.j.rewrite) +
            (res.j.explanation ? '<div class="why">' + esc2(res.j.explanation) + '</div>' : '') +
            '<div class="acts">' +
              '<button type="button" class="use" data-num="' + n + '">Use this rewrite</button>' +
              '<button type="button" class="again" data-num="' + n + '">Try again</button>' +
            '</div></div>';
          out.querySelector('.use').addEventListener('click', function(){
            // Store it as the proposal, then apply via the normal Rewrite path
            // so there is still exactly one route into Sanity.
            fetch('/api/seo-review/regenerate', {
              method:'POST', credentials:'same-origin',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ id: idOf[n], feedback: feedback, keep: true }),
            }).then(function(){
              var rw = document.querySelector('.frewrite[data-num="' + n + '"]');
              if (rw) rw.innerHTML = '<b>Option B — rewrite (updated by you):</b> ' + esc2(res.j.rewrite);
              out.innerHTML = '<div class="newrw">Saved as the proposed rewrite. Click <b>Rewrite</b> above to write it to the Sanity draft.</div>';
            });
          });
          out.querySelector('.again').addEventListener('click', function(){
            out.innerHTML = ''; if (ta) ta.focus();
          });
        })
        .catch(function(e){
          b.disabled = false; b.textContent = 'Generate new rewrite';
          out.innerHTML = '<div class="regenerr">' + esc2(e.message) + '</div>';
        });
    });
  });

  // ---- draft verification ----
  var vbtn = document.getElementById('verifybtn');
  var vout = document.getElementById('verifyout');
  var rbtn = document.getElementById('repairbtn');
  var mbox = document.getElementById('manualbox');
  var mout = document.getElementById('manualout');
  var mcount = document.getElementById('manualcount');
  function esc2(t){ return String(t == null ? '' : t)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function runVerify(){
    vbtn.disabled = true;
    vout.textContent = 'Reading the Sanity draft…';
    fetch('/api/seo-review/verify?slug=' + encodeURIComponent(SLUG), {credentials:'same-origin'})
      .then(function(r){
        if (!r.ok) return r.text().then(function(t){ throw new Error('HTTP ' + r.status + ' — ' + t.slice(0,140)); });
        return r.json();
      })
      .then(function(j){
        var out = [];
        if (!j.draftExists) {
          out.push('<div class="vidle">Nothing applied yet. This check runs against the Sanity draft, ' +
                   'which is created the first time you accept a change. Not a problem \u2014 there is just nothing to check so far.</div>');
        } else {
          out.push('<div style="margin-bottom:6px">Draft has <b>' + j.draftBlocks + '</b> blocks (published has ' + j.publishedBlocks + ').</div>');
          if (j.issues.length === 0) {
            out.push('<div class="vok">✓ No artifacts found — no stranded punctuation, duplicated sentences, empty blocks or fragments.</div>');
          } else {
            out.push('<div style="margin:8px 0 4px"><b>' + j.issues.length + ' issue(s) to fix in the Studio:</b></div>');
            j.issues.forEach(function(i){
              out.push('<div class="vissue"><b>' + esc2(i.where) + '</b> — ' + esc2(i.detail) +
                       '<span class="vsnip">' + esc2(i.text) + '</span></div>');
            });
          }
        }
        if (j.manualActions.length) {
          out.push('<div style="margin:10px 0 4px"><b>' + j.manualActions.length + ' edit(s) you accepted that must be made by hand:</b></div>');
          j.manualActions.forEach(function(a){
            out.push('<div class="vmanual"><b>' + esc2(a.fieldLabel) + '</b> — ' + esc2(a.reason) +
                     '<span class="vsnip">' + esc2(a.text) + '</span></div>');
          });
        } else if (j.draftExists) {
          out.push('<div class="vok" style="margin-top:8px">✓ Nothing left to do by hand.</div>');
        }
        if (j.draftExists) {
          out.push('<div style="margin-top:8px"><a href="https://www.granola.ai/studio/structure/seoPosts;' +
                   encodeURIComponent(j.postId) + '" target="_blank" rel="noopener">Open the draft in Sanity Studio ↗</a></div>');
        }
        vout.innerHTML = out.join('');
        vbtn.disabled = false;

        // Offer the automatic fix only when there is something it can fix.
        var fixable = j.issues.filter(function(i){
          return i.kind === 'duplication' || i.kind === 'punctuation';
        }).length;
        if (rbtn) rbtn.style.display = fixable ? 'inline-block' : 'none';

        // ---- Manual Reviews ----
        var manual = (j.manualActions || []).slice();
        if (manual.length) {
          mbox.style.display = 'block';
          mcount.textContent = '(' + manual.length + ' item' + (manual.length === 1 ? '' : 's') + ' you must do by hand in Sanity)';
          mout.innerHTML = manual.map(function(a){
            return '<div class="manualitem"><b>' + esc2(a.fieldLabel) + '</b> — you chose ' +
              (a.decision === 'accept-delete' ? 'delete' : 'rewrite') +
              '<div class="why">' + esc2(a.reason) + '</div>' +
              '<span class="txt">' + esc2(a.text) + '</span></div>';
          }).join('') +
          '<div style="font-size:12px"><a href="https://www.granola.ai/studio/structure/seoPosts;' +
          encodeURIComponent(j.postId) + '" target="_blank" rel="noopener">Open in Sanity Studio to make these ↗</a></div>';
        } else {
          mbox.style.display = 'none';
        }
      })
      .catch(function(e){
        vout.innerHTML = '<div class="vissue">Check failed: ' + esc2(e.message) + '</div>';
        vbtn.disabled = false;
      });
  }
  if (vbtn) vbtn.addEventListener('click', runVerify);
  // Run on load so Manual Reviews is visible without having to ask for it.
  runVerify();

  if (rbtn) rbtn.addEventListener('click', function(){
    rbtn.disabled = true;
    rbtn.textContent = 'Fixing…';
    fetch('/api/seo-review/repair', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ slug: SLUG, apply: true }),
    })
      .then(function(r){ return r.json(); })
      .then(function(j){
        rbtn.textContent = 'Fix artifacts';
        rbtn.disabled = false;
        if (j.error) { vout.innerHTML = '<div class="vissue">Repair failed: ' + esc2(j.error) + '</div>'; return; }
        runVerify();
      })
      .catch(function(e){
        rbtn.textContent = 'Fix artifacts';
        rbtn.disabled = false;
        vout.innerHTML = '<div class="vissue">Repair failed: ' + esc2(e.message) + '</div>';
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
