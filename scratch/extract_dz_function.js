const fs = require('fs');

const filePath = 'C:/Users/vishnuvardhan/progressWebsite/.next/server/chunks/ssr/_0pz583d._.js';

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const regex = /async function dz\(/g;
let match = regex.exec(content);

if (match) {
  const index = match.index;
  const start = index;
  const end = Math.min(content.length, index + 800);
  console.log('=== dz FUNCTION ===');
  console.log(content.substring(start, end));
  console.log('='.repeat(80));
} else {
  console.log('dz function not found by regex');
}
