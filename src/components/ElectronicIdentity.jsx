import React,{useEffect,useRef,useState} from 'react';
import {supabase} from '../lib/supabase';
import {downloadElectronicIdentity} from '../lib/electronicIdentityPdf';

export function IdentityReceipt({issued,onClear}){
 const [visible,setVisible]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  const hide=()=>{if(document.visibilityState==='hidden')onClear();};
  const timer=setTimeout(onClear,Math.max(0,Math.min(300000,issued.expiresAt-Date.now())));
  document.addEventListener('visibilitychange',hide);return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',hide);};
 },[issued,onClear]);
 const download=async()=>{try{if(Date.now()>issued.expiresAt){onClear();return;}await downloadElectronicIdentity(issued);}catch(e){setError(e.message);}};
 return <section className="notice" aria-label="Izdani elektronički identitet">
  <strong>Elektronički identitet je izdan.</strong><p>{issued.identity.email} — rok povezanosti {issued.identity.validUntil}</p>
  <p>{issued.identity.relationship==='TEACHER'?'Lozinka vrijedi za WebmailHR. PIN i autentifikator za e-Dnevnik ostaju nepromijenjeni.':'Nova lozinka potvrđena je za e-Dnevnik i WebmailHR.'}</p>
  <button type="button" onClick={()=>setVisible(x=>!x)}>{visible?'Sakrij lozinku':'Prikaži izdanu lozinku'}</button>{visible&&<output aria-label="Izdana lozinka"> {issued.password}</output>}
  <div className="row-actions"><button type="button" className="primary" onClick={download}>Preuzmi podatke o elektroničkom identitetu</button><button type="button" onClick={onClear}>Zatvori i ukloni podatke prikaza</button></div>
  <p>Podaci prikaza dostupni su najviše pet minuta i uklanjaju se pri napuštanju kartice. Preuzeti PDF sadrži lozinku; predajte ga korisniku sigurnim putem.</p>
  {error&&<p role="alert">{error}</p>}
 </section>;
}

export default function ElectronicIdentity({profileId,schoolId,schoolYearId,onClose}){
 const [issued,setIssued]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false),[year,setYear]=useState(schoolYearId||''),[years,setYears]=useState([]);
 const alive=useRef(true);
 useEffect(()=>{let live=true;alive.current=true;supabase.from('school_years').select('id,name,label').eq('school_id',schoolId).then(r=>{if(live&&!r.error)setYears(r.data||[]);});return()=>{live=false;alive.current=false;};},[schoolId]);
 const issue=async()=>{
  if(!window.confirm('Izdati novu lozinku? Učeniku vrijedi za e-Dnevnik i WebmailHR; nastavniku samo za WebmailHR. Nastavnikov PIN i autentifikator se ne mijenjaju.'))return;
  setIssued(null);setError('');setSaving(true);
  try{
   const {data,error:authError}=await supabase.auth.getSession();if(authError||!data.session)throw Error('Prijavite se ponovno.');
   const response=await fetch('https://ednevnik.skolehr.xyz/api/admin/electronic-identity',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({operation:'issue',profileId,schoolId,...(year?{schoolYearId:year}:{})})});
   const result=await response.json();if(!response.ok||!result.ready)throw Error(result.error||'Izdavanje nije dovršeno.');
   if(alive.current&&document.visibilityState!=='hidden')setIssued(result);
  }catch(e){if(alive.current)setError(e.message);}finally{if(alive.current)setSaving(false);}
 };
 return <section className="panel"><h3>Podaci o elektroničkom identitetu</h3>
  {!issued&&<><label>Dodijeljena školska godina<select value={year} onChange={e=>setYear(e.target.value)} disabled={saving}><option value="">Postojeća povezanost / upis</option>{years.map(y=><option key={y.id} value={y.id}>{y.label||y.name}</option>)}</select></label>
  <p>Izdavanje nove lozinke čuva postojeći datum isteka. Učeniku se rok produljuje evidentiranjem novog upisa, uključujući ponavljanje razreda.</p>
  <button type="button" className="primary" disabled={saving||!profileId||!schoolId} onClick={issue}>{saving?'Provjera i izdavanje…':'Izdaj novu lozinku'}</button></>}
  {issued&&<IdentityReceipt issued={issued} onClear={()=>setIssued(null)}/>}{error&&<p role="alert">{error}</p>}
  {onClose&&<button type="button" disabled={saving} onClick={onClose}>Zatvori</button>}
 </section>;
}
