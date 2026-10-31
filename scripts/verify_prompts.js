const fs = require('fs');
const crypto = require('crypto');

function getPrompt(file) {
  const c = fs.readFileSync(file, 'utf8');
  const m = c.match(/"instructions": \(([\s\S]*?)\),\s*"page_text"/);
  return m[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('"')).map(l => JSON.parse(l)).join('');
}

const pCover = getPrompt('contracts/Cover.py');
const pProbe = getPrompt('contracts/ProbeExtract.py');

console.log('Cover instructions equals ProbeExtract instructions:', pCover === pProbe);
const hash = crypto.createHash('sha256').update(pCover).digest('hex');
console.log('Cover prompt sha256:', hash);

if (hash !== '90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1') {
  console.error('FAILED: Hash mismatch!');
  process.exit(1);
} else {
  console.log('SUCCESS: Hash matches Iteration 2 pre-registered SHA256 exactly!');
}
