import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function CertificateSeals({ classId }) {
  const [rows, setRows] = useState([]),
    [selected, setSelected] = useState([]),
    [requests, setRequests] = useState([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () => {
    if (!classId) {
      setRows([]);
      return;
    }
    supabase
      .from("student_certificates")
      .select("id,certificate_number,status,payload,registry_student_id")
      .eq("class_id", classId)
      .in("status", ["READY", "ISSUED"])
      .then((r) => setRows(r.data || []));
    supabase
      .from("certificate_seal_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .then((r) => setRequests(r.data || []));
  };
  useEffect(() => {
    setSelected([]);
    load();
  }, [classId]);
  const prepare = async (ids) => {
    setBusy(true);
    const r = await supabase.rpc("registry_prepare_seals", {
      _certificates: ids,
    });
    setMessage(
      r.error?.message ||
        "Svjedodžbe su pripremljene. Za pravno valjanu ovjeru potrebno je povezati kvalificiranu uslugu elektroničkog pečatiranja.",
    );
    setSelected([]);
    load();
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Priprema svjedodžbi za elektroničko pečatiranje</h2>
      </div>
      <div className="registry-body">
        <p>
          Dokumenti se mogu pripremiti i provjeriti pojedinačno ili grupno.
          Kvalificirana usluga pečatiranja i e-Registar još nisu povezani;
          pripremljeni dokumenti nemaju status elektronički ovjerenih isprava.
        </p>
        {!classId ? (
          <p>Odaberite razred za pripremu.</p>
        ) : (
          <>
            <label className="checkbox-control">
              <input
                type="checkbox"
                checked={rows.length > 0 && selected.length === rows.length}
                onChange={(e) =>
                  setSelected(e.target.checked ? rows.map((r) => r.id) : [])
                }
              />
              Odaberi sve svjedodžbe
            </label>
            {rows.map((r) => (
              <div className="row-actions" key={r.id}>
                <label className="checkbox-control">
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
                  {r.certificate_number || "Broj nije unesen"} —{" "}
                  {r.payload?.student?.name ||
                    r.payload?.student?.full_name ||
                    r.registry_student_id}
                </label>
                <button
                  className="small-button"
                  disabled={busy}
                  onClick={() => prepare([r.id])}
                >
                  Pripremi pojedinačno
                </button>
                <span>
                  {{
                    READY_FOR_PROVIDER: "Spremno za povezivanje usluge",
                    SENT: "Poslano usluzi",
                    EXPIRED: "Zahtjev je istekao",
                    FAILED: "Ovjera nije uspjela",
                    SEALED: "Elektronički ovjereno",
                    REGISTERED: "Upisano u registar",
                  }[requests.find((q) => q.certificate_id === r.id)?.status] ||
                    "Nije pripremljeno"}
                </span>
              </div>
            ))}
            <button
              className="primary"
              disabled={busy || !selected.length}
              onClick={() => prepare(selected)}
            >
              Pripremi odabrane svjedodžbe
            </button>
          </>
        )}
        {message && <p className="notice">{message}</p>}
      </div>
    </section>
  );
}
