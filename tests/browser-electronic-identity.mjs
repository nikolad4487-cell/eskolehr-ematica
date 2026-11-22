import {build} from 'esbuild';import {chromium} from 'playwright-core';import {readFile,mkdir} from 'node:fs/promises';import {createServer} from 'node:http';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {PDFDocument} from 'pdf-lib';
const root=resolve(import.meta.dirname,'..');
const entry=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import Create from '${root}/src/components/CreateSchoolUserForm.jsx';import Identity from '${root}/src/components/ElectronicIdentity.jsx';function App(){const[mode,setMode]=useState('create');return <main><button onClick={()=>setMode('create')}>create</button><button onClick={()=>setMode('reset')}>reset</button>{mode==='create'?<Create schools={[{id:'a',name:'Ogledna škola'}]} adminScope={{isScoped:true,schoolId:'a'}}/>:<Identity profileId="pupil-profile" schoolId="a"/>}</main>}createRoot(document.getElementById('root')).render(<App/>);`;
const mock=`export const supabase={auth:{getSession:async()=>({data:{session:{access_token:'synthetic-admin'}}})},from(table){const q={select(){return q},eq(){return q},then(a,b){return Promise.resolve({error:null,data:table==='school_years'?[{id:'year',label:'2026/2027'}]:[{id:'class',name:'3.A',school_year_id:'year'}]}).then(a,b)}};return q}};`;
const result=await build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,write:false,format:'esm',plugins:[{name:'db-fixture',setup(b){b.onResolve({filter:/lib\/supabase$/},()=>({path:'db',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,loader:'js'}));}}]});
const server=createServer(async(req,res)=>{
 if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(result.outputFiles[0].contents);}
 if(req.url.startsWith('/fonts/identity/')&&/^\/fonts\/identity\/Liberation[A-Za-z-]+\.ttf$/.test(req.url))return res.end(await readFile(root+'/public'+req.url));
 if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');return res.end(await readFile(root+'/src/styles.css'));}
 res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']}),page=await browser.newPage({acceptDownloads:true});
const requests=[];let fail=false;
const identity={name:'Ivan Horvat',oib:'00000000000',username:'ivan.horvat2',email:'ivan.horvat2@skolehr.xyz',birthDate:'14.05.1986.',gender:'M',relationship:'TEACHER',validUntil:'31.10.2027.',school:{name:'Ogledna škola',id:'a',address:'Ogledna 1, 10000 Zagreb',locality:'HR-Zagreb',postalCode:'HR-10000'}};
await page.route('https://ednevnik.skolehr.xyz/**',async route=>{
 const body=route.request().postDataJSON();requests.push(body);
 if(fail)return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({success:false,error:'WebmailHR nije potvrdio aktivaciju.'})});
 return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({success:true,ready:true,password:'Abc123xy',expiresAt:Date.now()+300000,identity:body.operation?{...identity,relationship:'STUDENT'}:identity})});
});page.on('dialog',d=>d.accept());
try{
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('input[name=name]').fill('Ivan');await page.locator('input[name=surname]').fill('Horvat');await page.locator('input[name=oib]').fill('00000000000');await page.locator('input[name=dob]').fill('1986-05-14');await page.locator('select[name=gender]').selectOption('M');await page.locator('select[name=schoolYearId]').selectOption('year');
 await page.getByRole('button',{name:'Stvori korisnika'}).click();await page.getByRole('button',{name:'Preuzmi podatke o elektroničkom identitetu'}).waitFor();assert.equal(requests[0].electronicIdentity,true);assert.equal(requests[0].password,undefined);assert.equal(requests[0].pin,'1234');
 assert.equal(await page.getByText('Abc123xy',{exact:true}).count(),0);await page.getByRole('button',{name:'Prikaži izdanu lozinku'}).click();await page.getByLabel('Izdana lozinka').waitFor();
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Preuzmi podatke o elektroničkom identitetu'}).click();const download=await downloaded,doc=await PDFDocument.load(await readFile(await download.path()));assert.equal(doc.getPageCount(),1);
 assert(!await page.evaluate(()=>Object.values(localStorage).join('').includes('Abc123xy')||Object.values(sessionStorage).join('').includes('Abc123xy')));
 await page.getByRole('button',{name:'reset',exact:true}).click();await page.getByRole('button',{name:'Izdaj novu lozinku',exact:true}).click();await page.getByRole('button',{name:'Preuzmi podatke o elektroničkom identitetu'}).waitFor();assert.equal(requests.at(-1).profileId,'pupil-profile');assert.equal(requests.at(-1).operation,'issue');
 await page.getByRole('button',{name:'Zatvori i ukloni podatke prikaza'}).click();fail=true;await page.getByRole('button',{name:'Izdaj novu lozinku',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('button',{name:'Preuzmi podatke o elektroničkom identitetu'}).count(),0);
 console.log('Browser: teacher creation, pupil password issuance, actual A4 PDF download, volatile password, and failed activation verified.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
