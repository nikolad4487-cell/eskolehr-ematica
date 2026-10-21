# Povezana nadogradnja e-Matice i Školske referade

Novi moduli su u `src/components/registry/`, povezani s postojećim `src/App.jsx`, postojećim Supabase projektom i njegovim upisima. Nisu stvoreni novi projekti ili duplicirani učenici. Sažetak, zajednički SQL i upute nalaze se u povezanom repozitoriju e-Dnevnika:

- [Pregled funkcija i datoteka](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/registrar/NADOGRADNJA.md).
- [Aktivacija i konfiguracija](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/registrar/AKTIVACIJA.md).
- [Jedna zajednička SQL datoteka](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/codex/registrar-documents-upgrade/docs/AKTIVACIJA-EMATICA-REFERADA.sql).

SQL se primjenjuje jednom u zajedničkom projektu, prije objave obje aplikacije. Ne izvršavati stare e-Matica migracije ponovno kao dio ove nadogradnje. Kvalificirana elektronička ovjera traži stvarnu vanjsku uslugu; priprema zahtjeva nema status izvršene ovjere.

Provjere: `npm run build`, `npm test`. Preglednički test novih urednika: `CHROMIUM_PATH=/putanja/do/chromium npm run test:browser` (zadano `/usr/bin/chromium`, isključivo sintetički podaci). PDF test koristi Python/PyMuPDF za čitanje nastalog dokumenta. Pregledničke snimke pohranjuju se u privremeni direktorij `skolehr-browser-ematica`.

## Odobravanje pečata i potpisa Referade

Administrator otvara **Ustanove → Škole → Ovjera referade** uz odabranu školu. Gumb izravno otvara karticu Svjedodžbe i pomiče prikaz na postavke ovjere. Ista opcija ostaje pod **Podaci ustanove → Svjedodžbe**. Kliknuti **Odobri primjenu pečata i potpisa**; za povlačenje odobrenja koristiti **Opozovi odobrenje**. Slike se prethodno učitavaju u Postavkama Referade. Ako su dodane u drugom prozoru, kliknuti **Osvježi postavke ovjere**.

Greška ili nedostatak ovlasti sada su vidljivi uz mogućnost ponovnog dohvata. Odobravanje ne ovisi o uspješnom učitavanju drugih kartica ustanove. Postojeći Supabase RPC i provjera administratorskih ovlasti škole ostaju nepromijenjeni. Ova dorada ne zahtijeva novu SQL migraciju.

Za potvrdu redovitog školovanja otvoriti **Učenici → Učenici → odabrani učenik → Profil učenika → Obrazovanje, povijest upisa i provjera statusa**. Odabrati odgovarajući upis, postaviti **Redovito školovanje**, upisati stvarnu osnovu provjere i kliknuti **Potvrdi status za dokumente referade**. Provjera je prikazana prije promjene programa. Zatim ponovno odabrati učenika u Referadi i pripremiti novi PDF.
