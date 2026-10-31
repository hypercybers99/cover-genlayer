const fs = require('fs');
const crypto = require('crypto');

const content = fs.readFileSync('contracts/ProbeExtract.py', 'utf8');
const match = content.match(/"instructions": \(([\s\S]*?)\),\s*"page_text"/);
const lines = match[1].split('\n').map(l => l.trim()).filter(l => l.startsWith('"')).map(l => JSON.parse(l)).join('');
console.log('Instructions text:');
console.log(lines);
const hash = crypto.createHash('sha256').update(lines).digest('hex');
console.log('SHA256:', hash);
if (hash === '90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1') {
  console.log('SUCCESS: Matches pre-registered SHA256 exactly!');
} else {
  console.error('MISMATCH! Expected: 90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1');
  process.exit(1);
}
