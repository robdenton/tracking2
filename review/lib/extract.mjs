// Extract every text-bearing field from a post as labelled segments.
//
// A "segment" is one atomic piece of reviewable text with a stable id and a
// field label. Findings anchor to (segmentId, exact quote) — offsets are then
// computed from the SAME string the page renders, which is what makes the
// build-time anchoring assertion meaningful (Step 6).
//
// Text-bearing fields present in this corpus (verified against all 207 docs):
//   title, slug, summary, body paragraphs, headings h1-h4, blockquotes,
//   list items (bullet/number), link anchor text + href, rawHtml table cells
//   (th/td). No <img alt>, <figcaption>, <details>/<summary> or <button> exist.

export const FIELD_LABELS = {
  title: 'Title',
  slug: 'Slug (URL)',
  summary: 'Meta / summary',
  heading: 'Heading',
  paragraph: 'Body paragraph',
  blockquote: 'Blockquote / testimonial',
  listItem: 'List item',
  linkText: 'Link anchor text',
  linkHref: 'Link URL',
  tableCell: 'Table cell',
  tableHeader: 'Table header cell',
};

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, ' ');
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Concatenate a block's spans into its plain text.
function blockText(block) {
  if (!Array.isArray(block.children)) return '';
  return block.children.map((c) => (typeof c.text === 'string' ? c.text : '')).join('');
}

// Pull the anchor text for each link mark in a block: {text, href}.
function blockLinks(block) {
  const out = [];
  if (!Array.isArray(block.children) || !Array.isArray(block.markDefs)) return out;
  const defs = new Map(block.markDefs.filter((d) => d && d._type === 'link').map((d) => [d._key, d.href]));
  if (defs.size === 0) return out;
  // Merge consecutive spans sharing the same link mark.
  let cur = null;
  for (const c of block.children) {
    const markKey = (c.marks || []).find((m) => defs.has(m));
    if (markKey) {
      if (cur && cur.key === markKey) cur.text += c.text || '';
      else { if (cur) out.push(cur); cur = { key: markKey, href: defs.get(markKey), text: c.text || '' }; }
    } else if (cur) { out.push(cur); cur = null; }
  }
  if (cur) out.push(cur);
  return out;
}

// Parse a rawHtml table into rows of cells, preserving header vs data.
function parseTableCells(html) {
  const cells = [];
  const re = /<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = stripTags(m[2]);
    if (text) cells.push({ tag: m[1].toLowerCase(), text });
  }
  return cells;
}

// Main entry: post -> ordered array of segments.
// Each: { id, field, label, text, meta } where meta carries render hints
// (heading level, list kind, href…).
export function extractSegments(post) {
  const segs = [];
  let n = 0;
  const push = (field, text, meta = {}) => {
    const t = typeof text === 'string' ? text : '';
    if (!t.trim()) return;
    segs.push({ id: `s${n++}`, field, label: FIELD_LABELS[field] || field, text: t, meta });
  };

  push('title', post.title);
  push('slug', post.slug);
  push('summary', post.summary);

  if (Array.isArray(post.body)) {
    for (const node of post.body) {
      if (!node || typeof node !== 'object') continue;
      if (node._type === 'block') {
        const text = blockText(node);
        const style = node.style || 'normal';
        // Record block provenance so a finding can be patched back onto the
        // exact portable-text node it came from (used by the draft writer).
        const prov = { blockKey: node._key || null, blockType: 'block' };
        if (node.listItem) {
          push('listItem', text, { ...prov, listItem: node.listItem, level: node.level || 1 });
        } else if (/^h[1-6]$/.test(style)) {
          push('heading', text, { ...prov, level: Number(style.slice(1)) });
        } else if (style === 'blockquote') {
          push('blockquote', text, prov);
        } else {
          push('paragraph', text, prov);
        }
        // Link anchor text + href as their own reviewable segments.
        for (const l of blockLinks(node)) {
          push('linkText', l.text, { href: l.href });
          if (l.href) push('linkHref', l.href, { href: l.href });
        }
      } else if (node._type === 'rawHtml' && typeof node.html === 'string') {
        const prov = { blockKey: node._key || null, blockType: 'rawHtml' };
        for (const c of parseTableCells(node.html)) {
          push(c.tag === 'th' ? 'tableHeader' : 'tableCell', c.text, prov);
        }
        // Any <a href> inside rawHtml.
        const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
        let m;
        while ((m = re.exec(node.html)) !== null) {
          const t = stripTags(m[2]);
          if (t) push('linkText', t, { href: m[1] });
          push('linkHref', m[1], { href: m[1] });
        }
      }
    }
  }
  return segs;
}

// Split a segment into sentences with their offsets within the segment text.
// Offsets matter: findings anchor by (segmentId, start, end) computed from the
// exact rendered string.
export function splitSentences(text) {
  const out = [];
  const re = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const s = raw.trim();
    if (!s) continue;
    out.push({ text: s, start: m.index + lead, end: m.index + lead + s.length });
  }
  if (out.length === 0 && text.trim()) {
    out.push({ text: text.trim(), start: text.indexOf(text.trim()), end: text.indexOf(text.trim()) + text.trim().length });
  }
  return out;
}

// Full plain text of a post (all segments joined) — for corpus-level scans.
export function postPlainText(post) {
  return extractSegments(post).map((s) => s.text).join('\n');
}
