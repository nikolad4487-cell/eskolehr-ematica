import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function DocumentArchive() {
  const [rows, setRows] = useState([]),
    [search, setSearch] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    supabase
      .from("school_document_records")
      .select(
        "id,school_id,document_type,status,issued_on,document_number,school_year_id,attestation_status",
      )
      .order("created_at", { ascending: false })
      .limit(1000)
      .then((r) => {
        setRows(r.data || []);
        setMessage(r.error?.message || "");
      });
  }, []);
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Evidencija dokumenata ustanove</h2>
      </div>
      <div className="registry-body">
        <p>
          Potvrde o školovanju, prijevozni obrasci i prijepisi izdaju se kroz
          Školsku referadu koristeći provjerene matične podatke.
        </p>
        <a
          className="primary"
          href="https://referada.skolehr.xyz/"
          target="_blank"
          rel="noreferrer"
        >
          Otvori Školsku referadu
        </a>
        <input
          aria-label="Pretraži dokumente"
          placeholder="Vrsta, broj, status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {message && <p className="notice">{message}</p>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {["Vrsta", "Broj", "Datum", "Status", "Ovjera"].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) =>
                  JSON.stringify(r)
                    .toLocaleLowerCase("hr")
                    .includes(search.toLocaleLowerCase("hr")),
                )
                .map((r) => (
                  <tr key={r.id}>
                    <td>{r.document_type}</td>
                    <td>{r.document_number || "—"}</td>
                    <td>{r.issued_on || "—"}</td>
                    <td>{r.status}</td>
                    <td>
                      {r.attestation_status === "VISUAL"
                        ? "Vizualna ovjera"
                        : "Bez elektroničke ovjere"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
