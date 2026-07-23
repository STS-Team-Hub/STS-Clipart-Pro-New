const assert = require('assert');

function html(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sequentialPrefix(index) {
  if (index < 26) return String.fromCharCode(65 + index);
  const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
  const second = String.fromCharCode(65 + (index % 26));
  return first + second;
}

function normScanText(v) {
  return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
}

assert.equal(html('<a&"\''), '&lt;a&amp;&quot;&#039;');
assert.equal(sequentialPrefix(0), 'A');
assert.equal(sequentialPrefix(25), 'Z');
assert.equal(sequentialPrefix(26), 'AA');
assert.equal(sequentialPrefix(27), 'AB');
assert.equal(normScanText('  hair   color * '), 'hair color');

console.log('Unit helpers test passed.');
