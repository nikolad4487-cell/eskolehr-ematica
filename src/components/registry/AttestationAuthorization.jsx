import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function AttestationAuthorization({ schoolId }) {
  const [settings, setSettings] = useState(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => {
    const r = await supabase.rpc("registry_attestation_settings", {
      _school: schoolId,
    });
    if (!r.error) setSettings(r.data || {});
  };
  useEffect(() => {
    setSettings(null);
    load();
  }, [schoolId]);
  if (!settings) return null;
  const approve = async (value) => {
    setBusy(true);
    const r = await supabase.rpc("registry_attestation_settings", {
      _school: schoolId,
      _approve: value,
    });
    setMessage(
      r.error?.message ||
        (value
          ? "Primjena vizualne ovjere je odobrena."
          : "Primjena vizualne ovjere je opozvana."),
    );
    if (!r.error) setSettings(r.data);
    setBusy(false);
  };
  return (
    <aside className="registry-array">
      <h3>Ovjera dokumenata Školske referade</h3>
      <p>
        Potpisnik: {settings.signer_name || "nije postavljen"} · Potpis:{" "}
        {settings.signature_path ? "spremljen" : "nije priložen"} · Status:{" "}
        {settings.attestation_authorized ? "odobreno" : "nije odobreno"}
      </p>
      <p>
        Odobrenje vrijedi za vizualni školski pečat i potpis u dopuštenim
        rubrikama obrazaca. Kvalificirana elektronička ovjera zahtijeva povezanu
        vanjsku uslugu.
      </p>
      <div className="row-actions">
        <button
          type="button"
          className="primary"
          disabled={busy || !settings.signature_path}
          onClick={() => approve(true)}
        >
          Odobri primjenu pečata i potpisa
        </button>
        <button
          type="button"
          className="small-button"
          disabled={busy || !settings.attestation_authorized}
          onClick={() => approve(false)}
        >
          Opozovi odobrenje
        </button>
      </div>
      {message && <p className="notice">{message}</p>}
    </aside>
  );
}
