import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
export default function ActiveSchoolSwitcher({ currentSchoolId }) {
  const [schools, setSchools] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    supabase.rpc("registry_available_schools").then((r) => {
      if (!r.error) setSchools(r.data || []);
    });
  }, []);
  if (schools.length < 2) return null;
  const change = async (id) => {
    setBusy(true);
    const r = await supabase.rpc("registry_switch_school", { _school: id });
    if (r.error) {
      setMessage(r.error.message);
      setBusy(false);
    } else window.location.reload();
  };
  return (
    <label className="active-school-switcher">
      Aktivna ustanova
      <select
        value={currentSchoolId || ""}
        disabled={busy}
        onChange={(e) => change(e.target.value)}
      >
        <option value="">Odaberite ustanovu</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {message && <span role="alert">{message}</span>}
    </label>
  );
}
