// Page through all rows: Supabase's default response limit must not omit pupils.
export async function readAll(query) {
  const rows = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await query().range(start, start + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data || []));
    if ((data || []).length < 500) return rows;
  }
}

export function verificationCandidates(rows, classIds) {
  const allowed = new Set(classIds);
  return rows.filter((r) => allowed.has(r.class_id) && r.status === 'ACTIVE'
    && (!r.attendance_mode || r.attendance_mode === 'REGULAR')
    && !(r.attendance_mode === 'REGULAR' && r.status_verified_at && r.status_evidence?.trim()));
}

export async function verifySchooling(rows, evidence, rpc, progress = () => {}) {
  if (evidence.trim().length < 3 || evidence.trim().length > 500) throw new Error('Navedite osnovu provjere (3–500 znakova).');
  const succeeded = [], failed = [];
  for (const row of rows) {
    try {
      const { error } = await rpc('registry_verify_enrollment', {
        _enrollment: row.id, _mode: 'REGULAR', _evidence: evidence.trim(),
      });
      if (error) throw new Error(error.message);
      succeeded.push(row.id);
    } catch (error) {
      failed.push({ id: row.id, class_id: row.class_id, message: error.message });
    }
    progress(succeeded.length + failed.length);
  }
  return { succeeded, failed };
}
