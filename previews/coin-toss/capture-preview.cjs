const { chromium } = require('D:/npm-global/node_modules/openclaw/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../../output/coin-preview');

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const page=await browser.newPage({viewport:{width:1440,height:940},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8888/previews/coin-toss/index.html',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.coinPreview?.ready);
  await page.screenshot({path:path.join(output,'desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'铜钱细节',exact:true}).click();
  await page.screenshot({path:path.join(output,'coin-detail.png'),fullPage:true});
  await page.locator('#stage').screenshot({path:path.join(output,'coin-material.png')});
  await page.getByRole('button',{name:'摇卦动作',exact:true}).click();
  await page.getByRole('button',{name:'摇一次',exact:true}).click();
  await page.waitForTimeout(1180);
  await page.screenshot({path:path.join(output,'mid-toss.png'),fullPage:true});
  await page.waitForFunction(()=>!window.coinPreview.getState().busy);
  const one=await page.evaluate(()=>window.coinPreview.getState());
  if(one.lines.length!==1)throw new Error('Manual toss did not record exactly one line');
  await page.getByRole('button',{name:'一键起卦',exact:true}).click();
  await page.waitForFunction(()=>window.coinPreview.getState().lines.length===6&&!window.coinPreview.getState().busy);
  const complete=await page.evaluate(()=>window.coinPreview.getState());
  if(complete.lines.some(line=>line.faces.reduce((s,v)=>s+v+2,0)!==line.sum))throw new Error('Coin faces and line sums mismatch');
  await page.screenshot({path:path.join(output,'completed.png'),fullPage:true});
  await page.getByRole('button',{name:'重新开始'}).click();
  if((await page.evaluate(()=>window.coinPreview.getState().lines.length))!==0)throw new Error('Reset failed');
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error('Mobile horizontal overflow');
  await page.screenshot({path:path.join(output,'mobile.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'摇一次',exact:true}).click();
  const reduced=await page.evaluate(()=>window.coinPreview.getState());
  if(reduced.busy||reduced.lines.length!==1)throw new Error('Reduced motion did not show immediate stable result');
  await page.emulateMedia({reducedMotion:'no-preference'});
  if(process.argv.includes('--frames')){
    const frames=path.join(output,'frames');fs.mkdirSync(frames,{recursive:true});
    await page.setViewportSize({width:1240,height:850});
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.coinPreview?.ready);
    const fps=20,duration=3.65;
    for(let frame=0;frame<fps*duration;frame++){
      await page.evaluate(ms=>window.coinPreview.seek(ms),frame*1000/fps);
      await page.locator('#stage').screenshot({path:path.join(frames,`frame-${String(frame).padStart(4,'0')}.png`)});
    }
  }
  await browser.close();
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({output,checks:['desktop render','material view','manual toss','six-round quick cast','face/result agreement','reset','390px layout','reduced motion'],errors},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
