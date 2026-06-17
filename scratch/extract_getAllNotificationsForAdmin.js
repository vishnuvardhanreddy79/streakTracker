const fs = require('fs');

const filePath = 'C:/Users/vishnuvardhan/progressWebsite/.next/server/chunks/ssr/_0pz583d._.js';

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

const regex = /getAllNotificationsForAdmin/g;
let match;
let count = 0;

while ((match = regex.exec(content)) !== null) {
  count++;
  const index = match.index;
  const start = Math.max(0, index - 200);
  const end = Math.min(content.length, index + 400);
  console.log(`=== MATCH ${count} ===`);
  console.log(content.substring(start, end));
  console.log('-'.repeat(80));
}
