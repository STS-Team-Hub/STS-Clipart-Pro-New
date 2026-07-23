#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'minor';
const manifestPath = path.join(root, 'manifest.json');
const packagePath = path.join(root, 'package.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}
function bump(version) {
  const parts = String(version).split('.').map(n => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  if (mode === 'patch') parts[2] += 1;
  else {
    parts[1] += 1;
    parts[2] = 0;
  }
  return parts.slice(0, 3).join('.');
}
function display(version) {
  const [major, minor] = version.split('.');
  return `${major}.${minor}`;
}
function replaceAllSafe(file, from, to) {
  if (!fs.existsSync(file)) return;
  const oldText = fs.readFileSync(file, 'utf8');
  const newText = oldText.split(from).join(to);
  if (newText !== oldText) fs.writeFileSync(file, newText);
}
function readText(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function writeText(file, text) {
  fs.writeFileSync(file, text);
}
function prependRecentLog(file, next, nextDisplay, current, currentDisplay) {
  const title = 'STS Clipart Pro — Recent Version Logs';
  const today = new Date().toISOString().slice(0, 10);
  const entry = `## ${next} - ${today}\n- Synchronized extension version to STS Clipart Pro ${nextDisplay} / ${next}.\n- Auto-updated manifest, package, popup, panel, README, logs, scripts, and Chrome extension visible version notes.\n- Auto-version policy: every completed change should bump the version by one level before packaging.\n`;
  const old = readText(file).replace(/^STS Clipart Pro — Recent Version Logs\s*/,'').trim();
  const sections = old ? old.split(/\n(?=##\s+\d+\.\d+\.\d+\s+-\s+)/).filter(Boolean) : [];
  const kept = [entry].concat(sections.filter(s => !s.startsWith(`## ${next} `))).slice(0, 3);
  writeText(file, `${title}\n\n${kept.join('\n').trim()}\n`);
}

const manifest = readJson(manifestPath);
const current = manifest.version || '8.3.0';
const next = bump(current);
const currentDisplay = display(current);
const nextDisplay = display(next);

manifest.version = next;
manifest.name = `STS Clipart Pro ${nextDisplay}`;
manifest.description = (manifest.description || '').replace(/STS Clipart Pro \d+\.\d+/g, `STS Clipart Pro ${nextDisplay}`);
manifest.version_name = nextDisplay;
if (manifest.action) manifest.action.default_title = `STS Clipart Pro ${nextDisplay}`;
writeJson(manifestPath, manifest);

const pkg = readJson(packagePath);
pkg.version = next;
writeJson(packagePath, pkg);

[
  'README.txt', 'AUTH_SETUP.txt', 'popup.html', 'panel.html', 'panel.js', 'popup.js', 'background.js', 'content.js',
  'TEST_CASES.md', 'content_modules/product-crawler.js', 'content_modules/clipart-scanner.js',
  'content_modules/debug.js', 'content_modules/sanitize.js'
]
  .map(file => path.join(root, file))
  .forEach(file => {
    replaceAllSafe(file, `STS Clipart Pro ${currentDisplay}`, `STS Clipart Pro ${nextDisplay}`);
    replaceAllSafe(file, `STS Clipart Pro_${currentDisplay} Full`, `STS Clipart Pro_${nextDisplay} Full`);
    replaceAllSafe(file, `v${current}`, `v${next}`);
    replaceAllSafe(file, current, next);
  });

prependRecentLog(path.join(root, 'CHANGELOG.txt'), next, nextDisplay, current, currentDisplay);
prependRecentLog(path.join(root, 'Logs.txt'), next, nextDisplay, current, currentDisplay);

const parent = path.dirname(root);
const desiredBase = `STS Clipart Pro_${nextDisplay} Full`;
const desiredRoot = path.join(parent, desiredBase);
if (path.basename(root) !== desiredBase && !fs.existsSync(desiredRoot)) {
  fs.renameSync(root, desiredRoot);
  console.log(`Folder renamed: ${path.basename(root)} -> ${desiredBase}`);
}

console.log(`Version bumped: ${current} -> ${next}`);
