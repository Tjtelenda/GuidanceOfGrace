// Run after publishing the installed version's GitHub Release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {_electron:electron}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const app=await electron.launch({executablePath:path.join(process.env.LOCALAPPDATA,'Programs','Guidance of Grace','Guidance of Grace.exe')});
try {
  const page=await app.firstWindow();await page.waitForLoadState('domcontentloaded');
  const info=await page.evaluate(()=>window.guidanceDesktop.appInfo());assert.ok(info.packaged);
  await page.evaluate(()=>{window.releaseEvents=[];window.guidanceDesktop.onUpdate(event=>window.releaseEvents.push(event));});
  const result=await page.evaluate(()=>window.guidanceDesktop.checkUpdates());assert.equal(result.state,'checked');
  await page.waitForFunction(()=>window.releaseEvents.some(event=>event.state==='current'),{},{timeout:30000});
  const events=await page.evaluate(()=>window.releaseEvents);assert.ok(events.some(event=>event.state==='current'&&event.version===info.version));
  const proof={result:'PASS',app:info,update:result,events};fs.writeFileSync('acceptance-artifacts/release-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
} finally {await app.evaluate(({app})=>app.exit(0));}
