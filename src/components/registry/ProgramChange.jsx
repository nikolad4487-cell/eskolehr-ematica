import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function ProgramChange({ enrollment, onSaved }) {
  const [schools, setSchools] = useState([]),
    [schoolId, setSchoolId] = useState(enrollment.school_id),
    [classes, setClasses] = useState([]),
    [programs, setPrograms] = useState([]),
    [form, setForm] = useState({
      classId: "",
      program: "",
      date: "",
      reason: "",
      parallel: false,
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setSchoolId(enrollment.school_id);
    setForm({
      classId: "",
      program: "",
      date: "",
      reason: "",
      parallel: false,
    });
  }, [enrollment.id]);
  useEffect(() => {
    let alive = true;
    setClasses([]);
    setPrograms([]);
    setForm((old) => ({ ...old, classId: "", program: "" }));
    supabase
      .rpc("registry_program_targets", { _school: schoolId })
      .then((r) => {
        if (!alive) return;
        if (r.error) {
          setMessage(r.error.message);
          return;
        }
        setSchools(r.data.schools || []);
        setClasses(r.data.classes || []);
        setPrograms(r.data.programs || []);
      });
    return () => {
      alive = false;
    };
  }, [schoolId, enrollment.id]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_change_program", {
      _enrollment: enrollment.id,
      _class: form.classId,
      _program: form.program,
      _date: form.date,
      _reason: form.reason,
      _parallel: form.parallel,
    });
    setMessage(
      r.error?.message ||
        "Novi upis je spremljen; prethodno razdoblje ostalo je u povijesti.",
    );
    if (!r.error) onSaved();
    setBusy(false);
  };
  return (
    <section>
      <h3>Promjena programa / dodatni umjetnički program</h3>
      <p>
        Promjena zatvara prethodno razdoblje dan prije novog upisa. Paralelni
        umjetnički program zadržava postojeći upis.
      </p>
      <form onSubmit={save}>
        <div className="detail-form">
          <label>
            Ciljna ustanova
            <select
              required
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ciljni razred
            <select
              required
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
            >
              <option value="">Odaberite</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.school_year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Novi program
            <select
              required
              value={form.program}
              onChange={(e) => setForm({ ...form, program: e.target.value })}
            >
              <option value="">Odaberite</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Datum početka novog razdoblja
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
          <label>
            Osnova / razlog promjene
            <input
              required
              minLength={3}
              maxLength={1000}
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </label>
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={form.parallel}
              onChange={(e) => setForm({ ...form, parallel: e.target.checked })}
            />
            Paralelni umjetnički program
          </label>
        </div>
        <button className="primary" disabled={busy}>
          Spremi novi upis i povijest
        </button>
        {message && <p className="notice">{message}</p>}
      </form>
    </section>
  );
}
