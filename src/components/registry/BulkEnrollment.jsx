import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
export default function BulkEnrollment({ students, classes, onSaved }) {
  const [selected, setSelected] = useState([]),
    [target, setTarget] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_bulk_enroll", {
      _students: selected,
      _class: target,
    });
    setMessage(
      r.error?.message || `Grupni upis završen je za ${r.data.length} učenika.`,
    );
    if (!r.error) {
      setSelected([]);
      onSaved();
    }
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Grupni upis postojećih učenika</h2>
      </div>
      <div className="registry-body">
        <form onSubmit={save}>
          <label>
            Razred odabranog programa
            <select
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Odaberite razred</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.class_name} — {c.school_name} — {c.school_year_label}
                </option>
              ))}
            </select>
          </label>
          <p>
            Odaberite učenike koji još nisu dodijeljeni razredu. Sustav čuva
            postojeće osobe i račune te provjerava duple upise.
          </p>
          {students.map((s) => (
            <label className="checkbox-control" key={s.registry_student_id}>
              <input
                type="checkbox"
                checked={selected.includes(s.registry_student_id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, s.registry_student_id]
                      : selected.filter((id) => id !== s.registry_student_id),
                  )
                }
              />
              {s.full_name} — {s.oib || "OIB nije upisan"}
            </label>
          ))}
          <button className="primary" disabled={busy || !selected.length}>
            Upiši odabrane učenike
          </button>
        </form>
        {message && <p className="notice">{message}</p>}
      </div>
    </section>
  );
}
