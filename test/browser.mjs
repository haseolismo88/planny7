import { createServer } from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createHandler } from '../api/generate.js';
console.info=()=>{};
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
let calls=[],mode='success',failAfter=0;
const handler=createHandler(()=>({responses:{create:async request=>{
 const input=JSON.parse(request.input);calls.push(input);
 if(mode==='failure'||(mode==='partial'&&calls.length>failAfter))throw Object.assign(Error('mock outage'),{status:429});
 const ideas=input.ideas.map(idea=>({id:idea.id,dialogues:idea.parts.map((part,i)=>`Korang tengok idea ${idea.id} bahagian ${i+1} ni, semak ciri produk ikut keperluan sendiri sebelum pilih apa yang sesuai nanti untuk rutin harian korang.`.split(/\s+/).slice(0,17+(idea.id%4)).join(' '))}));
 return {status:'completed',output_text:JSON.stringify({ideas})};
}}}));
process.env.OPENAI_API_KEY='browser-test-only';
const server=createServer(async(req,res)=>{
 if(req.url==='/api/generate'){
  let body='';for await(const chunk of req)body+=chunk;
  res.status=code=>{res.statusCode=code;return res;};res.json=data=>res.end(JSON.stringify(data));res.setHeader('Content-Type','application/json');req.body=body;await handler(req,res);
 }else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const errors=[];
async function pageFor(options={}){
 const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
 if(options.noStorage)await context.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw Error('blocked');}});Object.defineProperty(navigator,'locks',{value:undefined});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);return page;
}
async function setup(page,duration='8'){
 await page.locator('[data-key="product"]').first().fill('Botol Air');
 // Extra details can be collapsed; fill through the actual form control.
 await page.locator('[data-key="benefit"]').first().evaluate(el=>{el.value='Mudah dibawa';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#easyNext').click();await page.locator('#batchDuration').selectOption(duration);await page.locator('#easyNextTwo').click();
}
async function generate(page){await page.locator('#batchGenerate').click();await page.waitForFunction(()=>!document.getElementById('batchGenerate').disabled,{},{timeout:90000});await page.locator('#batchCards').waitFor();}
try{
 let page=await pageFor();await setup(page);calls=[];await generate(page);
 assert.equal(calls.length,12);assert.ok(calls.every(c=>c.ideas.length===10));assert.equal(calls[0].product.benefit,'Mudah dibawa');assert.equal(calls[0].ideas[0].parts.length,1);
 assert.equal(await page.locator('.batch-result').count(),4);assert.match(await page.locator('#batchCards').innerText(),/Dijana OpenAI/);assert.ok(!(await page.locator('#batchCards').innerText()).includes('__PLANNY'));
 await page.locator('#batchDayPage').selectOption('29');assert.match(await page.locator('.batch-result').first().innerText(),/Hari 30/);
 await page.locator('[data-copy-dialogue]').first().click();
 const downloadPromise=page.waitForEvent('download');await page.locator('#batchDownloadProduct').evaluate(el=>el.click());const download=await downloadPromise;const downloaded=fs.readFileSync(await download.path(),'utf8');assert.match(downloaded,/SUMBER: OpenAI/);assert.match(downloaded,/HARI 30/);assert.ok(!downloaded.includes('__PLANNY_AI_DIALOGUE__'));
 await page.reload();await page.locator('#savedProductResults').click();assert.match(await page.locator('#batchCards').innerText(),/Dijana OpenAI/);assert.equal(calls.length,12);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 console.log('PASS product: 12 batches, payload, render, copy, day 30, persisted reload, mobile width');await page.context().close();
 page=await pageFor();await setup(page,'56');calls=[];await generate(page);assert.equal(calls.length,12);assert.equal(calls[0].ideas[0].parts.length,7);assert.equal(await page.locator('.batch-result').first().locator('.batch-part').count(),7);console.log('PASS 56 seconds: seven scenes per idea');await page.context().close();
 page=await pageFor({noStorage:true});await setup(page);calls=[];await generate(page);assert.equal(calls.length,12);assert.match(await page.locator('#batchResults').innerText(),/simpanan browser tidak tersedia/);console.log('PASS blocked storage and unavailable Web Locks still generate');await page.context().close();
 mode='partial';failAfter=1;calls=[];page=await pageFor();await setup(page);await generate(page);assert.equal(calls.length,2);assert.match(await page.locator('#batchResults').innerText(),/OPENAI_RATE_LIMIT/);assert.match(await page.locator('#batchResults').innerText(),/Templat tempatan|templat tempatan/);
 await page.locator('#batchDayPage').selectOption('29');assert.match(await page.locator('#batchCards').innerText(),/Templat tempatan · bukan OpenAI/);assert.ok(!(await page.locator('#batchCards').innerText()).includes('__PLANNY'));
 mode='success';calls=[];await page.reload();await page.locator('#easyNext').click();await page.locator('#easyNextTwo').click();await generate(page);assert.equal(calls.length,11);assert.equal(calls[0].ideas[0].id,11);console.log('PASS failure fallback and resume from idea 11');await page.context().close();
 page=await pageFor();await page.locator('#simpleCreatorTab').click();
 await page.locator('#product').fill('Tip Menyimpan');await page.locator('#target').fill('Pekerja muda');await page.locator('#benefit').fill('Belajar merancang belanja');await page.locator('#problem').fill('Sukar menyimpan');
 calls=[];await page.locator('#generateBtn').click();await page.waitForFunction(()=>!document.getElementById('generateBtn').disabled,{},{timeout:90000});
 assert.equal(calls.length,12);assert.equal(calls[0].product.goal,'branding');assert.equal(calls[0].ideas[0].parts.length,4);assert.match(await page.locator('#cards').innerText(),/DIALOG OPENAI/);await page.locator('#cards [data-action="video"]').first().click();await page.locator('[data-platform]').first().click();assert.match(await page.locator('#promptBox').innerText(),/PART 4\/4/);console.log('PASS Bina Content 30 Hari: branding and four scenes at 32 seconds, including video prompt');await page.context().close();
 for(const failure of ['network','json']){
  page=await pageFor();await setup(page);
  await page.route('**/api/generate',route=>failure==='network'?route.abort():route.fulfill({status:200,contentType:'application/json',body:'invalid JSON'}));
  await generate(page);assert.match(await page.locator('#batchCards').innerText(),/Templat tempatan · bukan OpenAI/);await page.context().close();
 }
 console.log('PASS browser network and invalid JSON fallback');
 for(const creator of [false,true])for(const code of ['MISSING_API_KEY','OPENAI_AUTH','OPENAI_MODEL_ACCESS','OPENAI_RATE_LIMIT','OPENAI_TIMEOUT','INVALID_AI_OUTPUT','OPENAI_UNAVAILABLE']){
  page=await pageFor();await page.route('**/api/generate',route=>route.fulfill({status:502,contentType:'application/json',body:JSON.stringify({success:false,code,error:'Sebab sebenar '+code})}));
  if(creator){
   await page.locator('#simpleCreatorTab').click();await page.locator('#product').fill('Tip kerja');await page.locator('#target').fill('Pekerja');await page.locator('#benefit').fill('Rancang masa');await page.locator('#problem').fill('Sibuk');
   await page.locator('#generateBtn').click();await page.waitForFunction(()=>!document.getElementById('generateBtn').disabled);
  }else{await setup(page);await generate(page);}
  assert.ok((await page.locator('body').innerText()).includes('Sebab sebenar '+code));await page.context().close();
 }
 console.log('PASS both modes display all seven backend errors');
 for(const n of [16,21]){
  page=await pageFor();await setup(page);await page.route('**/api/generate',route=>{const input=route.request().postDataJSON();return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,source:'openai',ideas:input.ideas.map(idea=>({id:idea.id,dialogues:idea.parts.map(()=>Array(n).fill('kata').join(' '))}))})});});
  await generate(page);assert.match(await page.locator('#batchResults').innerText(),/17–20/);await page.context().close();
 }
 console.log('PASS frontend rejects 16 and 21 words');

 assert.deepEqual(errors,[]);console.log('PASS no browser runtime errors');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}


