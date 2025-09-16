// Quick-and-safe mojibake fixer for Turkish characters in source files
// Strategy: Many files were double-decoded (UTF-8 bytes interpreted as Latin-1/Win-1254),
// producing sequences like "BaÅŸlık" instead of "Başlık".
// For such files, re-encode current text as latin1 bytes, then decode as UTF-8.
// This is reversible when the current text is the typical mojibake form.

const fs = require('fs');
const path = require('path');

// Heuristics: if a line includes common mojibake patterns (Ã‡, Ã–, Ãœ, Ã§, Ã¶, Ã¼, ÅŸ, Ä±, ÄŸ, Ä°),
// we attempt to fix. We avoid binary and minified lock files.
const MOJIBAKE_MARKERS = [
  'Ã', 'Å', 'Ä', '�'
];

const DEFAULT_GLOBS = [
  'public',
  'routes',
  'server.js',
  'config',
  'readme.md',
  'todo.md'
];

function listFiles(startDir) {
  const out = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        // Skip images and binaries
        if (/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico|db|bak)$/i.test(e.name)) continue;
        out.push(full);
      }
    }
  }
  if (Array.isArray(startDir)) {
    for (const d of startDir) {
      if (fs.existsSync(d)) {
        const stat = fs.statSync(d);
        if (stat.isDirectory()) walk(d); else out.push(d);
      }
    }
  } else {
    walk(startDir);
  }
  return out;
}

function looksMojibake(text) {
  return MOJIBAKE_MARKERS.some((m) => text.includes(m));
}

function fixText(text) {
  // Attempt latin1 -> utf8 roundtrip
  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8');
    // If fixed content reduces mojibake markers, accept
    const beforeScore = MOJIBAKE_MARKERS.reduce((a, m) => a + (text.split(m).length - 1), 0);
    const afterScore = MOJIBAKE_MARKERS.reduce((a, m) => a + (fixed.split(m).length - 1), 0);
    if (afterScore < beforeScore) return fixed;
  } catch (_) {}
  return null;
}

function main() {
  const roots = DEFAULT_GLOBS;
  const files = listFiles(roots);
  let changed = 0;
  for (const file of files) {
    try {
      const raw = fs.readFileSync(file, 'utf8');
      if (!looksMojibake(raw)) continue;
      const fixed = fixText(raw);
      if (fixed && fixed !== raw) {
        // Backup once
        if (!fs.existsSync(file + '.bak')) fs.writeFileSync(file + '.bak', raw, 'utf8');
        fs.writeFileSync(file, fixed, 'utf8');
        console.log('Fixed:', file);
        changed++;
      }
    } catch (e) {
      // ignore
    }
  }
  console.log('Done. Files changed:', changed);
}

if (require.main === module) {
  main();
}

