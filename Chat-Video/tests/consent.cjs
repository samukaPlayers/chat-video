// Run with Playwright available: node tests/consent.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000';
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 try {
 const context = await browser.newContext({permissions:['camera','microphone']});
 await context.addInitScript(() => {
   window.mediaRequests = 0;
   const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia = (...args) => { window.mediaRequests++; return original(...args); };
 });
 const a = await context.newPage();
 await a.goto(baseURL);
 await a.locator('#startBtn').click();
 assert.equal(await a.evaluate(()=>window.mediaRequests), 0, 'media must wait for acceptance');
 assert(await a.locator('#consentDialog').isVisible());
 assert(await a.locator('#continueBtn').isDisabled());
 await a.locator('#cancelConsentBtn').click();
 assert.equal(await a.evaluate(()=>window.mediaRequests),0);
 await a.locator('#startBtn').click();
 await a.locator('#acceptTerms').check();
 await a.locator('#continueBtn').click();
 await a.waitForFunction(()=>localStream?.getTracks().length === 2);
 const b = await context.newPage(); await b.goto(baseURL);
 await b.locator('#startBtn').click(); await b.locator('#acceptTerms').check(); await b.locator('#continueBtn').click();
 await a.waitForFunction(()=>pc?.remoteDescription && remoteVideo.srcObject);
 await b.waitForFunction(()=>pc?.remoteDescription && remoteVideo.srcObject);
 await a.locator('#chatInput').fill('Mensagem A'); await a.locator('#chatForm button').click();
 await b.locator('.msg.them').filter({hasText:'Mensagem A'}).waitFor();
 await b.locator('#chatInput').fill('Mensagem B'); await b.locator('#chatForm button').click();
 await a.locator('.msg.them').filter({hasText:'Mensagem B'}).waitFor();
 await a.locator('#nextBtn').click();
 await a.waitForFunction(()=>pc?.remoteDescription);
 await a.evaluate(()=>{window.oldTracks = localStream.getTracks()});
 await a.locator('#endBtn').click();
 assert(await a.evaluate(()=>oldTracks.every(t=>t.readyState==='ended') && !localVideo.srcObject && !remoteVideo.srcObject && !socket && !pc));
 await b.waitForFunction(()=>statusEl.textContent.includes('Aguardando'));
 await a.locator('#startBtn').click();
 assert(await a.locator('#continueBtn').isDisabled());
 await a.keyboard.press('Escape');
 for (const path of ['/termos','/privacidade']) {
   const p=await context.newPage(); const response=await p.goto(baseURL+path); assert.equal(response.status(),200);
   assert(await p.locator('article h1').isVisible());
   await p.setViewportSize({width:375,height:812});
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await a.setViewportSize({width:375,height:812});await a.locator('#startBtn').click();
 assert(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // Verify stopping while the browser permission request is still pending.
 const delayed = await context.newPage();
 await delayed.goto(baseURL);
 await delayed.evaluate(() => {
   const getMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia = async (...args) => {
     const stream = await getMedia(...args);
     window.delayedTracks = stream.getTracks();
     await new Promise(resolve => { window.releaseMedia = resolve; });
     return stream;
   };
 });
 await delayed.locator('#startBtn').click(); await delayed.locator('#acceptTerms').check();
 await delayed.locator('#continueBtn').click();
 await delayed.waitForFunction(()=>!!window.releaseMedia);
 await delayed.locator('#endBtn').click(); await delayed.evaluate(()=>window.releaseMedia());
 await delayed.waitForFunction(()=>window.delayedTracks.every(t=>t.readyState==='ended'));
 assert(await delayed.evaluate(()=>!localVideo.srcObject && !socket));
 // The original text fallback must remain usable when camera permission is denied.
 const text = await context.newPage(); await text.goto(baseURL);
 await text.evaluate(()=>{ navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied','NotAllowedError'); }; });
 text.on('dialog',dialog=>dialog.accept());
 await text.locator('#startBtn').click();await text.locator('#acceptTerms').check();await text.locator('#continueBtn').click();
 await text.waitForFunction(()=>socket?.connected);
 assert(await text.evaluate(()=>localStream===null));
 await text.locator('#endBtn').click();
 console.log('PASS: consent gate, cancel, media after acceptance, pairing, SDP/remote tracks, bidirectional chat, next, stop tracks/disconnect, reacceptance, legal routes and mobile layout');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
