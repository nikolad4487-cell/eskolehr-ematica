// Render the real pupil page with synthetic records inside the application shell.
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const out = '/tmp/skolehr-laptop-layout';
await mkdir(out, { recursive: true });
const entry = `import React from 'react';import {createRoot} from 'react-dom/client';
import {Students} from '${root}/src/App.jsx';
const groups=['Ustanove','Djelatnici','Učenici','Udžbenici','Izvješća','Eksport/import podataka','Pomoć'];
createRoot(document.getElementById('root')).render(<div className="app-shell has-subnav">
<aside className="sidebar"><div className="brand"><strong>e-Matica</strong><span>Samostalni sustav za e-Maticu i upise</span></div><nav className="nav-list">{['Učenici','Upisi','Obrazovanje učenika','Prijevoz učenika','Premještaji učenika','Prijelaz školske godine'].map(x=><button key={x}>{x}</button>)}</nav></aside>
<main className="main"><header className="topbar"><div className="topbar-main"><div className="breadcrumb-line">e-Matica / Administracija</div><div className="section-switcher"><button>e-Matica</button></div><nav className="main-tabs">{groups.map(x=><button key={x}><span>▣</span><span>{x}</span></button>)}</nav><div className="page-title"><h1>Učenici</h1></div><p>Administracija, matične evidencije i završni dokumenti</p></div><div className="topbar-actions"><label className="active-school-switcher">Aktivna ustanova<select><option>Ogledna srednja škola s dugim nazivom, Zagreb</option></select></label><div className="user-chip"><span>Prijavljeni korisnik</span><strong>Ogledni Administrator</strong></div><button className="icon-text">Odjava</button></div></header>
<section className="content"><Students isAdmin={true}/></section></main></div>);`;
const mock = `export const hasSupabaseConfig=true;const student={registry_student_id:'pupil',full_name:'Ogledna Učenica',first_name:'Ogledna',last_name:'Učenica',student_status:'ACTIVE',class_name:'3.A',school_name:'Ogledna srednja škola s dugim nazivom, Zagreb',program_name:'Tehničarka za ugostiteljstvo / Tehničar za ugostiteljstvo',school_year_label:'2026./2027.',ednevnik_student_id:'profile'};export const supabase={from(t){const q={select(){return q},order(){return q},eq(){return q},then(a,b){return Promise.resolve({data:t.startsWith('v_ematica_students_current')?[student]:[],error:null}).then(a,b)}};return q},rpc:async(n)=>({error:null,data:n==='registry_student_enrollments'?[{id:'enrollment',class_name:'3.A',school_id:'school',year_name:'2026./2027.',program_name:'Tehničar/Tehničarka za ugostiteljstvo s proširenim nazivom obrazovnog programa',status:'ACTIVE'}]:[]})};`;
const bundle = await build({stdin:{contents:entry,resolveDir:root,loader:'jsx'},bundle:true,format:'esm',write:false,define:{'import.meta.env':'{}'},plugins:[{name:'test-page',setup(b){
  b.onResolve({filter:/supabase$/},()=>({path:'db',namespace:'mock'}));
  b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:mock,loader:'js'}));
  b.onLoad({filter:/\/src\/App.jsx$/},async(args)=>({contents:await readFile(args.path,'utf8')+'\nexport { Students };',loader:'jsx'}));
}}]});
const css = await readFile(process.env.LAYOUT_CSS_PATH || root+'/src/styles.css');
const server = createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].contents);}
  else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(css);}
  else res.end('<html lang="hr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser = await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page = await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
const results=[];
try {
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.getByRole('heading',{name:'Ogledna Učenica',exact:true}).waitFor({timeout:5000});
  for (const [width,height] of [[1920,1080],[1745,900],[1536,864],[1440,900],[1366,768],[1280,800],[1024,768],[768,1024],[390,844]]) {
    await page.setViewportSize({width,height});
    const geometry = await page.evaluate(()=>{
      const rect=(s)=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width};};
      return {viewport:innerWidth,body:document.documentElement.scrollWidth,main:rect('.main'),header:rect('.topbar'),list:rect('.master-detail > :first-child'),profile:rect('.master-detail > :last-child'),logout:rect('.topbar-actions .icon-text'),add:rect('.inline-form button'),profileFieldsOverflow:[...document.querySelectorAll('.master-detail > :last-child select,.master-detail > :last-child input')].filter(x=>x.getBoundingClientRect().right>document.querySelector('.master-detail > :last-child').getBoundingClientRect().right+1).length};
    });
    results.push({width,height,...geometry});
    await page.screenshot({path:out+'/'+width+'.png',fullPage:width>=1280});
    assert(geometry.body<=width+1, 'Page overflow at '+width+': '+JSON.stringify(geometry));
    assert(geometry.logout.right<=width+1,'Logout clipped at '+width);
    assert(geometry.add.right<=width+1,'Add pupil button clipped at '+width);
    assert(geometry.profile.right<=width+1,'Profile clipped at '+width);
    assert.equal(geometry.profileFieldsOverflow,0,'Profile fields clipped at '+width);
    if(width===1920) assert(geometry.profile.x>geometry.list.x+100,'Keep desktop side-by-side layout');
    if(width===1280) assert(geometry.profile.y>=geometry.list.bottom,'Stack profile when the content is too narrow');
    // The table can scroll locally; actions must remain reachable inside it.
    const table = page.locator('.master-detail .table-wrap').first();
    await table.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
    const action=page.getByRole('button',{name:'Otvori',exact:true});
    await action.click();
  }
  assert.deepEqual(errors,[]);
  await writeFile(out+'/report.json',JSON.stringify(results,null,2));
  console.log('PASS: actual Students page, full shell, 9 viewport sizes, bounded profile fields, reachable table actions, desktop columns and laptop stacking.');
} catch(e) { console.log(errors, await page.locator('body').innerText()); throw e; } finally {await browser.close();await new Promise(r=>server.close(r));}
