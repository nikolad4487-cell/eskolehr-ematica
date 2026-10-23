# Komunikacija i školske usluge

U e-Matici provjera zaključivanja sada prikazuje i **Ispite bez rezultata**. To su prijavljeni učenici na neotkazanim rokovima kojima rezultat još nije evidentiran. Takvi ispiti blokiraju zaključivanje; ponovno otvaranje ostaje postojeći postupak uz ovlasti i obrazloženje.

Rezultati se čuvaju u postojećoj evidenciji `special_exams`. Novi rokovi i prijave iz Školskih usluga e-Dnevnika povezani su s tom evidencijom; ne stvara se druga tablica ocjena. Prikaz i unos koji već postoje u e-Matici ostaju dostupni.

Za obje aplikacije jednom pokrenuti zajedničku [AKTIVACIJA-KOMUNIKACIJA-I-USLUGE.sql](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/main/docs/AKTIVACIJA-KOMUNIKACIJA-I-USLUGE.sql). Uključuje prethodne radne tijekove, pa prethodnu aktivaciju nije potrebno zasebno ponavljati. Puna dokumentacija roditeljskih poruka, suglasnosti, informacija, podrške, zamjena, zahtjeva i ispita je u [uputama e-Dnevnika](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/main/docs/KOMUNIKACIJA-I-USLUGE.md).

Popravak poveznice „Dokumenti čekaju izdavanje” u Referadi radi bez nove SQL funkcije; nova aktivacija potrebna je za nove školske usluge.
