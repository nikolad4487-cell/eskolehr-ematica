# Pregled potpunosti podataka

Administrator: **Izvješća → Zadaci i potpunost podataka**. Pregled navodi aktivne upise s nedostajućom adresom, datumom rođenja, programom, matičnom poveznicom ili potvrđenim statusom školovanja. Roditelj/skrbnik traži se samo za učenike za koje poznati datum rođenja potvrđuje maloljetnost. Gumb otvara postojeći profil matičnog učenika. Nakon ispravka osvježiti pregled; za više od 100 rezultata koristiti sljedeću stranicu.

Koristi zajednički Supabase RPC `school_data_quality` iz migracije `20261027000002_system_readiness.sql` u e-Dnevnik repozitoriju. Primijeniti tamošnju objedinjenu `docs/AKTIVACIJA-POUZDANOST-SUSTAVA.sql` prije objave. Nema nove kopije učeničkih podataka. Baza provjerava administratorski pristup vlastitoj ustanovi; pogreška ili nedostajuća aktivacija prikazuje se korisniku.
