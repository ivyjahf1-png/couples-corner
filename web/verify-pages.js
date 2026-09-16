// verify-pages.js — check all page files have valid exports
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'app');
const issues = [];

function scan(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      // Skip route groups and nested app directories
      if (e.name.startsWith('(') || e.name === 'app') continue;
      scan(full);
    } else if (e.isFile() && e.name === 'page.tsx') {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    issues.push(`❌ ${path.relative(appDir, filePath)}: cannot read`);
    return;
  }

  const rel = path.relative(appDir, filePath);
  const hasDefault = content.includes('export default');
  const hasNamed = content.includes('export function') || content.includes('export const') || content.includes('export async function');
  const lineCount = content.split('\n').length;
  const braceCount = (content.match(/{/g) || []).length;
  const closeBraceCount = (content.match(/}/g) || []).length;

  let status = '✅';
  const problems = [];

  if (!hasDefault && !hasNamed) {
    status = '❌';
    problems.push('missing export');
  }

  if (braceCount !== closeBraceCount) {
    status = '❌';
    problems.push(`brace mismatch: ${braceCount} open vs ${closeBraceCount} close`);
  }

  if (problems.length === 0) {
    console.log(`${status} ${rel} (${lineCount} lines)`);
  } else {
    console.log(`${status} ${rel}: ${problems.join('; ')}`);
    issues.push(rel);
  }
}

console.log('=== Page File Verification ===');
console.log('');
scan(appDir);
console.log('');
if (issues.length === 0) {
  console.log('All page files look valid.');
} else {
  console.log(`⚠️  ${issues.length} file(s) with issues.`);
  process.exit(1);
}
