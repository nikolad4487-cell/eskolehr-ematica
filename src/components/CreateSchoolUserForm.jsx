import React, { useEffect, useState,useRef } from 'react';
import { createSchoolUser } from '../lib/createSchoolUser';
import { supabase } from '../lib/supabase';
import ElectronicIdentity,{IdentityReceipt} from './ElectronicIdentity';

export default function CreateSchoolUserForm({ schools, adminScope = {}, onCreated }) {
  const empty = { schoolId: adminScope.isScoped ? adminScope.schoolId : '', name: '', surname: '', email: '', password: '', pin: '1234', role: 'TEACHER',oib:'',dob:'',gender:'',schoolYearId:'',classId:'' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [issued,setIssued]=useState(null),[partial,setPartial]=useState(null),[years,setYears]=useState([]),[classes,setClasses]=useState([]);
  const revision=useRef(0);
  const [withIdentity,setWithIdentity]=useState(true);
  const identityRole=['STUDENT','TEACHER'].includes(form.role),identityMode=identityRole&&withIdentity;
  useEffect(()=>{let live=true;revision.current++;setIssued(null);setPartial(null);setYears([]);setClasses([]);if(form.schoolId){
    supabase.from('school_years').select('id,name,label').eq('school_id',form.schoolId).then(r=>{if(live&&!r.error)setYears(r.data||[]);});
    supabase.from('classes').select('id,name,school_year_id').eq('school_id',form.schoolId).then(r=>{if(live&&!r.error)setClasses(r.data||[]);});
  }return()=>{live=false;revision.current++;};},[form.schoolId]);
  useEffect(() => { if (adminScope.isScoped) setForm(current => ({ ...current, schoolId: adminScope.schoolId })); }, [adminScope.isScoped, adminScope.schoolId]);
  const change = event => {setIssued(null);setPartial(null);setForm(current => ({ ...current, [event.target.name]: event.target.value,...(['schoolId','schoolYearId'].includes(event.target.name)?{classId:''}:{}) }));};
  const submit = async event => {
    event.preventDefault();const run=++revision.current; setMessage('');setIssued(null);setPartial(null); setSaving(true);
    try {
      const { role, ...values } = form;
      const schoolId = adminScope.isScoped ? adminScope.schoolId : values.schoolId;
      const result=await createSchoolUser(supabase, { ...values, schoolId, roles: [role],electronicIdentity:identityMode,...(identityMode?{password:undefined}:{}),...(role==='STUDENT'?{studentData:{classId:values.classId,schoolYearId:values.schoolYearId,dob:values.dob,gender:values.gender,oib:values.oib}}:{}) });
      if(run!==revision.current)return;
      if(result.ready&&document.visibilityState!=='hidden')setIssued(result);
      setForm({ ...empty, schoolId });
      setMessage(result.ready?'Korisnik je stvoren i elektronički identitet je potvrđen.':'Korisnik je stvoren i povezan sa školom. Elektronički identitet i aktivacija WebmailHR-a nisu potvrđeni.');
      onCreated?.(schoolId);
    } catch (error) { if(run===revision.current){setMessage(error.message);if(error.createdProfileId){setPartial({profileId:error.createdProfileId,schoolId:form.schoolId});onCreated?.(form.schoolId);}} }
    finally { setSaving(false); }
  };
  return <form className="stack create-school-user-form" onSubmit={submit}>
    <fieldset disabled={saving} className="user-create-fields">
      <label>Škola<select aria-label="Škola" name="schoolId" value={form.schoolId} onChange={change} disabled={adminScope.isScoped} required>
        <option value="">Odaberite školu</option>{schools.filter(s => !adminScope.isScoped || s.id === adminScope.schoolId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      {identityRole&&<label><input type="checkbox" checked={withIdentity} onChange={e=>{setWithIdentity(e.target.checked);setIssued(null);}}/> Izdaj i podatke o elektroničkom identitetu uz provjeru WebmailHR-a</label>}
      <label>Ime<input name="name" value={form.name} onChange={change} autoComplete="given-name" required /></label>
      <label>Prezime<input name="surname" value={form.surname} onChange={change} autoComplete="family-name" required /></label>
      <label>E-mail ili korisničko ime<input name="email" value={form.email} onChange={change} autoComplete="off" placeholder={identityMode?'Prazno za automatsku jedinstvenu oznaku':''} required={!identityMode} /></label>
      <label>Uloga<select aria-label="Uloga" name="role" value={form.role} onChange={change}>
        <option value="STUDENT">Učenik</option><option value="TEACHER">Nastavnik</option><option value="PRINCIPAL">Ravnatelj</option><option value="EXPERT">Stručni suradnik</option><option value="REGISTRAR">Školska referada</option><option value="SCHOOL_ADMIN">Administrator škole</option>
      </select></label>
      {identityMode?<><p>Poslužitelj generira lozinku od 8 znakova. Prikaz i PDF dostupni su nakon potvrđene aktivacije.</p>
      <label>OIB<input name="oib" value={form.oib} onChange={change} pattern="[0-9]{11}" required /></label><label>Datum rođenja<input name="dob" type="date" value={form.dob} onChange={change} required /></label>
      <label>Spol<select name="gender" value={form.gender} onChange={change} required><option value="">Odaberite</option><option value="M">M</option><option value="F">Ž</option></select></label>
      <label>Dodijeljena školska godina<select name="schoolYearId" value={form.schoolYearId} onChange={change} required><option value="">Odaberite</option>{years.map(y=><option key={y.id} value={y.id}>{y.label||y.name}</option>)}</select></label>
      {form.role==='STUDENT'&&<label>Razred<select name="classId" value={form.classId} onChange={change} required><option value="">Odaberite</option>{classes.filter(c=>c.school_year_id===form.schoolYearId).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      </>:<label>Privremena lozinka<input name="password" type="password" minLength={6} value={form.password} onChange={change} autoComplete="new-password" required /></label>}
      {form.role!=='STUDENT'&&<label>Početni PIN za e-Dnevnik i referadu<input name="pin" type="password" inputMode="numeric" pattern="\d{4}" minLength={4} maxLength={4} value={form.pin} onChange={change} autoComplete="off" required /></label>}
    </fieldset>
    <p className="notice">Nastavnik za e-Dnevnik koristi zaseban PIN i autentifikator. Njegova generirana lozinka vrijedi za WebmailHR. Za učenika ista izdana lozinka vrijedi za e-Dnevnik i WebmailHR.</p>
    <button className="primary" type="submit" disabled={saving}>{saving ? 'Spremanje…' : 'Stvori korisnika'}</button>
    {message && <p role="status" className="notice">{message}</p>}
    {issued&&<IdentityReceipt issued={issued} onClear={()=>setIssued(null)}/>}
    {partial&&<ElectronicIdentity {...partial} schoolYearId={form.schoolYearId}/>}
  </form>;
}
