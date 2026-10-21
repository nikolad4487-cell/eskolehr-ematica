# Povezana nadogradnja e-Matice i Školske referade

Novi moduli su u `src/components/registry/`, povezani s postojećim `src/App.jsx`, postojećim Supabase projektom i njegovim upisima. Nisu stvoreni novi projekti ili duplicirani učenici. Sažetak, zajednički SQL i upute nalaze se u povezanom repozitoriju e-Dnevnika:

- [Pregled funkcija i datoteka](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/registrar/NADOGRADNJA.md).
- [Aktivacija i konfiguracija](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/registrar/AKTIVACIJA.md).
- [Jedna zajednička SQL datoteka](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/AKTIVACIJA-EMATICA-REFERADA.sql).

SQL se primjenjuje jednom u zajedničkom projektu, prije objave obje aplikacije. Ne izvršavati stare e-Matica migracije ponovno kao dio ove nadogradnje. Kvalificirana elektronička ovjera traži stvarnu vanjsku uslugu; priprema zahtjeva nema status izvršene ovjere.

Provjere: `npm run build`, `npm test`. Preglednički test novih urednika: `CHROMIUM_PATH=/putanja/do/chromium npm run test:browser` (zadano `/usr/bin/chromium`, isključivo sintetički podaci). PDF test koristi Python/PyMuPDF za čitanje nastalog dokumenta. Pregledničke snimke pohranjuju se u privremeni direktorij `skolehr-browser-ematica`.
