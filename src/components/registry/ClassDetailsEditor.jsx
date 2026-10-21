import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function ClassDetailsEditor({ classes }) {
  const [id, setId] = useState(""),
    [variant, setVariant] = useState("REGULAR"),
    [levels, setLevels] = useState([]),
    [group, setGroup] = useState(""),
    [continuation, setContinuation] = useState(false),
    [language, setLanguage] = useState(""),
    [model, setModel] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    supabase
      .from("classes")
      .select("*")
      .eq("id", id)
      .single()
      .then((r) => {
        if (!alive || !r.data) return;
        setVariant(r.data.variant || "REGULAR");
        setLevels(r.data.combined_grade_levels || []);
        setGroup(r.data.education_group_label || "");
        setContinuation(Boolean(r.data.is_continuation));
        setLanguage(r.data.teaching_language || "");
        setModel(r.data.teaching_model || "");
      });
    return () => {
      alive = false;
    };
  }, [id]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_save_class_details", {
      _class: id,
      _variant: variant,
      _levels: levels,
      _group: group,
      _continuation: continuation,
      _language: language,
      _model: model,
    });
    setMessage(r.error?.message || "Podaci razrednog odjela su spremljeni.");
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Vrsta razrednog odjela i obrazovne skupine</h2>
      </div>
      <div className="registry-body">
        <form onSubmit={save}>
          <div className="detail-form">
            <label>
              Razred / skupina
              <select
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
              >
                <option value="">Odaberite razred</option>
                {classes.map((c) => (
                  <option key={c.class_id} value={c.class_id}>
                    {c.class_name} — {c.school_name} — {c.school_year_label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Vrsta odjela
              <select
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
              >
                <option value="REGULAR">Čisti razredni odjel</option>
                <option value="COMBINED">Kombinirani razredni odjel</option>
                <option value="OOS">Odgojno-obrazovna skupina</option>
              </select>
            </label>
            {variant === "COMBINED" && (
              <fieldset>
                <legend>Razredi u kombiniranom odjelu</legend>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <label className="checkbox-control" key={n}>
                    <input
                      type="checkbox"
                      checked={levels.includes(n)}
                      onChange={(e) =>
                        setLevels(
                          e.target.checked
                            ? [...levels, n]
                            : levels.filter((x) => x !== n),
                        )
                      }
                    />
                    {n}. razred
                  </label>
                ))}
              </fieldset>
            )}
            {variant === "OOS" && (
              <label>
                Oznaka odgojno-obrazovne skupine
                <input
                  required
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                />
              </label>
            )}
            <label className="checkbox-control">
              <input
                type="checkbox"
                checked={continuation}
                onChange={(e) => setContinuation(e.target.checked)}
              />
              Skupina za nastavak obrazovanja
            </label>
            <label>
              Jezik nastave
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </label>
            <label>
              Model školovanja
              <input value={model} onChange={(e) => setModel(e.target.value)} />
            </label>
          </div>
          <button className="primary" disabled={busy || !id}>
            Spremi podatke odjela
          </button>
          {message && <p className="notice">{message}</p>}
        </form>
      </div>
    </section>
  );
}
