# Ravnatelj

Pri kreiranju korisnika odabrati **Ravnatelj** (`PRINCIPAL`) i pripadajuću školu. Uloga omogućuje pregled vlastitih razreda, učenika, predmeta, ocjena, izostanaka i pedagoških podataka, bez izmjena i administriranja korisnika. Dostupna je poveznica na ravnateljsku upravljačku ploču u e-Dnevniku.

Jednom u zajedničkoj bazi pokrenuti SQL iz e-Dnevnik repozitorija: [AKTIVACIJA-RAVNATELJ.sql](https://github.com/nikolad4487-cell/e-dnevnikskoleme/blob/main/docs/AKTIVACIJA-RAVNATELJ.sql). Ne pokretati dvaput za dvije aplikacije. Zaštita koristi već aktiviranu nadogradnju Stručni suradnik. Bez SQL aktivacije e-Dnevnik odbija dodjelu uloge i prijavu PIN-om za novu ulogu.

Browser test provjerava stvarni App s ravnateljskim članstvom, pregled stvarnih oglednih ocjena i izostanaka, nedostupne administratorske gumbe i onemogućeno spremanje pedagoške dokumentacije, uz laptop/mobilni prikaz. SQL testovi izolacije i prava nalaze se u e-Dnevniku.
