import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function PrincipalStudentRecords({ studentId, classId, subjects }) {
  const [records, setRecords] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setRecords(null); setError('');
    Promise.all([
      supabase.from('grades').select('id,subject_id,value,date,note').eq('class_id', classId).eq('student_id', studentId).order('date'),
      supabase.from('absences').select('id,date,hour,status,note').eq('class_id', classId).eq('student_id', studentId).order('date'),
    ]).then(([grades, absences]) => {
      if (!active) return;
      if (grades.error || absences.error) setError(grades.error?.message || absences.error?.message);
      else setRecords({ grades: grades.data || [], absences: absences.data || [] });
    }).catch(() => { if (active) setError('Pregled ocjena i izostanaka nije dostupan. Pokušajte ponovno.'); });
    return () => { active = false; };
  }, [studentId, classId]);
  const date = value => value ? new Date(`${value}T12:00:00`).toLocaleDateString('hr-HR') : '—';
  const status = value => ({ JUSTIFIED: 'Opravdan', UNJUSTIFIED: 'Neopravdan', PENDING: 'Čeka odluku' }[value] || value || '—');
  return <section aria-label="Ocjene i izostanci učenika">
    {error && <p role="alert" className="notice">{error}</p>}
    {!records && !error && <p>Učitavanje ocjena i izostanaka…</p>}
    {records && <>
      <h3>Ocjene — pregled</h3>
      {!records.grades.length ? <p>Nema evidentiranih ocjena.</p> : <div className="table-wrap"><table><thead><tr><th>Predmet</th><th>Ocjena</th><th>Datum</th><th>Bilješka</th></tr></thead><tbody>{records.grades.map(g => <tr key={g.id}><td>{subjects.find(s => s.id === g.subject_id)?.name || 'Predmet'}</td><td>{g.value}</td><td>{date(g.date)}</td><td>{g.note || '—'}</td></tr>)}</tbody></table></div>}
      <h3>Izostanci — pregled</h3>
      {!records.absences.length ? <p>Nema evidentiranih izostanaka.</p> : <div className="table-wrap"><table><thead><tr><th>Datum</th><th>Sat</th><th>Status</th><th>Bilješka</th></tr></thead><tbody>{records.absences.map(a => <tr key={a.id}><td>{date(a.date)}</td><td>{a.hour || '—'}</td><td>{status(a.status)}</td><td>{a.note || '—'}</td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
