const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
(async () => {
 for (const [path,title,sections] of [['/termos','TERMOS DE USO',12],['/privacidade','POLÍTICA DE PRIVACIDADE',14]]) {
  const response = await fetch(base+path); assert.equal(response.status,200);
  const html=await response.text(); assert(html.includes(title));
  assert.equal((html.match(/<h2>/g)||[]).length,sections);
  assert(html.includes('07 de novembro de 2026'));
 }
 const home=await (await fetch(base)).text();
 assert(home.includes('href="/termos"'));assert(home.includes('href="/privacidade"'));
 for(const path of ['/client.js','/style.css','/socket.io/socket.io.js'])assert.equal((await fetch(base+path)).status,200);
 console.log('PASS: legal routes, complete section counts, footer links and application assets');
})().catch(e=>{console.error(e);process.exitCode=1});
