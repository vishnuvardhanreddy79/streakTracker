const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/vishnuvardhan/progressWebsite/.next/server';

function searchDir(currentDir) {
  if (!fs.existsSync(currentDir)) return;
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('admin_streak_override')) {
        console.log(`FOUND in: ${fullPath} (Size: ${stat.size} bytes)`);
      }
    }
  }
}

console.log(`Searching for 'admin_streak_override' in ${dir}...`);
searchDir(dir);
console.log('Search finished.');
