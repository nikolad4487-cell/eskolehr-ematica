import React, { useEffect, useState } from 'react';
import { createSchoolUser } from '../lib/createSchoolUser';
import { supabase } from '../lib/supabase';

export default function CreateSchoolUserForm({ schools, adminScope = {}, onCreated }) {
  const empty = { schoolId: adminScope.isScoped ? adminScope.schoolId : '', name: '', surname: '', email: '', password: '', pin: '1234', role: 'TEACHER' };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (adminScope.isScoped) setForm(current => ({ ...current, schoolId: adminScope.schoolId })); }, [adminScope.isScoped, adminScope.schoolId]);
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setMessage(''); setSaving(true);
    try {
      const { role, ...values } = form;
      const schoolId = adminScope.isScoped ? adminScope.schoolId : values.schoolId;
      await createSchoolUser(supabase, { ...values, schoolId, roles: [role] });
      setForm({ ...empty, schoolId });
      setMessage('Korisnik je stvoren i povezan s odabranom školom. Djelatnik se u e-Dnevnik ili referadu prijavljuje odabranim PIN-om i postavlja autentifikator.');
      onCreated?.(schoolId);
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };
  return <form className="stack create-school-user-form" onSubmit={submit}>
    <fieldset disabled={saving} className="user-create-fields">
      <label>Škola<select aria-label="Škola" name="schoolId" value={form.schoolId} onChange={change} disabled={adminScope.isScoped} required>
        <option value="">Odaberite školu</option>{schools.filter(s => !adminScope.isScoped || s.id === adminScope.schoolId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select></label>
      <label>Ime<input name="name" value={form.name} onChange={change} autoComplete="given-name" required /></label>
      <label>Prezime<input name="surname" value={form.surname} onChange={change} autoComplete="family-name" required /></label>
      <label>E-mail ili korisničko ime<input name="email" value={form.email} onChange={change} autoComplete="off" required /></label>
      <label>Uloga<select aria-label="Uloga" name="role" value={form.role} onChange={change}>
        <option value="TEACHER">Nastavnik</option><option value="REGISTRAR">Školska referada</option><option value="SCHOOL_ADMIN">Administrator škole</option>
      </select></label>
      <label>Privremena lozinka<input name="password" type="password" minLength={6} value={form.password} onChange={change} autoComplete="new-password" required /></label>
      <label>Početni PIN za e-Dnevnik i referadu<input name="pin" type="password" inputMode="numeric" pattern="\d{4}" minLength={4} maxLength={4} value={form.pin} onChange={change} autoComplete="off" required /></label>
    </fieldset>
    <p className="notice">Lozinka ima najmanje 6 znakova. PIN ima 4 znamenke i koristi se zasebno pri prijavi djelatnika. Za referadu administrator škole dodatno uključuje pristup u e-Dnevniku.</p>
    <button className="primary" type="submit" disabled={saving}>{saving ? 'Spremanje…' : 'Stvori korisnika'}</button>
    {message && <p role="status" className="notice">{message}</p>}
  </form>;
}
