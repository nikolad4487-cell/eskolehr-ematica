import { createRequire } from "node:module";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import assert from "node:assert/strict";
const require = createRequire(new URL("../package.json", import.meta.url));
const { build } = require("esbuild");
const { chromium } = await import("playwright-core");
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  out = join(tmpdir(), "skolehr-browser-ematica");
await mkdir(out, { recursive: true });
const entry = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{SchoolRegistryEditor,StaffRegistryEditor}from'${root}/src/components/registry/RegistryEditors.jsx';import StudentEducationEditor from'${root}/src/components/registry/StudentEducationEditor.jsx';import BulkSchoolingVerification from'${root}/src/components/registry/BulkSchoolingVerification.jsx';import RealApp from'${root}/src/App.jsx';import ExpertWorkspace from'${root}/src/components/registry/ExpertWorkspace.jsx';import CreateSchoolUserForm from'${root}/src/components/CreateSchoolUserForm.jsx';import ClassDetailsEditor from'${root}/src/components/registry/ClassDetailsEditor.jsx';window.__calls=[];function App(){const[mode,setMode]=useState('school');return <main className="workspace"><nav>{['school','approval','staff','student','class','bulk','expert','create-expert','expert-app'].map(x=><button key={x} onClick={()=>setMode(x)}>{x}</button>)}</nav>{mode==='school'?<SchoolRegistryEditor school={{id:'a',name:'Ogledna škola A',type:'SECONDARY',oib:'12345678901'}} onClose={()=>{}}/>:mode==='approval'?<SchoolRegistryEditor school={{id:'a',name:'Ogledna škola A',type:'SECONDARY'}} key="approval" initialSection="CERTIFICATES" onClose={()=>{}}/>:mode==='staff'?<StaffRegistryEditor profile={{id:'teacher',school_id:'a',name:'Ogledni Nastavnik'}} onClose={()=>{}}/>:mode==='expert-app'?<RealApp/>:mode==='expert'?<ExpertWorkspace/>:mode==='create-expert'?<CreateSchoolUserForm schools={[{id:'a',name:'Ogledna škola A'}]} adminScope={{schoolId:'a',isScoped:true}}/>:mode==='bulk'?<BulkSchoolingVerification adminScope={{schoolId:'a',isScoped:true}}/>:mode==='student'?<StudentEducationEditor studentId="student"/>:<ClassDetailsEditor classes={[{class_id:'class-a',class_name:'3.A',school_name:'Ogledna škola A',school_year_label:'2026./2027.'}]}/>}</main>}createRoot(document.getElementById('root')).render(<App/>);`;
const mock = `const result=(data)=>Promise.resolve({data,error:null});export const hasSupabaseConfig=true;export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'auth',email:'expert@example.test'},access_token:'fake'}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})},from(table){const data=window.__fullExpertApp&&table==='user_profiles'?{id:'expert',auth_user_id:'auth',role:window.__principal?'PRINCIPAL':'EXPERT',name:'Ogledni stručni suradnik',school_id:'a'}:window.__fullExpertApp&&table==='v_ematica_user_access'?{profile_id:'expert',auth_user_id:'auth',access_role:window.__principal?'PRINCIPAL':'EXPERT',is_admin:false,active_school_id:'a'}:window.__fullExpertApp&&table==='user_school_roles'?[{school_id:'a',role:window.__principal?'PRINCIPAL':'EXPERT',status:'ACTIVE'}]:table==='schools'?[{id:'a',name:'Ogledna škola A'}]:table==='school_years'?[{id:'year',label:'2026./2027.'}]:table==='student_class_enrollments'?[{id:'bulk-1',class_id:'class-a',status:'ACTIVE'},{id:'bulk-2',class_id:'class-a',status:'ACTIVE'},{id:'part-time',class_id:'class-a',status:'ACTIVE',attendance_mode:'PART_TIME'},{id:'already-verified',class_id:'class-a',status:'ACTIVE',attendance_mode:'REGULAR',status_verified_at:'2026-10-21',status_evidence:'Provjereno'}]:table==='grades'?[{id:'grade1',subject_id:'math',value:5,date:'2026-10-21',note:'Provjerena ocjena'}]:table==='absences'?[{id:'absence1',date:'2026-10-20',hour:1,status:'PENDING',note:'Provjeren izostanak'}]:table==='subjects'?[{id:'math',name:'Matematika'}]:table==='classes'?{id:'class-a',variant:'REGULAR'}:[];const q={maybeSingle(){return q},in(){return q},range(){return q},select(){return q},eq(){return q},order(){return q},single(){return q},then(a,b){return (table==='classes'&&window.__bulk?result([{id:'class-a',name:'3.A',school_id:'a',school_year_id:'year'},{id:'old-class',name:'2.A',school_id:'a',school_year_id:'old-year'}]):table==='school_registry_sections'&&window.__sectionFail?Promise.resolve({data:null,error:{message:'Matične kartice nisu dostupne'}}):result(data)).then(a,b)}};return q},rpc:async(name,args)=>{window.__calls.push({name,args});if(name==='registry_verify_enrollment'&&args._enrollment==='bulk-2'&&!window.__bulkRetry)return {data:null,error:{message:'Privremena greška upisa'}};const e={id:'enrollment',student_id:'profile',registry_student_id:'student',school_id:'a',year_name:'2026./2027.',class_name:'3.A',status:'ACTIVE',school_year_id:'year',education_details:{},program_name:'Program'};let data=null;if(name==='expert_workspace')data={schools:[{id:'a',name:'Ogledna škola A'}],classes:[{id:'a1',name:'3.A',school_id:'a',school_year_id:'year',year:'2026./2027.'},{id:'a2',name:'3.B',school_id:'a',school_year_id:'year',year:'2026./2027.'}],students:args?._class?[{id:args._class+'-student',name:args._class==='a1'?'Ogledna Učenica':'Druga Učenica',class_id:args._class}]:[],subjects:args?._class?[{id:'math',name:'Matematika'},{id:'sr',name:'Sat razrednika'}]:[]};else if(name==='expert_pedagogy'){if(window.__expertFail&&args._data)return {data:null,error:{message:'Spremanje nije dopušteno.'}};const key=args._student+'-'+(args._section||'PROFILE');window.__expertData||={};if(args._data)window.__expertData[key]={...window.__expertData[key],...args._data};data={student_id:args._student,...window.__expertData[key]};}else if(name==='registry_global_admin')data=true;else if(name==='registry_attestation_settings'){if(window.__attestationFail)return {data:null,error:{message:'Nemate ovlasti za ustanovu.'}};if(args._approve!==undefined){if(window.__approvalFail)return {data:null,error:{message:'Odobrenje nije dopušteno.'}};window.__settings={...window.__settings,attestation_authorized:args._approve}}data=window.__settings||{}}else if(name==='registry_student_enrollments')data=[e];else if(name==='registry_special_exams')data=[];else if(name==='registry_program_targets')data={schools:[{id:'a',name:'Ogledna škola A'},{id:'b',name:'Umjetnička škola B'}],classes:[{id:'class-b',name:'1.A',school_year:'2026./2027.'}],programs:[{id:'art',name:'Glazbeni program'}]};return {data,error:null}}};`;
const bundle = await build({
  stdin: { contents: entry, resolveDir: root, loader: "jsx" },
  bundle: true,
  format: "esm",
  define: { "import.meta.env": JSON.stringify({VITE_APP_MODULE:"ematica"}) },
  write: false,
  plugins: [
    {
      name: "mock-db",
      setup(b) {
        b.onResolve({ filter: /supabase$/ }, () => ({
          path: "db",
          namespace: "mock",
        }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: mock,
          loader: "js",
        }));
      },
    },
  ],
});
const css = await readFile(root + "/src/styles.css");
const server = createServer((req, res) => {
  if (req.url === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].contents);
  } else if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else
    res.end(
      '<html lang="hr"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script type="module" src="/app.js"></script></body></html>',
    );
});
await new Promise((r) => server.listen(4326, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
await page.route("**/*", (r) =>
  new URL(r.request().url()).hostname === "127.0.0.1"
    ? r.continue()
    : r.abort(),
);
try {
  await page.goto("http://127.0.0.1:4326");
  await page
    .getByRole("button", { name: "Spremi podatke ustanove", exact: true })
    .waitFor();
  await page.getByLabel("Telefon", { exact: true }).fill("012345678");
  await page
    .getByRole("button", { name: "Spremi podatke ustanove", exact: true })
    .click();
  await page.getByText("Podaci ustanove su spremljeni.").waitFor();
  for (const name of [
    "O ustanovi",
    "Temeljna dokumentacija",
    "Infrastruktura",
    "Programi",
    "Fakultativni predmeti",
    "Djelatnici",
    "Ostalo",
    "Svjedodžbe",
  ])
    await page.getByRole("button", { name, exact: true }).click();
  assert.equal(
    await page
      .getByText("Imenovanje administratora predškolske ustanove")
      .count(),
    0,
  );
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      JSON.stringify(viewport),
    );
    await page.screenshot({
      path: out + "/ematica-" + viewport.width + ".png",
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  // Approval remains available when unrelated school tabs cannot load.
  await page.evaluate(() => {
    window.__sectionFail = true;
    window.__settings = {
      signer_name: "Test Referent",
      signature_path: "a/sign.png",
      stamp_path: "a/stamp.png",
      attestation_authorized: false,
    };
  });
  await page.getByRole("button", { name: "approval", exact: true }).click();
  const approval = page.getByRole("complementary", {
    name: "Ovjera dokumenata Školske referade",
  });
  await approval
    .getByRole("button", { name: "Odobri primjenu pečata i potpisa" })
    .click();
  await approval
    .getByText("Primjena vizualne ovjere je odobrena.", { exact: true })
    .waitFor();
  assert.equal(
    await approval
      .getByRole("button", { name: "Odobri primjenu pečata i potpisa" })
      .isEnabled(),
    false,
  );
  await approval.getByRole("button", { name: "Opozovi odobrenje" }).click();
  await approval
    .getByText("Primjena vizualne ovjere je opozvana.", { exact: true })
    .waitFor();
  await page.evaluate(() => {
    window.__approvalFail = true;
  });
  await approval
    .getByRole("button", { name: "Odobri primjenu pečata i potpisa" })
    .click();
  await approval
    .getByText("Odobrenje nije dopušteno.", { exact: true })
    .waitFor();
  assert.equal(
    await approval
      .getByRole("button", { name: "Opozovi odobrenje" })
      .isEnabled(),
    false,
  );
  await page.evaluate(() => {
    window.__approvalFail = false;
    window.__attestationFail = true;
  });
  await approval
    .getByRole("button", { name: "Osvježi postavke ovjere" })
    .click();
  await approval.getByRole("alert").waitFor();
  assert.match(await approval.getByRole("alert").innerText(), /Nemate ovlasti/);
  await page.evaluate(() => {
    window.__attestationFail = false;
    window.__sectionFail = false;
  });
  await approval
    .getByRole("button", { name: "Ponovi dohvat postavki" })
    .click();
  await approval
    .getByRole("button", { name: "Odobri primjenu pečata i potpisa" })
    .waitFor();
  const approvals = await page.evaluate(() =>
    window.__calls.filter(
      (x) =>
        x.name === "registry_attestation_settings" &&
        x.args._approve !== undefined,
    ),
  );
  assert(approvals.every((x) => x.args._school === "a"));
  assert(approvals.some((x) => x.args._approve === true));
  assert(approvals.some((x) => x.args._approve === false));

  await page.getByRole("button", { name: "student", exact: true }).click();
  await page
    .getByLabel("Status školovanja", { exact: false })
    .selectOption("REGULAR");
  await page
    .getByLabel("Osnova provjere", { exact: false })
    .fill("Provjeren upisni dokument");
  await page
    .getByRole("button", {
      name: "Potvrdi status za dokumente referade",
      exact: true,
    })
    .click();
  await page.getByText("Podaci su spremljeni.", { exact: true }).waitFor();
  await page.getByLabel("Ciljna ustanova", { exact: false }).selectOption("b");
  await page
    .getByLabel("Ciljni razred", { exact: false })
    .selectOption("class-b");
  await page.getByLabel("Novi program", { exact: false }).selectOption("art");
  await page.getByLabel("Datum početka novog razdoblja").fill("2026-10-21");
  await page
    .getByLabel("Osnova / razlog promjene")
    .fill("Rješenje o paralelnom upisu");
  await page
    .getByLabel("Paralelni umjetnički program", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Spremi novi upis i povijest" })
    .click();
  await page
    .getByText(
      "Novi upis je spremljen; prethodno razdoblje ostalo je u povijesti.",
    )
    .waitFor();
  const calls = await page.evaluate(() => window.__calls);
  assert(
    calls.some(
      (x) =>
        x.name === "registry_verify_enrollment" &&
        x.args._enrollment === "enrollment" &&
        x.args._mode === "REGULAR",
    ),
  );
  assert(
    calls.some(
      (x) =>
        x.name === "registry_change_program" &&
        x.args._class === "class-b" &&
        x.args._parallel === true,
    ),
  );
  await page.getByRole("button", { name: "class", exact: true }).click();
  await page.getByLabel("Razred / skupina").selectOption("class-a");
  await page.getByLabel("Vrsta odjela").selectOption("COMBINED");
  await page.getByLabel("1. razred", { exact: true }).check();
  await page.getByLabel("2. razred", { exact: true }).check();
  await page.getByRole("button", { name: "Spremi podatke odjela" }).click();
  await page.getByText("Podaci razrednog odjela su spremljeni.").waitFor();
  await page.evaluate(() => { window.__bulk = true; });
  await page.getByRole('button', { name: 'bulk', exact: true }).click();
  await page.getByLabel('Školska godina za grupnu potvrdu', { exact: true }).selectOption('year');
  await page.getByRole('button', { name: 'Prikaži upise za grupnu potvrdu', exact: true }).click();
  await page.getByText('Aktivnih upisa: 4. Za potvrdu: 2. Preskočeno: 2.', { exact: true }).waitFor();
  const bulkButton = page.getByRole('button', { name: 'Potvrdi redovito školovanje za sve uključene upise (2)', exact: true });
  assert.equal(await bulkButton.isEnabled(), false);
  await page.getByLabel('Zajednička osnova provjere', { exact: true }).fill('Upisna dokumentacija 2026./2027.');
  await page.getByLabel('Potvrđujem da svi uključeni upisi').check();
  await bulkButton.click();
  await page.getByText('Potvrđeno upisa: 1. Neuspješno: 1.', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__calls.filter((c) => c.name === 'registry_verify_enrollment' && c.args._enrollment.startsWith('bulk-')).map((c) => c.args._enrollment)), ['bulk-1', 'bulk-2']);
  await page.evaluate(() => { window.__bulkRetry = true; });
  await page.getByLabel('Potvrđujem da svi uključeni upisi').check();
  await page.getByRole('button', { name: 'Potvrdi redovito školovanje za sve uključene upise (1)', exact: true }).click();
  await page.getByText('Potvrđeno upisa: 1. Neuspješno: 0.', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.__calls.filter((c) => c.name === 'registry_verify_enrollment' && c.args._enrollment.startsWith('bulk-')).map((c) => c.args._enrollment)), ['bulk-1', 'bulk-2', 'bulk-2']);
  for (const width of [1280, 1366, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Bulk verification overflow at ${width}`);
  }
  await page.getByRole('button', { name: 'expert', exact: true }).click();
  await page.getByLabel('Razred stručnog suradnika').selectOption('a1');
  await page.getByLabel('Učenik stručnog suradnika').selectOption('a1-student');
  await page.getByLabel('Razlog posjeta', { exact: true }).fill('Razgovor o podršci učenici');
  await page.getByRole('button', { name: 'Spremi pedagoški karton', exact: true }).click();
  await page.getByText('Pedagoška dokumentacija je spremljena.', { exact: true }).waitFor();
  await page.getByLabel('Preporuke', { exact: true }).fill('Individualizirana podrška');
  await page.getByRole('button', { name: 'Spremi godišnju dokumentaciju', exact: true }).click();
  await page.getByText('Pedagoška dokumentacija je spremljena.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Škola stručnog suradnika').locator('option').count(), 1);
  assert.equal(await page.getByRole('listitem').filter({hasText:'Matematika'}).count(), 1);
  assert.equal(await page.getByRole('button', { name: /Spremi ocjen|Dodaj ocjen/ }).count(), 0);
  await page.getByLabel('Razred stručnog suradnika').selectOption('a2');
  await page.getByLabel('Učenik stručnog suradnika').selectOption('a2-student');
  await page.getByLabel('Razlog posjeta', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Razlog posjeta', { exact: true }).inputValue(), '');
  await page.evaluate(() => { window.__expertFail = true; });
  await page.getByLabel('Razlog posjeta', { exact: true }).fill('Neuspjeli unos');
  await page.getByRole('button', { name: 'Spremi pedagoški karton', exact: true }).click();
  await page.getByText('Spremanje nije dopušteno.', { exact: true }).waitFor();
  const expertWrites=await page.evaluate(() => window.__calls.filter(c=>c.name==='expert_pedagogy'&&c.args._data));
  assert.equal(expertWrites[0].args._student,'a1-student');
  assert.equal(expertWrites[0].args._class,'a1');
  assert.equal(expertWrites[1].args._section,'YEAR');
  for(const width of [1366,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  await page.getByRole('button', { name: 'create-expert', exact: true }).click();
  await page.getByLabel('Uloga', { exact: true }).selectOption('EXPERT');
  assert.equal(await page.getByLabel('Uloga', { exact: true }).inputValue(),'EXPERT');
  await page.evaluate(() => { window.__fullExpertApp = true; sessionStorage.setItem('skolehr:127.0.0.1:ematica:activePage', JSON.stringify('users')); });
  await page.getByRole('button', { name: 'expert-app', exact: true }).click();
  await page.locator('.app-shell').getByRole('heading', {name:'Stručni suradnik — razredi, učenici i pedagoška dokumentacija',exact:true}).waitFor();
  assert.deepEqual(await page.locator('.app-shell .nav-list button').allTextContents(), ['Stručna služba']);
  assert.equal(await page.locator('.app-shell').getByRole('heading', {name:/Novi korisnik/i}).count(), 0);
  assert.equal(await page.locator('.app-shell').getByLabel('Razred stručnog suradnika').count(),1);
  await page.getByRole('button', { name: 'create-expert', exact: true }).click();
  await page.getByLabel('Uloga', { exact: true }).selectOption('PRINCIPAL');
  assert.equal(await page.getByLabel('Uloga', { exact: true }).inputValue(),'PRINCIPAL');
  await page.evaluate(() => { window.__principal=true; window.__expertFail=false; sessionStorage.clear(); window.__calls=[]; });
  await page.getByRole('button', { name: 'expert-app', exact: true }).click();
  const principal=page.locator('.app-shell');
  await principal.getByRole('heading', {name:'Ravnatelj — pregled škole',exact:true}).waitFor();
  assert.deepEqual(await principal.locator('.nav-list button').allTextContents(), ['Pregled ravnatelja']);
  await principal.getByLabel('Razred ravnatelja').selectOption('a1');
  await principal.getByText('Provjerena ocjena',{exact:true}).waitFor();
  await principal.getByText('Provjeren izostanak',{exact:true}).waitFor();
  assert(await principal.getByLabel('Razlog posjeta',{exact:true}).isDisabled());
  assert.equal(await principal.getByRole('button',{name:/Spremi pedagoški|Spremi godišnju|Stvori korisnika/}).count(),0);
  assert.equal(await page.evaluate(()=>window.__calls.filter(c=>c.name==='expert_pedagogy'&&c.args?._data).length),0);
  assert.equal(await principal.getByRole('link',{name:'Otvori ravnateljsku upravljačku ploču u e-Dnevniku'}).getAttribute('href'),'https://ednevnik.skolehr.xyz/ravnatelj');
  for(const width of [1366,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
  assert.deepEqual(errors, []);
  const report = {
    passed: true,
    mocked_data: true,
    checks: [
      "all nine institution tabs",
      "direct approval tab, scoped approve/revoke, visible errors and retry without unrelated school data",
      "school form saves selected institution",
      "preschool forms hidden in secondary school",
      "verified status linked to exact enrollment",
      "parallel art transfer selects another authorized institution",
      "combined class levels saved",
      "bulk regular schooling verification, shared evidence, skipped non-regular and verified upises, partial failure and retry",
      "no horizontal overflow at 1280,1366,1920,390",
      "specialist workspace edits only pedagogy, scopes class/student, surfaces failure and supports laptop/mobile",
      "specialist role available in user creation",
      "actual application recognizes EXPERT membership and exposes only specialist navigation despite a cached admin page",
      "principal role, read-only real App navigation, grades/absences, disabled pedagogy and dashboard link",
      "no React errors",
    ],
  };
  await writeFile(
    out + "/ematica-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (e) {
  console.log(errors, await page.locator("body").innerText());
  await page.screenshot({ path: out + "/ematica-failure.png", fullPage: true });
  throw e;
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
