// Map-based safe fixer for common Turkish mojibake sequences in UI files only.
// It replaces only known sequences and leaves code structure intact.

const fs = require('fs');
const path = require('path');

const MAP = new Map([
  ['Ã‡','Ç'], ['Ã–','Ö'], ['Ãœ','Ü'],
  ['Ã§','ç'], ['Ã¶','ö'], ['Ã¼','ü'],
  ['ÅŸ','ş'], ['Åž','Ş'],
  ['Ä±','ı'], ['Ä°','İ'],
  ['ÄŸ','ğ'], ['Äž','Ğ'],
  ['Ã‡','Ç'], ['Ã¶','ö'], ['Ã§','ç'],
  ['Ã±','ñ'], // just in case
]);

function fixOnce(text) {
  let out = text;
  for (const [bad, good] of MAP.entries()) {
    out = out.split(bad).join(good);
  }
  return out;
}

function listUIFiles() {
  const root = path.join(process.cwd(), 'public');
  const out = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (/\.(js|html|md|css)$/i.test(ent.name)) out.push(full);
    }
  }
  if (fs.existsSync(root)) walk(root);
  return out;
}

function main() {
  const files = listUIFiles();
  let changed = 0;
  for (const f of files) {
    const raw = fs.readFileSync(f, 'utf8');
    const fixed = fixOnce(raw);
    if (fixed !== raw) {
      if (!fs.existsSync(f + '.bak')) fs.writeFileSync(f + '.bak', raw, 'utf8');
      fs.writeFileSync(f, fixed, 'utf8');
      console.log('Patched UI:', path.relative(process.cwd(), f));
      changed++;
    }
  }
  console.log('UI files patched:', changed);
}

if (require.main === module) main();

