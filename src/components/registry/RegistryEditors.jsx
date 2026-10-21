import AttestationAuthorization from "./AttestationAuthorization";
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const F = (key, label, type = "text", options) => ({
  key,
  label,
  type,
  options,
});
const SECTIONS = [
  [
    "BASIC",
    "Osnovni podaci",
    [
      F("english_name", "Naziv na engleskom"),
      F("iban", "IBAN"),
      F("phone", "Telefon"),
      F("email", "E-pošta", "email"),
      F("website", "Mrežna stranica"),
      F("note", "Napomena", "textarea"),
    ],
  ],
  [
    "ABOUT",
    "O ustanovi",
    [
      F("shifts", "Broj smjena", "number"),
      F("heating", "Grijanje"),
      F("all_day", "Cjelodnevna nastava", "checkbox"),
      F("extended_stay", "Produženi boravak", "checkbox"),
      F("remote_teaching", "Nastava na daljinu", "checkbox"),
      F("enrollment_area", "Upisno područje", "textarea"),
      F("training_school", "Vježbaonica", "checkbox"),
      F("dsd_center", "DSD centar", "checkbox"),
      F("shared_space", "Dijeli prostor", "checkbox"),
      F("shared_with", "Ustanova s kojom dijeli prostor"),
    ],
  ],
  [
    "FOUNDATION",
    "Temeljna dokumentacija",
    [
      F("founder", "Osnivač"),
      F("founder_type", "Vrsta osnivača"),
      F("founded_on", "Datum osnivanja", "date"),
      F("decision_number", "Broj akta"),
      F("decision_date", "Datum akta", "date"),
      F("place", "Mjesto osnivanja"),
      F("note", "Napomena", "textarea"),
    ],
  ],
  ["INFRASTRUCTURE", "Infrastruktura", []],
  ["PROGRAMS", "Programi", []],
  ["ELECTIVES", "Fakultativni predmeti", []],
  ["STAFF", "Djelatnici", []],
  [
    "OTHER",
    "Ostalo",
    [
      F("security", "Sigurnost", "textarea"),
      F("equipment", "Oprema", "textarea"),
      F("climate", "Klimatizacija", "textarea"),
      F("note", "Napomena", "textarea"),
    ],
  ],
  [
    "CERTIFICATES",
    "Svjedodžbe",
    [
      F("print_name", "Naziv ustanove za ispis svjedodžbi"),
      F("note", "Napomena", "textarea"),
    ],
  ],
];
const STAFF_TYPES = [
  [
    "CONTRACT",
    "Rješenje o zaposlenju i ugovori",
    [
      F("status", "Status ugovora", "select", [
        "Neodređeno puno",
        "Neodređeno nepuno",
        "Određeno puno",
        "Određeno nepuno",
      ]),
      F("weekly_hours", "Tjedni broj sati", "number"),
      F("professional", "Stručno zaposlenje", "checkbox"),
      F("decision_number", "Broj rješenja"),
      F("note", "Napomena", "textarea"),
    ],
  ],
  [
    "JOB",
    "Radno mjesto",
    [
      F("position", "Radno mjesto", "select", [
        "NASTAVNIK",
        "RAVNATELJ",
        "ZAMJENIK_RAVNATELJA",
        "STRUČNI_SURADNIK",
        "REFERENT",
        "OSTALO",
      ]),
      F("contract_id", "Pripadajući ugovor", "contract"),
      F("description", "Opis radnog mjesta"),
      F("note", "Napomena", "textarea"),
    ],
  ],
  [
    "QUALIFICATION",
    "Stručna sprema i zvanja",
    [
      F("institution", "Ustanova"),
      F("level", "Razina obrazovanja"),
      F("title", "Akademski / stručni naziv"),
      F("abbreviation", "Kratica naziva"),
      F("title_position", "Položaj kratice", "select", [
        "Ispred imena",
        "Iza imena",
      ]),
      F("decision_number", "Broj isprave"),
    ],
  ],
  [
    "SUBJECT",
    "Nastavni predmeti",
    [
      F("subject_id", "Predmet", "subject"),
      F("teaching_method", "Način izvođenja nastave"),
      F("class_kind", "Vrsta razreda"),
      F("teaching_kind", "Vrsta nastave"),
    ],
  ],
  [
    "ADVANCEMENT",
    "Napredovanja",
    [
      F("title", "Zvanje", "select", [
        "Mentor",
        "Savjetnik",
        "Izvrstan savjetnik",
        "Ostalo",
      ]),
      F("decision_number", "Broj rješenja"),
    ],
  ],
  [
    "PROFESSIONAL_EXAM",
    "Stručni ispiti",
    [
      F("decision_number", "Broj rješenja"),
      F("institution", "Ustanova"),
      F("result", "Rezultat"),
    ],
  ],
  [
    "PEDAGOGICAL_EXAM",
    "Pedagoška grupa predmeta",
    [
      F("decision_number", "Broj rješenja"),
      F("institution", "Ustanova"),
      F("result", "Rezultat"),
    ],
  ],
  [
    "COUNTY_COUNCIL",
    "Voditelj županijskog stručnog vijeća",
    [
      F("county", "Županija"),
      F("subject", "Predmet / područje"),
      F("advisor", "Savjetnik"),
      F("teacher_count", "Broj nastavnika", "number"),
    ],
  ],
];
function Fields({
  fields,
  value,
  onChange,
  disabled = false,
  contracts = [],
  subjects = [],
}) {
  return fields.map((f) => (
    <label key={f.key}>
      {f.label}
      {f.type === "textarea" ? (
        <textarea
          disabled={disabled}
          value={value[f.key] || ""}
          onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
        />
      ) : ["select", "contract", "subject"].includes(f.type) ? (
        <select
          disabled={disabled}
          value={value[f.key] || ""}
          onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
        >
          <option value="">Odaberite</option>
          {(f.type === "contract"
            ? contracts.map((r) => [r.id, `${r.data.status} — ${r.starts_on}`])
            : f.type === "subject"
              ? subjects.map((s) => [s.id, s.name])
              : f.options.map((x) => [x, x])
          ).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          disabled={disabled}
          type={f.type}
          min={f.type === "number" ? 0 : undefined}
          step={f.type === "number" ? "0.01" : undefined}
          checked={Boolean(value[f.key])}
          value={f.type === "checkbox" ? undefined : (value[f.key] ?? "")}
          onChange={(e) =>
            onChange({
              ...value,
              [f.key]:
                f.type === "checkbox" ? e.target.checked : e.target.value,
            })
          }
        />
      )}
    </label>
  ));
}
function Table({ rows, columns }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>{v ?? "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="notice">Nema unesenih zapisa.</p>}
    </div>
  );
}
export function SchoolRegistryEditor({
  school,
  onClose,
  initialSection = "BASIC",
}) {
  const startSection = SECTIONS.some(([id]) => id === initialSection)
    ? initialSection
    : "BASIC";
  const [tab, setTab] = useState(startSection),
    [data, setData] = useState({}),
    [sections, setSections] = useState([]),
    [programs, setPrograms] = useState([]),
    [staff, setStaff] = useState([]),
    [global, setGlobal] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    setReady(false);
    setMessage("");
    Promise.all([
      supabase
        .from("school_registry_sections")
        .select("*")
        .eq("school_id", school.id),
      supabase
        .from("programs")
        .select("id,name,code,duration_years,is_active")
        .eq("school_id", school.id)
        .order("name"),
      supabase
        .from("user_school_roles")
        .select("id,role,status,user:user_profiles(id,name)")
        .eq("school_id", school.id),
      supabase.rpc("registry_global_admin"),
    ]).then(([s, p, u, g]) => {
      if (!alive) return;
      setMessage(
        s.error?.message ||
          p.error?.message ||
          u.error?.message ||
          g.error?.message ||
          "",
      );
      setSections(s.data || []);
      setPrograms(p.data || []);
      setStaff(u.data || []);
      setGlobal(Boolean(g.data));
      setReady(!s.error && !g.error);
      setData({
        ...(startSection === "BASIC"
          ? {
              phone: school.phone || "",
              email: school.email || "",
              website: school.website || "",
            }
          : {}),
        ...((s.data || []).find((x) => x.section === startSection)?.data || {}),
      });
      setTab(startSection);
    });
    return () => {
      alive = false;
    };
  }, [school.id, startSection]);
  const choose = (t) => {
    setTab(t);
    setData({
      ...(t === "BASIC"
        ? {
            phone: school.phone || "",
            email: school.email || "",
            website: school.website || "",
          }
        : {}),
      ...(sections.find((x) => x.section === t)?.data || {}),
    });
    setMessage("");
  };
  const cfg = SECTIONS.find((x) => x[0] === tab);
  const readonly = tab === "FOUNDATION" && !global;
  const arrayKey =
    tab === "BASIC" ? "addresses" : tab === "ELECTIVES" ? "subjects" : "items";
  const arrayFields =
    tab === "BASIC"
      ? [
          F("kind", "Vrsta", "select", ["SJEDIŠTE", "PODRUČNA", "OSTALO"]),
          F("address", "Ulica i broj"),
          F("city", "Mjesto"),
          F("postal_code", "Poštanski broj"),
          F("starts_on", "Od", "date"),
          F("ends_on", "Do", "date"),
        ]
      : tab === "ELECTIVES"
        ? [
            F("name", "Naziv predmeta"),
            F("starts_year", "Početna školska godina"),
            F("weekly_hours", "Sati tjedno", "select", ["1", "2"]),
          ]
        : [
            F("type", "Vrsta prostora"),
            F("count", "Broj prostora", "number"),
            F("area", "Površina m²", "number"),
            F("computers", "Računala", "number"),
            F("seats", "Sjedišta", "number"),
            F("external", "Izvan ustanove", "checkbox"),
          ];
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_save_section", {
      _school: school.id,
      _section: tab,
      _data: data,
    });
    setMessage(r.error?.message || "Podaci ustanove su spremljeni.");
    if (!r.error)
      setSections((old) => [
        ...old.filter((x) => x.section !== tab),
        { section: tab, data },
      ]);
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>{school.name} — podaci ustanove</h2>
        <button className="small-button" onClick={onClose}>
          Zatvori
        </button>
      </div>
      <div className="registry-body">
        <nav className="registry-tabs" aria-label="Kartice ustanove">
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              className={`small-button ${tab === id ? "primary" : ""}`}
              onClick={() => choose(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <p>
          Šifra: {school.code || "—"} · OIB: {school.oib || "—"} ·{" "}
          {school.city || "—"}
        </p>
        {tab === "CERTIFICATES" && (
          <AttestationAuthorization schoolId={school.id} />
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {!ready ? (
          <p>Provjera dostupnosti matične evidencije…</p>
        ) : tab === "PROGRAMS" ? (
          <Table
            columns={["Šifra", "Naziv", "Trajanje", "Aktivan"]}
            rows={programs.map((p) => [
              p.code,
              p.name,
              p.duration_years,
              p.is_active ? "Da" : "Ne",
            ])}
          />
        ) : tab === "STAFF" ? (
          <Table
            columns={["Djelatnik", "Uloga", "Status"]}
            rows={staff.map((s) => [s.user?.name, s.role, s.status])}
          />
        ) : (
          <form onSubmit={save}>
            {tab === "FOUNDATION" &&
              /(vrti|predškol|predskol|kindergarten)/i.test(
                `${school.type || ""} ${school.subtype || ""}`,
              ) && (
                <div className="registry-array">
                  <h3>Imenovanje administratora predškolske ustanove</h3>
                  <a
                    href="/administration-templates/imenovanje-vrtic-rucni-potpis.docx"
                    download
                  >
                    Obrazac za vlastoručni potpis
                  </a>
                  <br />
                  <a
                    href="/administration-templates/imenovanje-vrtic-digitalni-potpis.docx"
                    download
                  >
                    Obrazac za digitalni potpis
                  </a>
                </div>
              )}
            <div className="detail-form">
              <Fields
                fields={cfg[2]}
                value={data}
                onChange={setData}
                disabled={readonly}
              />
            </div>
            {["BASIC", "ELECTIVES", "INFRASTRUCTURE"].includes(tab) && (
              <>
                <h3>
                  {tab === "BASIC" ? "Adrese ustanove s poviješću" : cfg[1]}
                </h3>
                {(data[arrayKey] || []).map((row, i) => (
                  <fieldset key={i} className="registry-array">
                    <div className="detail-form">
                      <Fields
                        fields={arrayFields}
                        value={row}
                        onChange={(v) =>
                          setData({
                            ...data,
                            [arrayKey]: data[arrayKey].map((r, j) =>
                              j === i ? v : r,
                            ),
                          })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="small-button danger"
                      onClick={() =>
                        setData({
                          ...data,
                          [arrayKey]: data[arrayKey].filter((_, j) => j !== i),
                        })
                      }
                    >
                      Ukloni redak
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="small-button"
                  onClick={() =>
                    setData({
                      ...data,
                      [arrayKey]: [...(data[arrayKey] || []), {}],
                    })
                  }
                >
                  Dodaj zapis
                </button>
              </>
            )}
            {readonly ? (
              <p>Temeljnu dokumentaciju mijenja glavni administrator.</p>
            ) : (
              <button className="primary" disabled={busy} type="submit">
                {busy ? "Spremanje…" : "Spremi podatke ustanove"}
              </button>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

export function StaffRegistryEditor({ profile, onClose }) {
  const [records, setRecords] = useState([]),
    [subjects, setSubjects] = useState([]),
    [type, setType] = useState("CONTRACT"),
    [form, setForm] = useState({
      starts_on: "",
      ends_on: "",
      data: {},
      id: null,
    }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await supabase
      .from("staff_registry_records")
      .select("*")
      .eq("school_id", profile.school_id)
      .eq("staff_profile_id", profile.id)
      .order("starts_on", { ascending: false });
    setRecords(r.data || []);
    setMessage(r.error?.message || "");
  };
  useEffect(() => {
    setForm({ starts_on: "", ends_on: "", data: {}, id: null });
    setType("CONTRACT");
    load();
    supabase
      .from("subjects")
      .select("id,name")
      .eq("school_id", profile.school_id)
      .then((r) => setSubjects(r.data || []));
  }, [profile.id, profile.school_id]);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_save_staff", {
      _school: profile.school_id,
      _staff: profile.id,
      _type: type,
      _start: form.starts_on,
      _end: form.ends_on || null,
      _data: form.data,
      _id: form.id,
    });
    if (r.error) setMessage(r.error.message);
    else {
      await load();
      setMessage("Zapis djelatnika je spremljen.");
      setForm({ starts_on: "", ends_on: "", data: {}, id: null });
    }
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>{profile.name} — evidencija djelatnika</h2>
        <button className="small-button" onClick={onClose}>
          Zatvori
        </button>
      </div>
      <div className="registry-body">
        <nav className="registry-tabs">
          {STAFF_TYPES.map(([id, label]) => (
            <button
              className={`small-button ${type === id ? "primary" : ""}`}
              key={id}
              onClick={() => {
                setType(id);
                setForm({ starts_on: "", ends_on: "", data: {}, id: null });
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <form onSubmit={save}>
          <div className="detail-form">
            <label>
              Vrijedi od / datum stjecanja
              <input
                type="date"
                required
                value={form.starts_on}
                onChange={(e) =>
                  setForm({ ...form, starts_on: e.target.value })
                }
              />
            </label>
            <label>
              Vrijedi do
              <input
                type="date"
                min={form.starts_on}
                value={form.ends_on}
                onChange={(e) => setForm({ ...form, ends_on: e.target.value })}
              />
            </label>
            <Fields
              fields={STAFF_TYPES.find((x) => x[0] === type)[2]}
              value={form.data}
              onChange={(data) => setForm({ ...form, data })}
              contracts={records.filter((r) => r.record_type === "CONTRACT")}
              subjects={subjects}
            />
          </div>
          <button className="primary" disabled={busy}>
            Spremi {form.id ? "izmjene" : "novi zapis"}
          </button>
          {form.id && (
            <button
              type="button"
              className="small-button"
              onClick={() =>
                setForm({ starts_on: "", ends_on: "", data: {}, id: null })
              }
            >
              Odustani
            </button>
          )}
        </form>
        <Table
          columns={["Od", "Do", "Podaci", "Akcija"]}
          rows={records
            .filter((r) => r.record_type === type)
            .map((r) => [
              r.starts_on,
              r.ends_on || "Aktivno",
              Object.entries(r.data)
                .filter(([k]) => k !== "contract_id")
                .map(
                  ([k, v]) =>
                    `${STAFF_TYPES.find((x) => x[0] === type)[2].find((f) => f.key === k)?.label || k}: ${typeof v === "boolean" ? (v ? "Da" : "Ne") : subjects.find((s) => s.id === v)?.name || v}`,
                )
                .join(" · "),
              <button
                className="small-button"
                onClick={() =>
                  setForm({
                    id: r.id,
                    starts_on: r.starts_on,
                    ends_on: r.ends_on || "",
                    data: r.data,
                  })
                }
              >
                Uredi / zatvori razdoblje
              </button>,
            ])}
        />
      </div>
    </section>
  );
}
