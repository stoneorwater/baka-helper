import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const artwork='data:image/webp;base64,'+fs.readFileSync(new URL('assets/baka-background.webp',root)).toString('base64');
const source=['base','recovery','continuity','auth','tasks','bank','bank-scan','ui'].map(n=>fs.readFileSync(new URL('src/'+n+'.js',root),'utf8')).join('\n').replace('__BAKA_ARTWORK__',artwork);
fs.writeFileSync(new URL('baka-helper.user.js',root),source);
