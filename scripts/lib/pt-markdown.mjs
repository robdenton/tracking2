// Portable Text -> markdown, shared by the archive scripts.
// Kept in one place so an archived article and a pre-edit archived article
// are rendered identically and can be diffed against each other.

// --- portable text -> markdown ---------------------------------------------
const escapeMd = (s) => String(s ?? '');

export function spansToMd(block) {
  const defs = new Map((block.markDefs ?? []).map((d) => [d._key, d]));
  return (block.children ?? []).map((c) => {
    let t = escapeMd(c.text ?? '');
    for (const m of c.marks ?? []) {
      const def = defs.get(m);
      if (def?._type === 'link' && def.href) t = `[${t}](${def.href})`;
      else if (m === 'strong') t = `**${t}**`;
      else if (m === 'em') t = `*${t}*`;
      else if (m === 'code') t = `\`${t}\``;
    }
    return t;
  }).join('');
}

export function bodyToMarkdown(body = []) {
  const out = [];
  let listOpen = null;
  for (const b of body) {
    if (!b || typeof b !== 'object') continue;
    if (b._type === 'block') {
      const text = spansToMd(b);
      if (b.listItem) {
        const bullet = b.listItem === 'number' ? '1.' : '-';
        const indent = '  '.repeat(Math.max(0, (b.level ?? 1) - 1));
        out.push(`${indent}${bullet} ${text}`);
        listOpen = true;
        continue;
      }
      if (listOpen) { out.push(''); listOpen = null; }
      const style = b.style ?? 'normal';
      if (/^h[1-6]$/.test(style)) out.push(`\n${'#'.repeat(Number(style[1]))} ${text}\n`);
      else if (style === 'blockquote') out.push(`\n> ${text}\n`);
      else out.push(`\n${text}\n`);
      continue;
    }
    if (b._type === 'rawHtml' && typeof b.html === 'string') {
      // Kept verbatim. These are comparison tables; re-rendering them as
      // markdown would lose columns, so the original markup is the archive.
      out.push(`\n<!-- rawHtml block ${b._key ?? ''} -->\n${b.html}\n`);
      continue;
    }
    out.push(`\n<!-- unrendered block: ${b._type ?? 'unknown'} ${b._key ?? ''} -->\n`);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

