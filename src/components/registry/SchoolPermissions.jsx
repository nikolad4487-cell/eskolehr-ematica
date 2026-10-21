import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
export function SchoolPermissions({ profile, onSaved, onClose }) {
  const [delegate, setDelegate] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const change = async (active) => {
    setBusy(true);
    const r = await supabase.rpc("registry_manage_permissions", {
      _school: profile.school_id,
      _user: profile.id,
      _active: active,
      _delegate: active && delegate,
    });
    setMessage(
      r.error?.message ||
        (active
          ? "Prava ustanove su dodijeljena."
          : "Prava ustanove su opozvana."),
    );
    if (!r.error) onSaved();
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Prava u e-Matici — {profile.name}</h2>
        <button className="small-button" onClick={onClose}>
          Zatvori
        </button>
      </div>
      <div className="registry-body">
        <p>
          Dodjela vrijedi samo za odabranu ustanovu. Imenovani administrator
          može dodijeliti uređivanje evidencije; pravo daljnje dodjele postavlja
          glavni administrator.
        </p>
        <label className="checkbox-control">
          <input
            type="checkbox"
            checked={delegate}
            onChange={(e) => setDelegate(e.target.checked)}
          />
          Imenovani administrator s pravom daljnje dodjele (samo glavni
          administrator)
        </label>
        <div className="row-actions">
          <button
            className="primary"
            disabled={busy}
            onClick={() => change(true)}
          >
            Dodijeli prava ustanove
          </button>
          <button
            className="small-button"
            disabled={busy}
            onClick={() => change(false)}
          >
            Opozovi prava ustanove
          </button>
        </div>
        {message && <p className="notice">{message}</p>}
      </div>
    </section>
  );
}
export function LinkExistingStaff({ schoolId, onSaved }) {
  const [oib, setOib] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await supabase.rpc("registry_link_existing_staff", {
      _school: schoolId,
      _oib: oib,
    });
    setMessage(
      r.error?.message ||
        `Djelatnik ${r.data.name} povezan je s ustanovom; postojeći račun je sačuvan.`,
    );
    if (!r.error) {
      setOib("");
      onSaved();
    }
    setBusy(false);
  };
  return (
    <section className="panel registry-editor">
      <div className="panel-header">
        <h2>Poveži postojećeg djelatnika</h2>
      </div>
      <div className="registry-body">
        <p>
          Pretraga koristi lokalnu evidenciju SkoleHR. Jedan postojeći djelatnik
          može raditi u više ustanova.
        </p>
        <form onSubmit={save} className="inline-form">
          <label>
            OIB djelatnika
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{11}"
              maxLength={11}
              value={oib}
              onChange={(e) => setOib(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <button className="primary" disabled={busy || !schoolId}>
            Poveži s odabranom ustanovom
          </button>
        </form>
        {!schoolId && <p>Najprije odaberite ustanovu u popisu djelatnika.</p>}
        {message && <p className="notice">{message}</p>}
      </div>
    </section>
  );
}
