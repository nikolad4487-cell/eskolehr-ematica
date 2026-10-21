# Stručni suradnik

Nova školska uloga je `EXPERT`, prikazana kao **Stručni suradnik**. Administrator je odabire pri stvaranju korisnika.

Prije prvog stvaranja korisnika te uloge jednom treba primijeniti [AKTIVACIJA-STRUCNI-SURADNIK.sql](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/main/docs/AKTIVACIJA-STRUCNI-SURADNIK.sql) u SQL Editoru postojećeg Supabase projekta. Skripta je u zajedničkom repozitoriju e-Dnevnika; ne izvršavati je dvaput za dvije aplikacije i ne ponavljati raniju aktivaciju Referade.

Stručni suradnik dobiva zasebnu stavku **Stručna služba**, s odabirom vlastite škole, školske godine, svih razreda i učenika. Predmeti i osobni podaci prikazuju se za pregled. Trajni pedagoški karton i godišnje preporuke/bilješke uređuju se u istoj bazi koju koristi e-Dnevnik. U e-Dnevniku su dodatno dostupne postojeće pedagoške mjere i aktivnosti stručne službe te evidentiranje vlastitog sata razrednika.

Uloga ne dobiva administratorske, upisne ni ocjenjivačke ovlasti. Dodjela/stvaranje i prijava za ovu ulogu provjeravaju da je sigurnosna SQL nadogradnja aktivirana. PIN i autentifikator e-Dnevnika ostaju nepromijenjeni.
