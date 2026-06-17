const fs = require('fs');

const filePath = 'C:/Users/vishnuvardhan/progressWebsite/.next/server/chunks/ssr/_0pz583d._.js';

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const regex = /admin_streak_override/g;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
  count++;
  if (count <= 5) {
    const index = match.index;
    const start = Math.max(0, index - 250);
    const end = Math.min(content.length, index + 250);
    console.log(`=== MATCH ${count} (Index: ${index}) ===`);
    console.log(content.substring(start, end));
    console.log('-'.repeat(80));
  }
}

console.log('Search finished.');
