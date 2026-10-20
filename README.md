# e-Matica

Samostalna React/Vite aplikacija za sustav ŠkoleHR.

## Vercel environment variables

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_MODULE=ematica
```

## Supabase Auth

U Supabase Dashboardu pod Authentication > URL Configuration dodati:

```text
https://e-matica.skolehr.xyz
http://127.0.0.1:5173
```

## Local development

```powershell
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

## Stvaranje korisnika u e-Matici

U **Popis djelatnika → Novi korisnik** administrator unosi podatke, odabire školu i ulogu (nastavnik, administrator škole ili Školska referada). Školski administrator ima unaprijed zadanu svoju školu. Glavni administrator bira školu. Postojeći obrazac za dodavanje administratora škole također koristi odvojena polja za lozinku (najmanje 6 znakova) i početni PIN djelatnika (4 znamenke).

Oba obrasca stvaraju zajednički Auth račun, profil i školsku ulogu kroz autentificirani endpoint `https://ednevnik.skolehr.xyz/api/admin/create-user`. Zahtjev nosi korisnikov Supabase access token. Poslužitelj provjerava školske ovlasti; Vercel frontend ne dobiva administratorski ključ. Ovaj postupak ne koristi raniju funkciju `create-school-admin`, ne zahtijeva novi SQL ni njezinu ponovnu objavu. Backend mora dopuštati CORS za `https://e-matica.skolehr.xyz`.

Za račun Školske referade administrator nakon stvaranja uključuje dodjelu škole u e-Dnevniku. Postojeći račun s istom e-mail adresom neće dobiti prepisanu lozinku; potrebno je urediti ili uvesti postojeći račun.

Provjere: `npm run build` i `node --test tests/*.test.mjs`. Obrasci su dodatno provjereni u pregledniku s izmišljenim podacima na 1366 × 768 i 390 × 740, uključujući odabir druge škole, referadu, unos osmeroznakovne lozinke i zasebnog PIN-a.
