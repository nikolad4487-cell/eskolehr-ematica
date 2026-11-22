// Render the real pupil page with synthetic records inside the application shell.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const out = '/tmp/skolehr-staff-layout';
await mkdir(out, { recursive: true });
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {StaffDirectory} from '${root}/src/App.jsx';
const groups=['Ustanove','Djelatnici','Učenici','Udžbenici','Izvješća','Eksport/import podataka','Pomoć'];
createRoot(document.getElementById('root')).render(<div className="app-shell has-subnav">
<aside className="sidebar"><div className="brand"><strong>e-Matica</strong><span>Samostalni sustav za e-Maticu i upise</span></div><nav className="nav-list">{['Učenici','Upisi','Obrazovanje učenika','Prijevoz učenika','Premještaji učenika','Prijelaz školske godine'].map(x=><button key={x}>{x}</button>)}</nav></aside>
<main className="main"><header className="topbar"><div className="topbar-main"><div className="breadcrumb-line">e-Matica / Administracija</div><div className="section-switcher"><button>e-Matica</button></div><nav className="main-tabs">{groups.map(x=><button key={x}><span>▣</span><span>{x}</span></button>)}</nav><div className="page-title"><h1>Učenici</h1></div><p>Administracija, matične evidencije i završni dokumenti</p></div><div className="topbar-actions"><label className="active-school-switcher">Aktivna ustanova<select><option>Ogledna srednja škola s dugim nazivom, Zagreb</option></select></label><div className="user-chip"><span>Prijavljeni korisnik</span><strong>Ogledni Administrator</strong></div><button className="icon-text">Odjava</button></div></header>
<section className="content"><StaffDirectory adminScope={{isScoped:true,schoolId:"school",schoolName:"Ogledna srednja škola, Zagreb"}}/></section></main></div>);`;
const mock = `export const hasSupabaseConfig=true;const user={id:'teacher',auth_user_id:'auth-teacher',name:'Ogledna Nastavnica Dugačkog Prezimena',email:'ogledna.nastavnica.dugackog.prezimena2@skolehr.xyz',role:'TEACHER',school_id:'school'};export const supabase={from(t){const q={select(){return q},order(){return q},eq(){return q},in(){return q},then(a,b){return Promise.resolve({data:t==='schools'?[{id:'school',name:'Ogledna srednja škola s vrlo dugim nazivom, Zagreb'}]:t==='user_school_roles'?[{id:'role',user_id:user.id,school_id:'school',role:'TEACHER',status:'ACTIVE',user}]:[],error:null}).then(a,b)}};return q},auth:{getSession:async()=>({data:{session:null}})}};`;
const bundle = await build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,format:'esm',write:false,define:{'import.meta.env':'{}'},plugins:[{name:'test-page',setup(b){
  b.onResolve({filter:/supabase$/},()=>({path:'db',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,loader:'js'}));
  b.onLoad({filter:/\/src\/App.jsx$/},async(args)=>({contents:await readFile(args.path,'utf8')+'\nexport { StaffDirectory };',loader:'jsx'}));
}}]});
const css = await readFile(process.env.LAYOUT_CSS_PATH || root+'/src/styles.css');
const server = createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else res.end('<html lang="hr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
try{
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.getByRole('button',{name:'Uredi',exact:true}).waitFor();
 for(const width of [320,360,390,640,768,980,1024,1280,1366,1536,1920,2560]){
  await page.setViewportSize({width,height:900});
  const wrap=page.locator('.staff-table');await wrap.evaluate(e=>e.scrollLeft=0);
  const size=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(size.body<=width+1,'Page overflow at '+width+': '+JSON.stringify(size));
  const table=await wrap.boundingBox();assert(table.x>=0&&table.x+table.width<=width+1,'Table bounds '+width);
  if(width<=640)assert(await wrap.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Mobile cards must fit '+width);
  await wrap.evaluate(e=>e.scrollLeft=e.scrollWidth);
  const first=await wrap.locator('tbody td').first().boundingBox();assert(first.x>=table.x-1,'Name remains visible '+width);
  const remove=page.getByRole('button',{name:'Obriši',exact:true});await remove.scrollIntoViewIfNeeded();
  const action=await remove.boundingBox();assert(action.x>=0&&action.x+action.width<=width+1,'Actions reachable '+width);
  await page.getByRole('button',{name:'Uredi',exact:true}).click();
  assert(await page.locator('input').evaluateAll(nodes=>nodes.every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1;})),'Form fields fit '+width);
  await page.getByRole('button',{name:'Odustani',exact:true}).click();
  if([390,1366,1920].includes(width))await page.screenshot({path:out+'/'+width+'.png',fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS: real StaffDirectory at 12 widths, long names/email, mobile cards, sticky names, reachable actions and edit forms.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
