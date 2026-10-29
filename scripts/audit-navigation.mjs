import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignored = new Set(['.git', 'node_modules', '.github']);
const htmlFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

const errors = [];
let checked = 0;
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  if (!/class=["'][^"']*\bsite-header\b/.test(html)) continue;
  checked++;
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (!/class=["'][^"']*\bmain-nav\b/.test(html)) errors.push(`${rel}: missing shared .main-nav container`);
  if (!/class=["'][^"']*\bmenu-btn\b/.test(html)) errors.push(`${rel}: missing .menu-btn control`);
  if (!/assets\/style\.css(?:\?[^"' ]*)?/.test(html)) errors.push(`${rel}: missing shared assets/style.css`);
  if (!/assets\/script\.js(?:\?[^"' ]*)?/.test(html)) errors.push(`${rel}: missing shared assets/script.js`);
}

const cssPath = path.join(root, 'assets', 'style.css');
const jsPath = path.join(root, 'assets', 'script.js');
if (!fs.existsSync(cssPath)) errors.push('assets/style.css: missing file');
if (!fs.existsSync(jsPath)) errors.push('assets/script.js: missing file');

if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  const requiredRules = [
    ['desktop navigation breakpoint', /@media\s*\(min-width:\s*761px\)/],
    ['compact navigation breakpoint', /@media\s*\(max-width:\s*760px\)/],
    ['mobile submenu flow layout', /html\.rls-mobile-mode\s+\.site-header\s+\.main-nav\s+\.nav-group\[open\]\s*>\s*\.nav-submenu/],
    ['mobile open-menu selector', /html\.rls-mobile-mode\.nav-open\s+\.site-header\s+\.main-nav/]
  ];
  for (const [label, regex] of requiredRules) {
    if (!regex.test(css)) errors.push(`assets/style.css: missing ${label} rule`);
  }
}
if (fs.existsSync(jsPath)) {
  const js = fs.readFileSync(jsPath, 'utf8');
  if (!/querySelector\('\.menu-btn'\)/.test(js)) errors.push('assets/script.js: menu button handler not found');
  if (!/classList\.toggle\('nav-open'\)/.test(js)) errors.push('assets/script.js: menu open/close toggle not found');
  if (!/className\s*=\s*'nav-group'/.test(js)) errors.push('assets/script.js: generated navigation groups not found');
}

if (errors.length) {
  console.error('Navigation regression audit FAILED:');
  for (const error of errors) console.error(' - ' + error);
  process.exit(1);
}
console.log(`Navigation regression audit passed: ${checked} header pages checked across ${htmlFiles.length} HTML files.`);
