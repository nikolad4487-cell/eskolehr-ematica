import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function ControlledYearTransition({ classes, onSaved }) {
  const [source, setSource] = useState(""),
    [target, setTarget] = useState(""),
    [rows, setRows] = useState([]),
    [selected, setSelected] = useState([]),
    [date, setDate] = useState(""),
    [reason, setReason] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const current = classes.find((c) => c.class_id === source);
  useEffect(() => {
    setRows([]);
    setSelected([]);
    setTarget("");
    if (source)
      supabase
        .rpc("registry_class_enrollments", { _class: source })
        .then((r) => {
          setRows(r.data || []);
          setMessage(r.error?.message || "");
        });
  }, [source]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_promote_enrollments", {
      _enrollments: selected,
      _target: target,
      _date: date,
      _reason: reason,
    });
    setMessage(
      r.error?.message ||
        `Prijelaz je spremljen za ${r.data.length} upisa. Prethodna razdoblja sačuvana su u povijesti.`,
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
        <h2>Provjereni pojedinačni i grupni prijelaz u viši razred</h2>
      </div>
      <div className="registry-body">
        <p>
          Prije prijelaza sustav provjerava upisane predmete i pozitivne
          zaključne ocjene. Nedostajući podaci zaustavljaju cijelu odabranu
          skupinu.
        </p>
        <form onSubmit={save}>
          <div className="detail-form">
            <label>
              Prethodni razred
              <select
                value={source}
                required
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Odaberite</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name} — {c.school_name} — {c.school_year_label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Novi razred
              <select
                value={target}
                required
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Odaberite</option>
                {classes
                  .filter(
                    (c) =>
                      current &&
                      c.school_id === current.school_id &&
                      c.school_year_id !== current.school_year_id,
                  )
                  .map((c) => (
                    <option key={c.class_id} value={c.class_id}>
                      {c.class_name} — {c.school_year_label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Datum početka novog upisa
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Osnova prijelaza
              <input
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
          <label className="checkbox-control">
            <input
              type="checkbox"
              checked={rows.length > 0 && selected.length === rows.length}
              onChange={(e) =>
                setSelected(e.target.checked ? rows.map((r) => r.id) : [])
              }
            />
            Odaberi sve upise razreda
          </label>
          {rows.map((r) => (
            <label className="checkbox-control" key={r.id}>
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, r.id]
                      : selected.filter((id) => id !== r.id),
                  )
                }
              />
              {r.name} — {r.program_name || "Program nije upisan"}
            </label>
          ))}
          <button className="primary" disabled={busy || !selected.length}>
            Provjeri i provedi prijelaz
          </button>
        </form>
        {message && <p className="notice">{message}</p>}
      </div>
    </section>
  );
}
