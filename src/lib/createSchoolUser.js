export async function createSchoolUser(client, values, send = fetch) {
  if (!values.schoolId) throw new Error('Odaberite školu.');
  if (typeof values.password !== 'string' || values.password.length < 6) throw new Error('Lozinka mora sadržavati najmanje 6 znakova.');
  if (!/^\d{4}$/.test(values.pin ?? '1234')) throw new Error('Početni PIN mora imati točno 4 znamenke.');
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('Prijava je istekla. Prijavite se ponovno.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await send('https://ednevnik.skolehr.xyz/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(values),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || 'Korisnika nije moguće stvoriti.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Spremanje traje predugo. Osvježite popis korisnika i provjerite je li račun stvoren prije ponovnog pokušaja.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
