// Pure functions that turn a post's `body` (portable-text array) into the
// primitives the checks need: plain text, word count, and the full list of
// outbound links. No I/O, no clock — same input always yields same output.

// Strip HTML tags to recover visible text (for word counting rawHtml blocks).
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ');
}

// Concatenate all human-visible text in the body (block spans + rawHtml text).
export function plainText(body) {
  if (!Array.isArray(body)) return '';
  const parts = [];
  for (const node of body) {
    if (!node || typeof node !== 'object') continue;
    if (node._type === 'block' && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (child && typeof child.text === 'string') parts.push(child.text);
      }
    } else if (node._type === 'rawHtml' && typeof node.html === 'string') {
      parts.push(stripTags(node.html));
    }
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// Word count = whitespace-delimited tokens containing a word character.
export function wordCount(body) {
  const text = plainText(body);
  if (!text) return 0;
  return text.split(/\s+/).filter((t) => /[A-Za-z0-9]/.test(t)).length;
}

// Extract every outbound link in a body, from BOTH sources:
//   1. block markDefs of {_type:"link", href}
//   2. <a href> inside rawHtml blocks
// Returns [{ href, source: 'markDef'|'rawHtml' }]. Anchors/whitespace kept
// as-is; classification happens in link.mjs.
export function extractLinks(body) {
  const links = [];
  if (!Array.isArray(body)) return links;
  for (const node of body) {
    if (!node || typeof node !== 'object') continue;
    if (node._type === 'block' && Array.isArray(node.markDefs)) {
      for (const def of node.markDefs) {
        if (def && def._type === 'link' && typeof def.href === 'string') {
          links.push({ href: def.href.trim(), source: 'markDef' });
        }
      }
    } else if (node._type === 'rawHtml' && typeof node.html === 'string') {
      const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(node.html)) !== null) {
        links.push({ href: m[1].trim(), source: 'rawHtml' });
      }
    }
  }
  return links;
}
