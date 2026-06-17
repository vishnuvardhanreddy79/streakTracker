const fs = require('fs');

const filePath = 'C:/Users/vishnuvardhan/progressWebsite/.next/server/chunks/ssr/_0pz583d._.js';

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const regex = /async function dd\(/g;
let match = regex.exec(content);

if (match) {
  const index = match.index;
  const start = index;
  const end = Math.min(content.length, index + 800);
  console.log('=== dd FUNCTION ===');
  console.log(content.substring(start, end));
  console.log('='.repeat(80));
} else {
  console.log('dd function not found by regex');
}
