import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AttestationAuthorization({ schoolId }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSettings(null);
    setLoadError("");
    setMessage("");
    (async () => {
      try {
        const result = await supabase.rpc("registry_attestation_settings", {
          _school: schoolId,
        });
        if (result.error) throw result.error;
        if (active) setSettings(result.data || {});
      } catch (error) {
        if (active)
          setLoadError(error?.message || "Postavke trenutačno nisu dostupne.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [schoolId, refresh]);
  const approve = async (value) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await supabase.rpc("registry_attestation_settings", {
        _school: schoolId,
        _approve: value,
      });
      if (result.error) throw result.error;
      setSettings(result.data || {});
      setMessage(
        value
          ? "Primjena vizualne ovjere je odobrena."
          : "Primjena vizualne ovjere je opozvana.",
      );
    } catch (error) {
      setMessage(
        error?.message || "Odobrenje nije spremljeno. Pokušajte ponovno.",
      );
    } finally {
      setBusy(false);
    }
  };
  const hasStamp = Boolean(
    settings?.stamp_path || schoolId === "srednja-kola-glina-zagreb",
  );
  return (
    <aside
      className="registry-array"
      aria-label="Ovjera dokumenata Školske referade"
    >
      <h3>Ovjera dokumenata Školske referade</h3>
      {loading && <p role="status">Učitavanje pečata, potpisa i odobrenja…</p>}
      {loadError && (
        <p className="notice" role="alert">
          Ne mogu učitati postavke ovjere: {loadError}
        </p>
      )}
      {settings && (
        <>
          <p>
            Potpisnik: {settings.signer_name || "nije postavljen"} · Potpis:{" "}
            {settings.signature_path ? "spremljen" : "nije priložen"} · Pečat:{" "}
            {hasStamp ? "spremljen" : "nije priložen"} · Status:{" "}
            {settings.attestation_authorized ? "odobreno" : "nije odobreno"}
          </p>
          {!settings.signature_path || !hasStamp ? (
            <p>
              U Školskoj referadi najprije spremite potpis i pečat pod „Postavke
              referade”, zatim ovdje osvježite postavke.
            </p>
          ) : null}
          <p>
            Administrator ove škole može odobriti ili opozvati vizualni pečat i
            potpis za dopuštene školske rubrike dokumenata. Kvalificirana
            elektronička ovjera zahtijeva povezanu vanjsku uslugu.
          </p>
          <div className="row-actions">
            <button
              type="button"
              className="primary"
              disabled={
                busy ||
                !settings.signature_path ||
                !hasStamp ||
                settings.attestation_authorized
              }
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
        </>
      )}
      <button
        type="button"
        className="small-button"
        disabled={busy || loading}
        onClick={() => setRefresh((old) => old + 1)}
      >
        {loadError ? "Ponovi dohvat postavki" : "Osvježi postavke ovjere"}
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </aside>
  );
}
