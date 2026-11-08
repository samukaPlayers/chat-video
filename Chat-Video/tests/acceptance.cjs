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

 console.log('PASS: consent, cancellation, media after acceptance, pairing, SDP, bidirectional chat');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
