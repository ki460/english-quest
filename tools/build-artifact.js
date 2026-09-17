// Builds dist/artifact.html: index.html without the document skeleton (the Artifact host wraps the page itself).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1];
const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
const keep = head.split('\n').filter(l => !/<meta charset|<meta name="viewport"|<link rel="manifest"|apple-touch-icon|rel="icon"|apple-mobile-web-app|mobile-web-app-capable|theme-color/i.test(l)).join('\n');
const out = keep.trim() + '\n' + body.trim() + '\n';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), out);
console.log('wrote dist/artifact.html (' + out.length + ' bytes)');
