import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=join(tmpdir(),'skolehr-admission-import-test'); await mkdir(out,{recursive:true});
await build({stdin:{resolveDir:root,loader:'jsx',contents:`
import React from 'react'; import{createRoot}from'react-dom/client';
import Panel from './src/components/EmaticaClassImport.jsx';
window.calls=[]; window.fail=false; window.imported=false;
const client={rpc:async(name,args)=>{
 window.calls.push({name,args});
 if(name==='list_ematica_students_for_class')return {data:args.p_class_id==='empty'?[]:[
 {school_enrollment_id:'one',registry_student_id:'r1',full_name:'Ogledni Učenik',program_name:'Gimnazija',from_admissions:true,issue:window.imported?'Učenik je već raspoređen u razred.':null},
 {school_enrollment_id:'two',registry_student_id:'r2',full_name:'Drugi Učenik',program_name:'Gimnazija',issue:'Nedostaje poveznica s računom e-Dnevnika.'}]};
 if(window.fail)return {error:{message:'Razred je zaključan.'}};
 window.imported=true; return {data:[{class_enrollment_id:'new'}]};
}};
createRoot(document.getElementById('root')).render(<Panel client={client} classes={[
 {id:'first',name:'1. A',school_year:'2027/2028'},{id:'empty',name:'1. B',school_year:'2027/2028'}]} onSaved={()=>{window.saved=true}}/>);
`},outfile:join(out,'app.js'),bundle:true,format:'esm',jsx:'automatic'});
await writeFile(join(out,'index.html'),'<!doctype html><html lang="hr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;margin:12px;background:#f8fafc"><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
const server=createServer(async(req,res)=>{const script=req.url==='/app.js';res.setHeader('Content-Type',script?'application/javascript':'text/html; charset=utf-8');res.end(await readFile(join(out,script?'app.js':'index.html')));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1100,height:780}});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 assert.equal(await page.evaluate(()=>window.calls.length),0,'no import or read before class selection');
 await page.getByLabel('Ciljni razred za povlačenje').selectOption('first');
 await page.getByText('Ogledni Učenik',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Odaberi Drugi Učenik',{exact:true}).isDisabled(),true);
 await page.getByLabel('Odaberi Ogledni Učenik',{exact:true}).check();
 await page.getByLabel('Ciljni razred za povlačenje').selectOption('empty');
 await page.getByText(/Nema aktivnih upisa/).waitFor();
 assert.equal(await page.getByRole('button',{name:'Povuci odabrane u razred (0)'}).isDisabled(),true);
 await page.getByLabel('Ciljni razred za povlačenje').selectOption('first');
 await page.getByLabel('Odaberi Ogledni Učenik',{exact:true}).check();
 await page.evaluate(()=>{window.fail=true});
 await page.getByRole('button',{name:'Povuci odabrane u razred (1)'}).click();
 await page.getByRole('alert').filter({hasText:'Razred je zaključan.'}).waitFor();
 await page.getByRole('button',{name:'Osvježi učenike'}).click();
 await page.getByLabel('Odaberi Ogledni Učenik',{exact:true}).check();
 await page.screenshot({path:join(out,'desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:join(out,'mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile layout has no horizontal overflow');
 await page.evaluate(()=>{window.fail=false});
 await page.getByRole('button',{name:'Povuci odabrane u razred (1)'}).click();
 await page.getByRole('status').filter({hasText:'U razred je povučeno 1 učenika.'}).waitFor();
 assert.equal(await page.getByLabel('Odaberi Ogledni Učenik',{exact:true}).isDisabled(),true);
 const imports=await page.evaluate(()=>window.calls.filter(c=>c.name==='import_ematica_students_to_class'));
 assert.equal(imports.length,2); assert.deepEqual(imports[1].args,{p_class_id:'first',p_school_enrollment_ids:['one']});
 console.log(JSON.stringify({passed:true,checks:['scope reset','unlinked account blocked','server error retained','explicit import','duplicate prevented','mobile layout'],screenshots:out}));
} finally {await browser.close();await new Promise(r=>server.close(r));}
