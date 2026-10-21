import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const profileFields = { education_program: 'Obrazovni program (pedagoški karton)', visit_reason: 'Razlog posjeta', disabilities: 'Teškoće učenika', accommodations: 'Prilagodbe', support_types: 'Vrste podrške', practical_training: 'Praktična nastava — pedagoška bilješka', documentation: 'Dokumentacija' };
export default function ExpertWorkspace() {
  const [context, setContext] = useState({ schools: [], classes: [], students: [], subjects: [] });
  const [school, setSchool] = useState(''), [year, setYear] = useState(''), [classId, setClassId] = useState(''), [student, setStudent] = useState('');
  const [profile, setProfile] = useState(null), [notes, setNotes] = useState(null), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    const r = await supabase.rpc('expert_workspace');
    if (r.error) { setMessage(r.error.message); return; }
    setContext(r.data); setLoaded(true); setSchool(current => r.data.schools.some(s => s.id === current) ? current : r.data.schools[0]?.id || '');
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setYear(''); setClassId(''); setStudent(''); setProfile(null); setNotes(null); }, [school]);
  useEffect(() => {
    let active = true;
    setStudent(''); setProfile(null); setNotes(null);
    setContext(c => ({ ...c, students: [], subjects: [] }));
    if (classId) supabase.rpc('expert_workspace', { _class: classId }).then(r => {
      if (!active) return;
      if (r.error) setMessage(r.error.message); else { setContext(r.data); setStudent(r.data.students[0]?.id || ''); }
    });
    return () => { active = false; };
  }, [classId]);
  const currentClass = context.classes.find(c => c.id === classId);
  const currentStudent = context.students.find(s => s.id === student);
  useEffect(() => {
    let active = true;
    setProfile(null); setNotes(null); setMessage('');
    if (student && classId) Promise.all([
      supabase.rpc('expert_pedagogy', { _student: student, _class: classId }),
      supabase.rpc('expert_pedagogy', { _student: student, _class: classId, _year: currentClass?.school_year_id, _section: 'YEAR' }),
    ]).then(([p, n]) => {
      if (!active) return;
      if (p.error || n.error) setMessage(p.error?.message || n.error?.message); else { setProfile(p.data); setNotes(n.data); }
    });
    return () => { active = false; };
  }, [student, classId, currentClass?.school_year_id]);
  const save = async (event, section) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const data = section === 'PROFILE' ? Object.fromEntries(Object.keys(profileFields).map(k => [k, profile[k] || ''])) : { recommendations: notes.recommendations || '', counselor_notes: notes.counselor_notes || '' };
      const r = await supabase.rpc('expert_pedagogy', { _student: student, _class: classId, _year: currentClass?.school_year_id, _section: section, _data: data });
      if (r.error) throw new Error(r.error.message);
      if (section === 'PROFILE') setProfile(r.data); else setNotes(r.data);
      setMessage('Pedagoška dokumentacija je spremljena.');
    } catch (e) { setMessage(e.message); } finally { setBusy(false); }
  };
  const years = [...new Map(context.classes.filter(c => c.school_id === school).map(c => [c.school_year_id, c.year])).entries()];
  return <section className="panel registry-editor">
    <div className="panel-header"><h2>Stručni suradnik — razredi, učenici i pedagoška dokumentacija</h2></div>
    <div className="registry-body">
      <p>Pregled svih razreda i predmeta vaše škole. Ovdje se uređuju pedagoški podaci; upisi, ocjene i nastavni predmeti dostupni su za pregled.</p>
      {message && <p className="notice" role="status">{message}</p>}
      {!loaded && <button onClick={load}>Ponovi učitavanje stručne službe</button>}
      <fieldset disabled={busy} className="user-create-fields">
        <label>Škola<select aria-label="Škola stručnog suradnika" value={school} onChange={e => setSchool(e.target.value)}>{context.schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Školska godina<select aria-label="Školska godina stručnog suradnika" value={year} onChange={e => { setYear(e.target.value); setClassId(''); }}><option value="">Sve godine</option>{years.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Razred<select aria-label="Razred stručnog suradnika" value={classId} onChange={e => setClassId(e.target.value)}><option value="">Odaberite razred</option>{context.classes.filter(c => c.school_id === school && (!year || c.school_year_id === year)).map(c => <option key={c.id} value={c.id}>{c.name} — {c.year}</option>)}</select></label>
        <label>Učenik<select aria-label="Učenik stručnog suradnika" value={student} onChange={e => setStudent(e.target.value)}><option value="">Odaberite učenika</option>{[...new Map(context.students.map(s => [s.id, s])).values()].map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      </fieldset>
      {currentStudent && <div className="detail-grid"><div><span>Učenik</span><strong>{currentStudent.name}</strong></div><div><span>OIB</span><strong>{currentStudent.oib || 'Nije upisan'}</strong></div><div><span>Datum rođenja</span><strong>{currentStudent.dob ? new Date(currentStudent.dob + 'T12:00:00').toLocaleDateString('hr-HR') : 'Nije upisan'}</strong></div><div><span>Adresa</span><strong>{currentStudent.address || 'Nije upisana'}</strong></div></div>}
      {classId && <><h3>Predmeti razreda — pregled</h3><ul>{context.subjects.map(s => <li key={s.id}>{s.name}</li>)}</ul></>}
      {profile && <form onSubmit={e => save(e, 'PROFILE')}><fieldset disabled={busy} className="detail-form"><legend>Trajni pedagoški karton</legend>{Object.entries(profileFields).map(([key, label]) => <label key={key}>{label}<textarea value={profile[key] || ''} maxLength={10000} onChange={e => setProfile({ ...profile, [key]: e.target.value })} /></label>)}<button className="primary">Spremi pedagoški karton</button></fieldset></form>}
      {notes && <form onSubmit={e => save(e, 'YEAR')}><fieldset disabled={busy} className="detail-form"><legend>Godišnja pedagoška dokumentacija</legend><label>Preporuke<textarea value={notes.recommendations || ''} maxLength={10000} onChange={e => setNotes({ ...notes, recommendations: e.target.value })} /></label><label>Bilješke stručnog suradnika<textarea value={notes.counselor_notes || ''} maxLength={10000} onChange={e => setNotes({ ...notes, counselor_notes: e.target.value })} /></label><button className="primary">Spremi godišnju dokumentaciju</button></fieldset></form>}
    </div>
  </section>;
}
