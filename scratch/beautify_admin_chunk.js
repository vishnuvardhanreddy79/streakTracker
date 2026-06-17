const fs = require('fs');

const srcPath = 'C:/Users/vishnuvardhan/progressWebsite/.next/server/chunks/ssr/src_app_admin_page_tsx_0ublbd0._.js';
const destPath = 'C:/Users/vishnuvardhan/progressWebsite/scratch/admin_compiled_beautified.js';

if (!fs.existsSync(srcPath)) {
  console.log(`Source file not found: ${srcPath}`);
  process.exit(1);
}

const content = fs.readFileSync(srcPath, 'utf8');

// Basic beautification of brackets, braces, and semicolons
let indent = 0;
let formatted = '';
let inString = false;
let stringChar = '';

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  
  if (inString) {
    formatted += char;
    if (char === stringChar && content[i-1] !== '\\') {
      inString = false;
    }
    continue;
  }
  
  if (char === '"' || char === "'") {
    inString = true;
    stringChar = char;
    formatted += char;
    continue;
  }
  
  if (char === '{') {
    indent++;
    formatted += ' {\n' + '  '.repeat(indent);
  } else if (char === '}') {
    indent = Math.max(0, indent - 1);
    formatted += '\n' + '  '.repeat(indent) + '}';
  } else if (char === ';') {
    formatted += ';\n' + '  '.repeat(indent);
  } else if (char === ',') {
    formatted += ', ';
  } else {
    formatted += char;
  }
}

fs.writeFileSync(destPath, formatted);
console.log(`Beautified code written to ${destPath}`);
