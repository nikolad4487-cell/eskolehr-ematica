import React, {useState,useEffect} from 'react';
import {supabase} from '../../lib/supabase';
export default function StudentMailCredentials({student}){
 const [pdf,setPdf]=useState(null);
 useEffect(()=>setPdf(null),[student.registry_student_id]);
 useEffect(()=>()=>{if(pdf)URL.revokeObjectURL(pdf);},[pdf]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function issue(){
  if(!window.confirm(`Izdati novu lozinku učeniku ${student.full_name}? Nova lozinka zamjenjuje postojeću za e-Dnevnik i WebmailHR. PIN nastavnika se ne mijenja.`))return;
  setBusy(true);setError('');
  try{
   const {data,error:sessionError}=await supabase.auth.getSession();if(sessionError||!data.session)throw new Error('Prijavite se ponovno.');
   const response=await fetch('https://webmailhr.com/api/integrations/schools/student-password.pdf',{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({profileId:student.ednevnik_student_id,schoolId:student.school_id})});
   if(!response.ok){const body=await response.json();throw new Error(body.error||'Izdavanje nije potvrđeno.');}
   const url=URL.createObjectURL(await response.blob());setPdf(url);const link=document.createElement('a');link.href=url;link.download='skolehr-nova-ucenicka-lozinka.pdf';link.click();
  }catch(failure){setError(failure.message||'Izdavanje nije potvrđeno.');}finally{setBusy(false);}
 }
 return <section className="panel"><h3>Pristup e-Dnevniku i WebmailHR-u</h3><p>Postojeća lozinka se ne prikazuje. Pri izdavanju nove lozinke preuzima se PDF s podacima za prijavu.</p><button type="button" className="secondary" disabled={busy||!student.ednevnik_student_id||!student.school_id} onClick={issue}>{busy?'Izdavanje…':'Izdaj novu učeničku lozinku i preuzmi PDF'}</button>{pdf&&<a className="secondary" href={pdf} download="skolehr-nova-ucenicka-lozinka.pdf" target="_blank" rel="noopener noreferrer">Ponovno otvori PDF upravo izdane lozinke</a>}{!student.ednevnik_student_id&&<p>Najprije povežite učenika s e-Dnevnikom.</p>}{error&&<p role="alert" className="notice">{error}</p>}</section>;
}
