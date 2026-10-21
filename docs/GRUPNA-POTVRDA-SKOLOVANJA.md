# Grupna potvrda redovitog školovanja

U e-Matici administrator otvara **Učenici → Upisi → Grupna potvrda redovitog školovanja za referadu**.

1. Odabere školu i školsku godinu. Administrator ustanove radi samo sa svojom školom.
2. Ostavi sve razrede ili odabere pojedini razred te klikne **Prikaži upise za grupnu potvrdu**.
3. Pregleda broj aktivnih, uključenih i preskočenih upisa.
4. Unese zajedničku stvarnu osnovu provjere (3–500 znakova) i označi izjavu o provjeri.
5. Klikne **Potvrdi redovito školovanje za sve uključene upise** i pričeka završetak.

Akcija potvrđuje aktivne upise bez statusa ili s nepotvrđenim statusom REGULAR. Već potvrđeni redovni upisi s evidentiranom osnovom, PART_TIME i EXTERNAL preskaču se. Za promjenu izvanrednog statusa koristi se pojedinačna provjera učenika. Brojevi predstavljaju upise; učenik s više programa može imati više upisa.

Podaci se ponovno dohvaćaju prije pisanja, a novododani upisi ne ulaze u već odobrenu skupinu. Svaki upis koristi postojeći `registry_verify_enrollment`, koji provjerava administratorske ovlasti ustanove i bilježi izvršitelja, datum, status i osnovu u postojeću evidenciju. Nema izmjena autentifikacije, RLS-a ni nove migracije.

Obrada je postupna. Kod djelomične greške uspješno potvrđeni upisi ostaju spremljeni, a prikazuju se greške za neuspjele. Ponovnim potvrđivanjem obrađuju se preostali upisi. Ako se stranica zatvori, ponovno prikažite skupinu; već potvrđeni upisi bit će preskočeni.

Provjere: `npm test`, `npm run test:browser`, `npm run build`. Browser testovi koriste ogledne podatke i provjeravaju broj kandidata, obveznu osnovu i izjavu, preskakanje drugih statusa, djelomičnu grešku, ponavljanje i širine 390–1920 px. Automatski testovi ne potvrđuju stvarne učenike u produkciji.
