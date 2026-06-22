#!/usr/bin/env node
/**
 * sync-skills.mjs
 * Syncs skills from .agents/skills/ (source of truth) to all other target directories.
 * Usage: node scripts/sync-skills.mjs [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, '.agents', 'skills');
const DRY_RUN = process.argv.includes('--dry-run');

const TARGETS = [
  { dir: path.join(ROOT, '.claude', 'skills'),        type: 'directory', transform: 'identity' },
  { dir: path.join(ROOT, '.codex', 'skills'),         type: 'directory', transform: 'identity' },
  { dir: path.join(ROOT, '.devin', 'skills'),         type: 'directory', transform: 'identity' },
  { dir: path.join(ROOT, '.opencode', 'skills'),      type: 'directory', transform: 'identity' },
  { dir: path.join(ROOT, 'skills'),                   type: 'directory', transform: 'strip-referencia' },
  { dir: path.join(ROOT, '.cursor', 'rules'),         type: 'flat-file', transform: 'cursor', ext: '.mdc' },
  { dir: path.join(ROOT, '.github', 'instructions'),  type: 'flat-file', transform: 'github', ext: '.md' },
];

const stats = { added: 0, updated: 0, unchanged: 0 };

// --- Frontmatter parsing ---

function splitFrontmatter(content) {
  const norm = content.replace(/\r\n/g, '\n');
  if (!norm.startsWith('---\n')) return { fm: '', body: norm };
  const end = norm.indexOf('\n---\n', 4);
  if (end === -1) return { fm: '', body: norm };
  return {
    fm: norm.slice(4, end),
    body: norm.slice(end + 5), // skip \n---\n
  };
}

function extractDescription(fm) {
  // Handle multiline block scalar (description: >\n  line1\n  line2)
  const blockMatch = fm.match(/^description:\s*>\s*\n((?:[ \t]+.+\n?)+)/m);
  if (blockMatch) {
    return blockMatch[1]
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .join(' ');
  }
  // Handle inline (description: value) or (description: "value")
  const inlineMatch = fm.match(/^description:\s*(.+)$/m);
  if (!inlineMatch) return '';
  let val = inlineMatch[1].trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
}

// --- Path adjustments ---

const PATH_3LEVELS = '../../../.skills/folder-structure/SKILL.md';
const PATH_2LEVELS = '../../.skills/folder-structure/SKILL.md';

function adjustPath(content) {
  return content.replace(new RegExp(PATH_3LEVELS.replace(/\./g, '\\.'), 'g'), PATH_2LEVELS);
}

function stripReferencia(content) {
  // Remove the blockquote line and the blank line after it
  return content.replace(/^> \*\*Referência de estrutura do projeto:\*\*[^\n]*\n\n?/m, '');
}

// --- Content transformers ---

function transformIdentity(content) {
  return content;
}

function transformStripReferencia(content) {
  return stripReferencia(content);
}

function transformCursor(content, description) {
  const { body } = splitFrontmatter(content);
  const adjustedBody = adjustPath(body);
  return `---\ndescription: "${description}"\nglobs: \nalwaysApply: false\n---\n\n${adjustedBody}`;
}

function transformGitHub(content, description) {
  const { body } = splitFrontmatter(content);
  const adjustedBody = adjustPath(body);
  return `---\napplyWhen: "${description}"\n---\n\n${adjustedBody}`;
}

// --- File I/O helpers ---

function writeIfChanged(filePath, newContent) {
  const label = path.relative(ROOT, filePath);
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing === newContent) {
      stats.unchanged++;
      return;
    }
    if (!DRY_RUN) fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`  updated: ${label}`);
    stats.updated++;
  } else {
    if (!DRY_RUN) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, newContent, 'utf8');
    }
    console.log(`  added:   ${label}`);
    stats.added++;
  }
}

function copyDirRecursive(srcDir, destDir, contentTransformFn) {
  if (!DRY_RUN) fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, null); // only transform SKILL.md
    } else if (entry.isFile()) {
      const raw = fs.readFileSync(srcPath, 'utf8');
      const transformed = (entry.name === 'SKILL.md' && contentTransformFn)
        ? contentTransformFn(raw)
        : raw;
      writeIfChanged(destPath, transformed);
    }
  }
}

// --- Main sync ---

function syncSkill(skillName) {
  const srcDir = path.join(SOURCE, skillName);
  const skillMdPath = path.join(srcDir, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) return;

  const rawContent = fs.readFileSync(skillMdPath, 'utf8');
  const { fm } = splitFrontmatter(rawContent);
  const description = extractDescription(fm);

  for (const target of TARGETS) {
    if (target.type === 'directory') {
      const destDir = path.join(target.dir, skillName);
      const transformFn = target.transform === 'strip-referencia'
        ? transformStripReferencia
        : transformIdentity;
      copyDirRecursive(srcDir, destDir, transformFn);

    } else if (target.type === 'flat-file') {
      const destFile = path.join(target.dir, `${skillName}${target.ext}`);
      let transformed;
      if (target.transform === 'cursor') {
        transformed = transformCursor(rawContent, description);
      } else if (target.transform === 'github') {
        transformed = transformGitHub(rawContent, description);
      }
      writeIfChanged(destFile, transformed);
    }
  }
}

// --- Entry point ---

const skills = fs.readdirSync(SOURCE, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

console.log(`Syncing ${skills.length} skills from .agents/skills/${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

for (const skill of skills) {
  syncSkill(skill);
}

console.log(`\nDone: ${stats.added} added, ${stats.updated} updated, ${stats.unchanged} unchanged.`);
