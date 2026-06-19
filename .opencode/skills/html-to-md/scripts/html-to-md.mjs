#!/usr/bin/env node
/**
 * html-to-md.mjs — Convert HTML/HTM files to Markdown
 *
 * Usage:
 *   node html-to-md.mjs <input.html>                          # stdout
 *   node html-to-md.mjs <input.html> --output <out.md>        # single file
 *   node html-to-md.mjs --batch <dir> --outdir <out-dir>      # batch
 *
 * Zero external dependencies. Node.js built-ins only.
 * Labels: read-only (stdout mode) | mutating (--output / --outdir mode)
 */

import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// HTML Tokenizer (state machine)
// ---------------------------------------------------------------------------

const State = { TEXT: 0, TAG_OPEN: 1, COMMENT: 2, SKIP: 3 };

function tokenize(html) {
  const tokens = [];
  let state = State.TEXT;
  let buf = '';
  let skipTag = '';
  let i = 0;

  function flushText() {
    if (buf) { tokens.push({ type: 'text', value: buf }); buf = ''; }
  }

  while (i < html.length) {
    const ch = html[i];

    if (state === State.SKIP) {
      const close = `</${skipTag}`;
      const ci = html.toLowerCase().indexOf(close, i);
      if (ci === -1) { i = html.length; break; }
      const end = html.indexOf('>', ci);
      i = end !== -1 ? end + 1 : html.length;
      state = State.TEXT;
      continue;
    }

    if (state === State.COMMENT) {
      const end = html.indexOf('-->', i);
      if (end === -1) { i = html.length; break; }
      i = end + 3;
      state = State.TEXT;
      continue;
    }

    if (state === State.TEXT) {
      if (ch === '<') {
        flushText();
        if (html.slice(i, i + 4) === '<!--') { state = State.COMMENT; i += 4; continue; }
        state = State.TAG_OPEN;
        i++;
        continue;
      }
      buf += ch; i++; continue;
    }

    if (state === State.TAG_OPEN) {
      const end = html.indexOf('>', i);
      if (end === -1) { state = State.TEXT; continue; }
      const raw = html.slice(i, end);
      i = end + 1;
      state = State.TEXT;

      const selfClose = raw.endsWith('/');
      const inner = selfClose ? raw.slice(0, -1).trim() : raw.trim();
      const closing = inner.startsWith('/');
      const tagBody = closing ? inner.slice(1).trim() : inner;
      const spaceIdx = tagBody.search(/\s/);
      const tagName = (spaceIdx === -1 ? tagBody : tagBody.slice(0, spaceIdx)).toLowerCase();
      if (!tagName) continue;
      const attrStr = spaceIdx === -1 ? '' : tagBody.slice(spaceIdx + 1);

      if (tagName === 'script' || tagName === 'style') {
        if (!closing) { skipTag = tagName; state = State.SKIP; }
        continue;
      }

      const attrs = parseAttrs(attrStr);
      if (closing) {
        tokens.push({ type: 'close', tag: tagName });
      } else {
        tokens.push({ type: 'open', tag: tagName, attrs });
        if (selfClose || isSelfClosingTag(tagName)) {
          tokens.push({ type: 'close', tag: tagName });
        }
      }
      continue;
    }
    i++;
  }

  if (buf && state === State.TEXT) flushText();
  return tokens;
}

function isSelfClosingTag(tag) {
  return ['br', 'hr', 'img', 'input', 'meta', 'link'].includes(tag);
}

function parseAttrs(attrStr) {
  const result = {};
  const re = /([a-z][a-z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/gi;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    result[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return result;
}

// ---------------------------------------------------------------------------
// HTML Entity Decoder
// ---------------------------------------------------------------------------

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', copy: '©', reg: '®', trade: '™',
  mdash: '—', ndash: '–', ldquo: '"', rdquo: '"',
  lsquo: '‘', rsquo: '’', hellip: '…',
};

function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (_, ref) => {
    if (ref.startsWith('#x') || ref.startsWith('#X')) return String.fromCodePoint(parseInt(ref.slice(2), 16));
    if (ref.startsWith('#')) return String.fromCodePoint(parseInt(ref.slice(1), 10));
    return NAMED_ENTITIES[ref.toLowerCase()] ?? `&${ref};`;
  });
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------

function htmlToMarkdown(html) {
  const tokens = tokenize(html);
  const output = [];

  // State
  const listStack = [];       // [{tag:'ul'|'ol', index:1}]
  let inPre = false;
  let inTable = false;
  let tableRows = [];
  let currentRow = [];
  let inTh = false;
  let headOpen = false;
  // Link state: we save the pre-link buffer so only link text goes in [...]
  let aHref = '';
  let preLinkBuffer = '';
  let inA = false;
  // List item prefix (indent + marker), kept separate to survive trim
  let listPrefix = '';

  // Inline buffer: accumulates text for the current block element
  let buf = '';

  function pushLine(line) { output.push(line); }

  // Append text to buffer, avoiding double spaces
  function appendText(text) {
    if (!text.trim()) return;
    if (buf.endsWith(' ') || buf.endsWith('\n')) {
      buf += text.trimStart();
    } else {
      buf += text;
    }
  }

  // Flush buffer as a block line (trims both ends)
  function flushBlock() {
    const t = buf.trim();
    buf = '';
    listPrefix = '';
    return t;
  }

  // Flush buffer preserving leading spaces (for list items with indent)
  function flushListItem() {
    const t = buf.trimEnd();
    buf = '';
    return t;
  }

  function handleOpen(tok) {
    const tag = tok.tag;
    const attrs = tok.attrs || {};

    if (tag === 'head') { headOpen = true; return; }
    if (headOpen) return;

    switch (tag) {
      case 'h1': case 'h2': case 'h3':
      case 'h4': case 'h5': case 'h6': {
        flushBlock();
        buf = '#'.repeat(parseInt(tag[1])) + ' ';
        break;
      }
      case 'p':
      case 'div': {
        const t = flushBlock();
        if (t) { pushLine(t); pushLine(''); }
        break;
      }
      case 'br':
        buf += '  \n';
        break;
      case 'hr': {
        const t = flushBlock();
        if (t) { pushLine(t); }
        pushLine(''); pushLine('---'); pushLine('');
        break;
      }
      case 'strong': case 'b':
        buf += '**'; break;
      case 'em': case 'i':
        buf += '*'; break;
      case 'del': case 's':
        buf += '~~'; break;
      case 'code':
        if (!inPre) buf += '`'; break;
      case 'a':
        // Save buffer content before link; reset so only link text goes in [...]
        preLinkBuffer = buf;
        buf = '';
        inA = true;
        aHref = attrs.href || '';
        break;
      case 'img': {
        const alt = attrs.alt || '';
        const src = attrs.src || '';
        buf += `![${alt}](${src})`;
        break;
      }
      case 'pre': {
        const t = flushBlock();
        if (t) { pushLine(t); pushLine(''); }
        pushLine(''); pushLine('```');
        inPre = true;
        break;
      }
      case 'blockquote': {
        const t = flushBlock();
        if (t) { pushLine(t); pushLine(''); }
        buf = '> ';
        break;
      }
      case 'ul': case 'ol': {
        const t = flushBlock();
        if (t) pushLine(t);
        if (listStack.length === 0) pushLine('');
        listStack.push({ tag, index: 1 });
        break;
      }
      case 'li': {
        // Flush any previous content (e.g., trailing text after nested list)
        flushBlock();
        if (listStack.length === 0) {
          buf = '- ';
        } else {
          const cur = listStack[listStack.length - 1];
          const indent = '  '.repeat(listStack.length - 1);
          buf = cur.tag === 'ol' ? `${indent}${cur.index++}. ` : `${indent}- `;
        }
        break;
      }
      case 'table': {
        const t = flushBlock();
        if (t) { pushLine(t); pushLine(''); }
        pushLine('');
        inTable = true; tableRows = []; currentRow = [];
        break;
      }
      case 'tr':
        currentRow = []; inTh = false; break;
      case 'th':
        inTh = true; buf = ''; break;
      case 'td':
        buf = ''; break;
      case 'body':
        headOpen = false; break;
    }
  }

  function handleClose(tok) {
    const tag = tok.tag;

    if (tag === 'head') { headOpen = false; return; }
    if (headOpen) return;

    switch (tag) {
      case 'h1': case 'h2': case 'h3':
      case 'h4': case 'h5': case 'h6': {
        const t = flushBlock();
        if (t) pushLine(t);
        pushLine('');
        break;
      }
      case 'p':
      case 'div': {
        const t = flushBlock();
        if (t) pushLine(t);
        pushLine('');
        break;
      }
      case 'strong': case 'b':
        buf += '**'; break;
      case 'em': case 'i':
        buf += '*'; break;
      case 'del': case 's':
        buf += '~~'; break;
      case 'code':
        if (!inPre) buf += '`'; break;
      case 'a': {
        inA = false;
        const linkText = buf.trim();
        buf = preLinkBuffer + (aHref ? `[${linkText}](${aHref})` : linkText);
        preLinkBuffer = '';
        break;
      }
      case 'pre':
        inPre = false;
        pushLine('```'); pushLine('');
        break;
      case 'blockquote': {
        const t = flushBlock();
        if (t) pushLine(t);
        pushLine('');
        break;
      }
      case 'ul': case 'ol': {
        // Flush any dangling text (rare)
        const t = flushBlock();
        if (t) pushLine(t);
        listStack.pop();
        if (listStack.length === 0) pushLine('');
        break;
      }
      case 'li': {
        // Use trimEnd to preserve leading indent spaces
        const t = flushListItem();
        if (t.trim()) pushLine(t);
        break;
      }
      case 'th':
      case 'td': {
        const text = decodeEntities(buf).trim();
        buf = '';
        if (inTable) currentRow.push(text);
        break;
      }
      case 'tr':
        if (inTable && currentRow.length > 0) {
          tableRows.push({ cells: currentRow, isHead: inTh });
          inTh = false;
        }
        break;
      case 'table':
        inTable = false;
        if (tableRows.length > 0) emitTable(tableRows);
        tableRows = [];
        pushLine('');
        break;
    }
  }

  function emitTable(rows) {
    if (rows.length === 0) return;
    const cols = Math.max(...rows.map(r => r.cells.length));
    const headerRow = rows.find(r => r.isHead) || rows[0];
    const bodyRows = rows.filter(r => r !== headerRow);

    function pad(cells) {
      const p = [...cells];
      while (p.length < cols) p.push('');
      return p;
    }

    pushLine('| ' + pad(headerRow.cells).join(' | ') + ' |');
    pushLine('| ' + Array(cols).fill('---').join(' | ') + ' |');
    for (const row of bodyRows) {
      pushLine('| ' + pad(row.cells).join(' | ') + ' |');
    }
  }

  for (const tok of tokens) {
    if (!tok) continue;

    if (tok.type === 'text') {
      if (inPre) { pushLine(tok.value); continue; }
      if (headOpen) continue;
      const text = decodeEntities(tok.value).replace(/[ \t\r\n]+/g, ' ');
      appendText(text);
      continue;
    }
    if (tok.type === 'open') { handleOpen(tok); continue; }
    if (tok.type === 'close') { handleClose(tok); continue; }
  }

  const remaining = buf.trim();
  if (remaining) pushLine(remaining);

  // Collapse 3+ consecutive blank lines to 1
  const result = [];
  let blankCount = 0;
  for (const line of output) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 1) result.push('');
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  return result.join('\n').trimStart() + '\n';
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

function convertFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return htmlToMarkdown(raw);
}

function runBatch(dir, outdir) {
  if (!fs.existsSync(dir)) { console.error(`Error: Directory not found: ${dir}`); process.exit(1); }
  const entries = fs.readdirSync(dir).filter(f => /\.html?$/i.test(f));
  if (entries.length === 0) { console.warn(`Warning: No HTML files found in ${dir}`); process.exit(0); }
  fs.mkdirSync(outdir, { recursive: true });
  for (const entry of entries) {
    const src = path.join(dir, entry);
    const dest = path.join(outdir, entry.replace(/\.html?$/i, '.md'));
    fs.writeFileSync(dest, convertFile(src), 'utf8');
    console.error(`Converted: ${src} → ${dest}`);
  }
}

// ---------------------------------------------------------------------------
// CLI dispatch (after all definitions)
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log(`Usage:
  node html-to-md.mjs <input.html>                        # print to stdout
  node html-to-md.mjs <input.html> --output <out.md>     # write single file
  node html-to-md.mjs --batch <dir> --outdir <out-dir>   # batch convert`);
  process.exit(0);
}

function getArg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

const batchDir   = getArg('--batch');
const outDir     = getArg('--outdir');
const outputFile = getArg('--output');
const inputFile  = !batchDir && !args[0]?.startsWith('--') ? args[0] : null;

if (batchDir) {
  if (!outDir) { console.error('Error: --batch requires --outdir'); process.exit(1); }
  runBatch(batchDir, outDir);
} else if (inputFile) {
  if (!fs.existsSync(inputFile)) { console.error(`Error: File not found: ${inputFile}`); process.exit(1); }
  const md = convertFile(inputFile);
  if (outputFile) {
    fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
    fs.writeFileSync(outputFile, md, 'utf8');
    console.error(`Written: ${outputFile}`);
  } else {
    process.stdout.write(md);
  }
} else {
  console.error('Error: No input file specified. Use --help for usage.');
  process.exit(1);
}
