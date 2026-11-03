# Upis u srednju školu → e-Matica → razred e-Dnevnika

e-Upisi, e-Matica i e-Dnevnik koriste zajednički Supabase projekt `hkqlbeetlvrplaeubncc`. Nije potreban dodatni servis niti kopiranje korisničkih računa.

## Postupak za školu

1. U e-Upisima izračunati rang-liste. Prihvaćen izbor sam po sebi još nije konačni upis.
2. Administrator ciljne škole ili glavni administrator u **Provedba upisa** odabire godinu početka srednje škole i potvrđuje upis. Primjer: završetak osnovne 2026./2027. → prvi razred srednje 2027./2028.
3. Funkcija odmah stvara aktivan `student_school_enrollments` zapis u e-Matici škole iz prihvaćenog izbora, s odgovarajućim programom i školskom godinom te poveznicom na kandidaturu. Svaka škola koristi vlastiti identifikator godine; mapiranje koristi jednaku oznaku godine, a ne identifikator iz osnovne škole.
4. U e-Matici **Upisi**, ili e-Dnevniku **Učenici škole**, otvoriti **Povuci učenike iz e-Matice u razred**, odabrati ciljni razred i označiti učenike. Prikazuju se samo upisi iste škole, programa i godine. Novoupisani preko srednjih upisa raspoređuju se u prvi razred.
5. Potvrditi povlačenje. Učenik dobiva upis u odabrani razred, školsku ulogu STUDENT i redovne predmete razreda. Izborni predmeti i izbor jezika ostaju zasebna odluka škole/učenika.

Postojeći račun, prijava, lozinka, postavke računa i povijest osnovne škole ostaju sačuvani. Ako matični učenik nema poveznicu s e-Dnevnik računom, povezati ga kroz postojeći postupak u e-Matici; ovaj postupak ne stvara drugu osobu niti mijenja lozinku. Mjerodavni su školski i razredni upisi, ne globalni `user_profiles.class_id` (koji može pripadati drugoj školi).

## Provjere i ponavljanje

- Potvrda upisa je idempotentna po kandidaturi; ponovni poziv vraća EXISTS. Naknadno rangiranje ne može tiho promijeniti potvrđenu školu/program. Za promjene koristiti službeni postupak prijelaza.
- Potrebna je postojeća, jednoznačna, otvorena godina u ciljnoj školi. Ne stvara se godina automatski i ne odabire se slučajni prvi razred.
- Povlačenje provjerava ovlasti, aktivan matični upis, školu, program, godinu i zaključavanje razreda/godine. Drugi aktivan razred iste škole/godine blokira prijenos.
- Skupni uvoz od 1 do 100 učenika je transakcijski: pogreška bilo kojeg učenika poništava cijeli skup. Ponavljanje istog uvoza ne stvara nove upise ni dodatne zapise sinkronizacije.
- Postojeći scope trigger dobiva usku iznimku za prvi upis u ciljnu ustanovu: prihvaćena kandidatura i izbor moraju pripadati učeniku, školi i programu tog upisa. Nakon upisa škola dobiva postojeći pristup matičnom učeniku kroz svoj školski upis.

## Isporuka i provjera

Migracija `supabase/migrations/20261103192115_secondary_admissions_registry_class_sync.sql` primijenjena je na zajedničku bazu 3. 11. 2026. Nisu pokretani stvarni upisi učenika. U trenutku provjere baza nije imala kandidature SECONDARY, pa nije bilo upisa za povratni prijenos.

Objaviti odgovarajuće izmjene sva tri repozitorija: e-Upisi (jasna konačna potvrda), e-Matica (pregled raspoređivanja) i e-Dnevnik (povlačenje u razred). Baza je zajednička; migracija se primjenjuje jednom iz ovog repozitorija.

Provjereni su: build sva tri projekta, TypeScript e-Dnevnika, PostgreSQL testovi stvarne migracije (`node --test tests/secondary-admissions-sync.test.mjs`) i browser test (`node tests/browser-admission-import.mjs`) na desktopu i širini 390 px. Browser test koristi sintetičke podatke. U živoj bazi provjerena je instalacija funkcija i odbijanje poziva bez prijave. Opći testni skup e-Matice imao je 11 prolaza i jedan postojeći PDF test koji na Windowsu pada zbog hardkodiranog `/tmp` izlaza.
