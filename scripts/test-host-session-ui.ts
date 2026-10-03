import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { fileURLToPath } from 'node:url';
const fixture = JSON.parse(await readFile('/tmp/trptools-hostfix-fixture.json','utf8'));
const origin='http://localhost:53000', backend='http://localhost:53004';
const output=fileURLToPath(new URL('../output/playwright/host-regression/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH??'/Applications/Chromium.app/Contents/MacOS/Chromium'});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
await context.addCookies([{name:'access_token',value:fixture.token,url:origin,httpOnly:true,sameSite:'Lax'}]);
await context.addInitScript(() => {
    const Native=window.EventSource;
    (window as any).__hostStreams=[];
    window.EventSource=class extends Native {constructor(url:string|URL,options?:EventSourceInit){super(url,options);(window as any).__hostStreams.push(this)}};
});
const page=await context.newPage(),peer=await context.newPage();
const errors:string[]=[];
for(const tab of [page,peer])tab.on('pageerror',error=>errors.push(error.message));
const responses:Array<{path:string;status:number}>=[];
page.on('response',response=>{if(response.url().includes('/host/')&&response.request().method()!=='GET')responses.push({path:new URL(response.url()).pathname,status:response.status()})});
async function request(path:string,body?:unknown,method='POST') {
    const response=await fetch(backend+path,{method,headers:{cookie:`access_token=${fixture.token}`,'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    assert.equal(response.status,200,await response.clone().text());return response.json() as Promise<any>;
}
async function until(check:()=>Promise<boolean>) {const end=Date.now()+5000;while(Date.now()<end){if(await check())return;await new Promise(resolve=>setTimeout(resolve,25))}throw new Error('Browser state did not synchronize')}
try {
    console.log('Opening two host tabs');
    await page.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
    await peer.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
    await page.getByTestId('shift-timer').waitFor();
    await peer.getByTestId('shift-timer').waitFor();
    await page.getByText('Live',{exact:true}).waitFor();
    await peer.getByText('Live',{exact:true}).waitFor();
    await page.locator('#host-note').fill('Saved from the real browser');
    await page.locator('#host-code').fill('WEB123');
    await page.locator('#host-owner').fill('789');
    await page.getByRole('button',{name:'Save changes',exact:true}).click();
    console.log('Saved; checking peer synchronization');
    await until(async()=>await peer.locator('#host-note').inputValue()==='Saved from the real browser');
    assert.equal(await peer.locator('#host-code').inputValue(),'WEB123');
    await page.locator('#host-note').fill('Unsaved host draft');
    await peer.locator('#host-note').fill('Saved by another host');
    await peer.getByRole('button',{name:'Save changes',exact:true}).click();
    console.log('Peer saved; checking draft');
    await until(async()=>(await request('/host/'+fixture.roomId,undefined,'GET')).note==='Saved by another host');
    await page.waitForTimeout(150);
    assert.equal(await page.locator('#host-note').inputValue(),'Unsaved host draft');
    const before=await request('/host/'+fixture.roomId,undefined,'GET');
    await page.getByRole('button',{name:'Add 5 minutes',exact:true}).click();
    console.log('Extended');
    await until(async()=>(await request('/host/'+fixture.roomId,undefined,'GET')).endsAt===before.endsAt+300000);
    await peer.evaluate(snapshot=>(window as any).__hostStreams.at(-1).dispatchEvent(new MessageEvent('message',{data:JSON.stringify({event:'HOST',data:{...snapshot,note:'Stale snapshot',revision:Math.max(0,snapshot.revision-1)}})})),before);
    assert.equal(await peer.locator('#host-note').inputValue(),'Saved by another host');
    await peer.evaluate(snapshot=>(window as any).__hostStreams.at(-1).dispatchEvent(new MessageEvent('message',{data:JSON.stringify({event:'HOST',data:{...snapshot,roomId:'previous-room',note:'Previous room',revision:snapshot.revision+100}})})),before);
    assert.equal(await peer.locator('#host-note').inputValue(),'Saved by another host');
    const complete=page.locator('[data-event="complete"]');
    await complete.getByRole('button',{name:'Change time',exact:true}).click();
    await complete.locator('input[type="number"]').fill('20');
    await complete.getByRole('button',{name:'Set time',exact:true}).click();
    console.log('Rescheduled');
    await until(async()=>(await request('/host/'+fixture.roomId,undefined,'GET')).timeline.find((item:any)=>item.id==='complete').offsetMinutes===20);
    await complete.getByRole('button',{name:'Acknowledge',exact:true}).click();
    console.log('Acknowledged');
    await until(async()=>await complete.getAttribute('data-status')==='ACKNOWLEDGED');
    await until(async()=>await peer.locator('[data-event="complete"]').getAttribute('data-status')==='ACKNOWLEDGED');
    const file=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    await page.locator('input[type="file"]').setInputFiles({name:'shift.png',mimeType:'image/png',buffer:file});
    await page.getByRole('button',{name:'Remove image',exact:true}).waitFor();
    assert.equal((await request('/host/'+fixture.roomId,undefined,'GET')).joinCode,'WEB123');
    await page.getByRole('button',{name:'Remove image',exact:true}).click();
    await page.getByRole('button',{name:'Remove image',exact:true}).waitFor({state:'hidden'});
    assert.equal(await page.getByText('Bad Request',{exact:true}).count(),0);
    assert.equal(await page.getByText('This event has already been handled',{exact:true}).count(),0);
    const offline=await context.newPage();
    await offline.route('**/dispatch/**/connect',route=>route.abort());
    await offline.goto(`${origin}/dashboard/${fixture.groupSlug}/host`);
    await offline.getByText('Reconnecting',{exact:true}).waitFor();
    const activeText=await offline.getByText(/^Active until /).innerText();
    await offline.getByRole('button',{name:'Add 10 minutes',exact:true}).click();
    await until(async()=>await offline.getByText(/^Active until /).innerText()!==activeText);
    await offline.close();
    for(const width of [320,375,768,1440]) {
        await page.setViewportSize({width,height:1100});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
        await page.screenshot({path:`${output}host-${width}.png`,fullPage:true});
    }
    assert.deepEqual(errors,[]);
    assert(responses.length>=6);
    assert(responses.every(response=>response.status===200),JSON.stringify(responses));
    await writeFile(`${output}results.json`,JSON.stringify({responses,pageErrors:errors,viewports:[320,375,768,1440],result:'passed'},null,2));
    console.log('Real Chromium: two hosts, draft preservation, save, extend, reschedule, ack, upload/remove, and 320–1440px layouts passed');
} catch(error) {
    await page.screenshot({path:`${output}failure.png`,fullPage:true});
    console.log(JSON.stringify({responses,errors,form:await page.locator('form').evaluate(form=>Array.from((form as HTMLFormElement).elements).map((element:any)=>({id:element.id,type:element.type,value:element.value,valid:element.validity?.valid,validationMessage:element.validationMessage}))),body:(await page.locator('body').innerText()).slice(-1500)}));
    throw error;
} finally {await browser.close()}
