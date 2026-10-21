import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { readAll, verificationCandidates, verifySchooling } from './schoolingVerification.mjs';

export default function BulkSchoolingVerification({ adminScope = {} }) {
  const [schools, setSchools] = useState([]), [years, setYears] = useState([]), [classes, setClasses] = useState([]);
  const [school, setSchool] = useState(adminScope.schoolId || ''), [year, setYear] = useState(''), [classId, setClassId] = useState('');
  const [preview, setPreview] = useState(null), [evidence, setEvidence] = useState(''), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [done, setDone] = useState(0), [failures, setFailures] = useState([]);
  const generation = useRef(0), running = useRef(false);
  useEffect(() => {
    let active = true;
    readAll(() => {
      let q = supabase.from('schools').select('id,name').order('id');
      return adminScope.isScoped ? q.eq('id', adminScope.schoolId) : q;
    }).then((rows) => { if (active) setSchools(rows); }).catch((e) => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [adminScope.schoolId, adminScope.isScoped]);
  useEffect(() => {
    let active = true;
    setYears([]); setClasses([]); setYear(''); setClassId(''); setPreview(null); setConfirmed(false); setMessage('');
    if (school) Promise.all([
      readAll(() => supabase.from('school_years').select('id,label,name').eq('school_id', school).order('id')),
      readAll(() => supabase.from('classes').select('id,name,school_year_id,school_id').eq('school_id', school).order('id')),
    ]).then(([ys, cs]) => { if (active) { setYears(ys); setClasses(cs); } }).catch((e) => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [school]);
  useEffect(() => { generation.current++; setPreview(null); setConfirmed(false); setFailures([]); setMessage(''); }, [school, year, classId]);
  const scopedClasses = classes.filter((c) => c.school_id === school && c.school_year_id === year && (!classId || c.id === classId));
  const load = async () => {
    const rows = [];
    // Bounded filters also accommodate schools with many classes.
    for (let i = 0; i < scopedClasses.length; i += 50) {
      const ids = scopedClasses.slice(i, i + 50).map((c) => c.id);
      rows.push(...await readAll(() => supabase.from('student_class_enrollments')
        .select('id,class_id,status,attendance_mode,status_verified_at,status_evidence')
        .in('class_id', ids).eq('status', 'ACTIVE').order('id')));
    }
    return { rows, candidates: verificationCandidates(rows, scopedClasses.map((c) => c.id)) };
  };
  const inspect = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setMessage(''); setFailures([]);
    const current = generation.current;
    try { const result = await load(); if (current === generation.current) { setPreview(result); setConfirmed(false); } }
    catch (e) { setMessage(e.message); }
    finally { running.current = false; setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault();
    if (running.current || !preview || !confirmed) return;
    running.current = true; setBusy(true); setDone(0); setMessage(''); setFailures([]);
    try {
      const fresh = await load();
      const approved = new Set(preview.candidates.map((r) => r.id));
      const rows = fresh.candidates.filter((r) => approved.has(r.id));
      const result = await verifySchooling(rows, evidence, (...args) => supabase.rpc(...args), setDone);
      setFailures(result.failed);
      setMessage(`Potvrđeno upisa: ${result.succeeded.length}. Neuspješno: ${result.failed.length}.`);
      const succeeded = new Set(result.succeeded);
      setPreview({ rows: fresh.rows, candidates: fresh.candidates.filter((r) => !succeeded.has(r.id)) });
      setConfirmed(false);
    } catch (e) { setMessage(e.message); }
    finally { running.current = false; setBusy(false); }
  };
  return <section className="panel registry-editor">
    <div className="panel-header"><h2>Grupna potvrda redovitog školovanja za referadu</h2></div>
    <div className="registry-body">
      <p>Potvrdite sve aktivne upise u školskoj godini ili odabranom razredu uz zajedničku osnovu provjere. Već potvrđeni redovni upisi, izvanredni učenici i vanjski polaznici preskaču se.</p>
      <form onSubmit={save}>
        <fieldset disabled={busy} style={{ border: 0, padding: 0, minWidth: 0 }}>
          <div className="detail-form">
            <label>Škola za grupnu potvrdu<select aria-label="Škola za grupnu potvrdu" required value={school} disabled={adminScope.isScoped} onChange={(e) => setSchool(e.target.value)}><option value="">Odaberite školu</option>{schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
            <label>Školska godina za grupnu potvrdu<select aria-label="Školska godina za grupnu potvrdu" required value={year} onChange={(e) => { setYear(e.target.value); setClassId(''); }}><option value="">Odaberite školsku godinu</option>{years.map((y) => <option key={y.id} value={y.id}>{y.label || y.name}</option>)}</select></label>
            <label>Razred za grupnu potvrdu<select aria-label="Razred za grupnu potvrdu" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Svi razredi škole u odabranoj godini</option>{classes.filter((c) => c.school_year_id === year).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          </div>
          <button type="button" onClick={inspect} disabled={!school || !year || !scopedClasses.length}>Prikaži upise za grupnu potvrdu</button>
          {preview && <>
            <p role="status">Aktivnih upisa: {preview.rows.length}. Za potvrdu: {preview.candidates.length}. Preskočeno: {preview.rows.length - preview.candidates.length}.</p>
            <label>Zajednička osnova provjere<input required minLength={3} maxLength={500} value={evidence} onChange={(e) => { setEvidence(e.target.value); setConfirmed(false); }} placeholder="Npr. provjerena upisna dokumentacija za odabranu školsku godinu" /></label>
            <label className="checkbox-control"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />Potvrđujem da svi uključeni upisi imaju provjeren status redovitog školovanja na navedenoj osnovi.</label>
            <button className="primary" disabled={!confirmed || !preview.candidates.length || evidence.trim().length < 3}>Potvrdi redovito školovanje za sve uključene upise ({preview.candidates.length})</button>
          </>}
        </fieldset>
      </form>
      {busy && <p role="status">Obrada je u tijeku. Obrađeno upisa: {done}. Pričekajte završetak i ostanite na ovoj stranici.</p>}
      {message && <p className="notice" role="status">{message}</p>}
      {failures.length > 0 && <><p>Uspješno spremljene potvrde ostaju sačuvane. Provjerite greške i ponovite potvrđivanje preostalih upisa.</p><ul>{failures.map((f) => <li key={f.id}>{classes.find((c) => c.id === f.class_id)?.name} — upis {f.id}: {f.message}</li>)}</ul></>}
    </div>
  </section>;
}
