const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const unitDir = path.join(__dirname, 'unit');
const testFiles = fs.readdirSync(unitDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => path.join(unitDir, file));

for (const file of testFiles) {
  const relative = path.relative(process.cwd(), file);
  console.log(`--- ${relative}`);
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Unit suite passed (${testFiles.length} files).`);
