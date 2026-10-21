import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAll, verificationCandidates, verifySchooling } from '../src/components/registry/schoolingVerification.mjs';
test('schooling verification confines active upises to chosen classes and preserves other statuses', () => {
  const base = { class_id: 'a', status: 'ACTIVE' };
  const rows = [
    { ...base, id: 'unknown' }, { ...base, id: 'regular', attendance_mode: 'REGULAR' },
    { ...base, id: 'verified', attendance_mode: 'REGULAR', status_verified_at: '2026-10-21', status_evidence: 'upis' },
    { ...base, id: 'part-time', attendance_mode: 'PART_TIME' }, { ...base, id: 'external', attendance_mode: 'EXTERNAL' },
    { ...base, id: 'inactive', status: 'COMPLETED' }, { ...base, id: 'other-school-or-year', class_id: 'b' },
  ];
  assert.deepEqual(verificationCandidates(rows, ['a']).map((r) => r.id), ['unknown', 'regular']);
});
test('bulk verification uses existing audited RPC, reports partial failure and can retry remaining pupils', async () => {
  const calls = [], progress = [];
  const rows = ['ok', 'denied', 'network', 'last'].map((id) => ({ id, class_id: 'a' }));
  const result = await verifySchooling(rows, ' Upisna dokumentacija ', async (name, args) => {
    calls.push({ name, args });
    if (args._enrollment === 'network') throw new Error('Mrežna greška');
    return { error: args._enrollment === 'denied' ? { message: 'Upis nije dostupan.' } : null };
  }, (n) => progress.push(n));
  assert.deepEqual(result.succeeded, ['ok', 'last']);
  assert.deepEqual(result.failed.map((r) => r.id), ['denied', 'network']);
  assert.equal(calls[0].name, 'registry_verify_enrollment');
  assert.equal(calls[0].args._evidence, 'Upisna dokumentacija');
  assert.equal(calls[0].args._mode, 'REGULAR');
  assert.deepEqual(progress, [1, 2, 3, 4]);
  await assert.rejects(verifySchooling(rows, '  ', () => { throw new Error('Must not write'); }), /osnovu/);
});
test('pagination includes all pupils beyond Supabase default limit and rejects failed pages', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const actual = await readAll(() => ({ range: async (a, b) => ({ data: rows.slice(a, b + 1) }) }));
  assert.equal(actual.length, 1201);
  await assert.rejects(readAll(() => ({ range: async () => ({ error: { message: 'No scope' } }) })), /No scope/);
});
