import ProgramChange from "./ProgramChange";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function StudentEducationEditor({ studentId }) {
  const [rows, setRows] = useState([]),
    [id, setId] = useState(""),
    [mode, setMode] = useState(""),
    [evidence, setEvidence] = useState(""),
    [details, setDetails] = useState({}),
    [primary, setPrimary] = useState(false),
    [exams, setExams] = useState([]),
    [subjects, setSubjects] = useState([]),
    [exam, setExam] = useState({
      subject: "",
      type: "DOPUNSKI_RAD",
      date: "",
      grade: "",
      note: "",
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await supabase.rpc("registry_student_enrollments", {
      _student: studentId,
    });
    if (r.error) {
      setMessage("Proširena obrazovna evidencija još nije aktivirana.");
      return;
    }
    setRows(r.data || []);
    setId((current) =>
      (r.data || []).some((x) => x.id === current)
        ? current
        : r.data?.[0]?.id || "",
    );
  };
  useEffect(() => {
    setRows([]);
    setId("");
    setMessage("");
    load();
  }, [studentId]);
  const selected = rows.find((r) => r.id === id);
  useEffect(() => {
    if (!selected) return;
    setMode(selected.attendance_mode || "");
    setEvidence(selected.status_evidence || "");
    setPrimary(Boolean(selected.is_primary_program));
    setDetails(selected.education_details || {});
    supabase
      .rpc("registry_special_exams", { _enrollment: id })
      .then((r) => setExams(r.data || []));
    supabase
      .from("subjects")
      .select("id,name")
      .eq("school_id", selected.school_id)
      .order("name")
      .then((r) => setSubjects(r.data || []));
  }, [id, rows]);
  const run = async (name, args) => {
    setBusy(true);
    const r = await supabase.rpc(name, args);
    setMessage(r.error?.message || "Podaci su spremljeni.");
    if (!r.error) await load();
    setBusy(false);
  };
  if (!rows.length) return message ? <p className="notice">{message}</p> : null;
  return (
    <section className="registry-editor">
      <h3>Obrazovanje, povijest upisa i provjera statusa</h3>
      <label>
        Upis / obrazovno razdoblje
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {rows.map((r) => (
            <option key={r.id} value={r.id}>
              {r.year_name} — {r.class_name} —{" "}
              {r.program_name || "Program nije upisan"} (
              {r.status || r.ematica_status})
            </option>
          ))}
        </select>
      </label>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {selected && (
        <>
          <ProgramChange enrollment={selected} onSaved={load} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("registry_verify_enrollment", {
                _enrollment: id,
                _mode: mode,
                _evidence: evidence,
              });
            }}
          >
            <div className="detail-form">
              <label>
                Status školovanja
                <select
                  required
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="">Nije provjereno</option>
                  <option value="REGULAR">Redovito školovanje</option>
                  <option value="PART_TIME">Izvanredno školovanje</option>
                  <option value="EXTERNAL">Vanjski polaznik</option>
                </select>
              </label>
              <label>
                Osnova provjere (upisna dokumentacija / broj akta)
                <input
                  required
                  minLength={3}
                  maxLength={500}
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                />
              </label>
            </div>
            <button className="primary" disabled={busy}>
              Potvrdi status za dokumente referade
            </button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run("registry_save_education_details", {
                _enrollment: id,
                _primary: primary,
                _details: details,
              });
            }}
          >
            <div className="detail-form">
              {[
                ["home_teaching", "Nastava u kući"],
                ["accelerated", "Akceleracija"],
                ["continuing", "Nastavak obrazovanja"],
                ["extended_education", "Produženo obrazovanje"],
                ["extended_stay", "Produženi boravak"],
                ["all_day", "Cjelodnevna nastava"],
              ].map(([key, label]) => (
                <label key={key} className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={Boolean(details[key])}
                    onChange={(e) =>
                      setDetails({ ...details, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
              <label className="checkbox-control">
                <input
                  type="checkbox"
                  checked={primary}
                  onChange={(e) => setPrimary(e.target.checked)}
                />
                Matični program u ovoj ustanovi
              </label>
              {[
                ["extracurricular", "Izvannastavne aktivnosti"],
                ["outside_activities", "Izvanškolske aktivnosti"],
                ["previous_education", "Prethodno obrazovanje"],
                ["decision_reference", "Osnova rješenja / odluke"],
                ["note", "Napomena"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <textarea
                    maxLength={2000}
                    value={details[key] || ""}
                    onChange={(e) =>
                      setDetails({ ...details, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <button className="primary" disabled={busy}>
              Spremi obrazovne podatke
            </button>
          </form>
          <h3>Predmetni i drugi ispiti</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await run("registry_record_exam", {
                _enrollment: id,
                _subject: exam.subject,
                _type: exam.type,
                _date: exam.date,
                _grade: Number(exam.grade),
                _note: exam.note,
              });
              const r = await supabase.rpc("registry_special_exams", {
                _enrollment: id,
              });
              setExams(r.data || []);
            }}
          >
            <div className="detail-form">
              <label>
                Vrsta ispita
                <select
                  value={exam.type}
                  onChange={(e) => setExam({ ...exam, type: e.target.value })}
                >
                  {[
                    ["DOPUNSKI_RAD", "Dopunski rad"],
                    ["POPRAVNI", "Popravni ispit"],
                    ["PREDMETNI", "Predmetni ispit"],
                    ["RAZREDNI", "Razredni ispit"],
                    ["RAZLIKOVNI", "Razlikovni ispit"],
                    ["DOPUNSKI", "Dopunski ispit"],
                  ].map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Predmet
                <select
                  required
                  value={exam.subject}
                  onChange={(e) =>
                    setExam({ ...exam, subject: e.target.value })
                  }
                >
                  <option value="">Odaberite predmet</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Datum polaganja
                <input
                  type="date"
                  required
                  value={exam.date}
                  onChange={(e) => setExam({ ...exam, date: e.target.value })}
                />
              </label>
              <label>
                Stvarna ocjena
                <input
                  type="number"
                  min={1}
                  max={5}
                  required
                  value={exam.grade}
                  onChange={(e) => setExam({ ...exam, grade: e.target.value })}
                />
              </label>
              <label>
                Napomena
                <input
                  maxLength={1000}
                  value={exam.note}
                  onChange={(e) => setExam({ ...exam, note: e.target.value })}
                />
              </label>
            </div>
            <button className="primary" disabled={busy}>
              Evidentiraj provedeni ispit
            </button>
          </form>
          <ul>
            {exams.map((x) => (
              <li key={x.id}>
                {x.exam_type} — {x.subject_name} — {x.exam_date} — ocjena{" "}
                {x.grade ?? "nije evidentirana"}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
