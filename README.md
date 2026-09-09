# Cămin Romantic — Referate de Necesitate (versiunea cloud)

Aceeași aplicație ca varianta anterioară (referate de necesitate pe centru, listă
"de luat", accept/respinge/rezolvat, urgent), dar construită să funcționeze
fără ca cineva să țină un calculator pornit. Rulează gratuit, pe infrastructura
Google-scale a Vercel + Supabase, și rămâne funcțională la nesfârșit, indiferent
cine mai e sau nu în firmă — atâta timp cât facturile (gratuite, la acest volum)
sunt plătite/contul există.

## Cum funcționează

- **Vercel** găzduiește aplicația (paginile + logica de server) — gratuit
  pentru acest volum de trafic, fără server de administrat.
- **Supabase** ține baza de date (centre, utilizatori, cereri) și gestionează
  autentificarea (email + parolă) — tot gratuit la acest volum.
- Doar 2 roluri au cont: **admin** (șefa — creează, acceptă/respinge și
  confirmă referate de necesitate, adaugă centre noi și poate crea alți
  utilizatori) și **administrator de centru** (creează referate doar pentru
  centrul/centrele la care e asignat — poate fi asignat la unul sau la mai
  multe centre deodată). Administratorul de centru vede DOAR referatele
  centrului/centrelor lui, nu și ale altor centre, și nu vede lista globală
  „De luat".
- Produsele identice cerute de doi oameni diferit (scaun/scaune, floare/flori)
  se adună automat în lista "de luat" (vizibilă doar pentru admin).
- Centrele nu mai sunt fixe: admin poate adăuga sau șterge centre oricând,
  direct din panoul **Centre** al aplicației, fără să mai fie nevoie de baza
  de date.
- Admin poate edita orice utilizator din panoul **Utilizatori** (nume, email,
  rol, centre asignate, sau poate reseta parola cuiva) și poate șterge orice
  cont (în afară de propriul cont, ca să nu rămână nimeni fără acces din
  greșeală). Editarea emailului schimbă direct și emailul de autentificare —
  persoana respectivă se loghează de-atunci cu noul email.
- Produsele nu se mai scriu liber: la un referat nou se bifează din catalogul
  de produse (panoul **Produse**, unde admin ȘI administrator de centru pot
  adăuga, edita și șterge produse) și se completează doar cantitatea pentru
  fiecare bifat. Catalogul poate fi filtrat printr-o casetă de căutare, atât
  la bifarea produselor într-un referat cât și în panoul **Produse**.
- La fiecare produs bifat într-un referat nou poți completa și: **Detalii**
  (observație liberă), **Culoare**, **Mărime** și **Sex** (Masculin/Feminin) —
  toate opționale. Apar atât la referatul individual, cât și în lista „De luat"
  (produsele identice cu vreun atribut diferit rămân pe rânduri separate, ca
  să nu se piardă informația).
- Orice referat (admin sau administrator de centru) poate fi printat individual
  cu butonul **Printează** de pe cardul lui.
- Admin poate șterge orice referat deja rezolvat sau respins. Administratorul
  de centru poate șterge orice referat al centrului lui, indiferent de status —
  util ca să corecteze rapid un referat greșit, chiar dacă încă n-a fost
  procesat de admin.
- Cât timp un referat e încă „în așteptare" (nedecis), admin sau administrator
  de centru pot să-l editeze din butonul **Editează** de pe card — produse,
  cantități, culoare/mărime/sex/detalii, și chiar centrul pentru care e făcut
  (util dacă un administrator responsabil de mai multe centre a bifat greșit
  centrul la creare). Odată acceptat/respins/rezolvat, nu se mai poate
  edita — doar șters.
- Admin poate căuta un produs anume (panoul **Caută produs pe centre**) și
  vede exact ce centru l-a cerut și în ce cantitate.
- La orice referat, indiferent de status, admin și administrator de centru
  (doar la referatele centrului lui) pot atașa fișiere — poze (jpg, png,
  heic, webp, gif) sau documente (pdf, doc, docx), maxim 15MB fiecare — din
  secțiunea **Atașamente** de pe cardul referatului. Fișierele pot fi
  descărcate/vizualizate sau șterse oricând de cine are voie să le atașeze.
  Fișierele se țin într-un bucket privat de Supabase Storage, nu sunt
  accesibile public — aplicația generează un link temporar de fiecare dată
  când cineva apasă pe un fișier.
- Merge bine și de pe telefon: tabelele cu multe coloane (produse, „De luat")
  se derulează pe orizontală în loc să înghesuie tot ecranul, iar toate
  câmpurile de scris (căutare, cantitate, culoare, mărime, detalii, login)
  sunt mai mari și mai ușor de citit/apăsat.
- În loc de o singură pagină lungă cu totul unul sub altul, aplicația are un
  meniu sus (Referate de Necesitate, Referat nou, De luat, Caută produs pe
  centre, Produse, Centre, Utilizatori) — fiecare e o pagină separată, cu
  scroll propriu, ca să nu mai fie nevoie să cauți printr-un scroll lung ca
  să ajungi la o anumită secțiune. Numărul de lângă unele din ele arată câte
  elemente sunt acolo, dintr-o privire.

## Vega Constanța — sectiune complet separată (Salon Beauty + Restaurant)

Aplicația mai are o secțiune complet izolată, "Vega Constanța", pentru Salon
Beauty și Restaurant. **Izolare totală, în ambele sensuri**: nimeni de la
Asociația Cămin Romantic (admin, administrator de centru) nu poate vedea sau
atinge absolut nimic din Vega Constanța, și invers, nimeni de la Vega
Constanța nu poate vedea Cămin Romantic. Nu e doar o restricție de interfață —
e construită așa la nivel de bază de date și server:

- Tabele complet separate (`vega_locations`, `vega_products`, `vega_requests`,
  `vega_request_items`, `vega_request_attachments`) — nu ating deloc tabelele
  de la Cămin Romantic (`centers`, `requests`, `products`, etc).
- Bucket separat de Storage (`vega-atasamente`) pentru fișierele atașate.
- Rute API separate, sub `/api/vega/...`, care resping automat orice cont
  admin/administrator de centru; rutele de la Cămin Romantic (`/api/users`,
  etc.) resping la fel de strict orice cont Vega, și au fost verificate să nu
  poată nici măcar vedea că există conturi Vega în baza de date.
- Interfață complet separată (`VegaDashboard.js`), afișată automat la login
  în funcție de rol. Singura excepție e contul special „Admin General"
  (`super_admin`, vezi mai jos) — pentru toate celelalte roluri nu există
  niciun buton sau link care să treacă dintr-o secțiune în alta.

**Roluri** (2 roluri noi, fără nicio legătură cu cele de la Cămin Romantic):

- **Admin Vega** (`vega_admin`) — vede și gestionează ambele locații (Salon
  Beauty și Restaurant): catalogul de produse al fiecăreia, locațiile în
  sine, utilizatorii Vega, lista "De luat" agregată, și poate accepta/
  respinge/rezolva referate de la orice locație.
- **Manager locație** (`vega_manager`) — asignat la o locație (sau mai
  multe, dacă e cazul). Spre deosebire de administratorul de centru de la
  Cămin Romantic, managerul de locație CREEAZĂ **și** ACCEPTĂ/RESPINGE/
  REZOLVĂ singur referatele locației lui — e "șeful" acelei locații. Nu vede
  lista globală "De luat" și nu vede cealaltă locație.

Fiecare locație (Salon Beauty, Restaurant) are propriul catalog de produse,
complet separat — nu împart produse nici măcar între ele.

### Cum creezi primul cont Vega (o singură dată)

La fel ca la Cămin Romantic, primul cont trebuie creat din terminal (nu
există încă nimeni care să-l creeze din aplicație):

```bash
npm run create-user -- --email=admin@vegaconstanta.com --password=parola123 --name="Admin Vega" --role=vega_admin
```

De acolo încolo, acest cont poate crea manageri de locație direct din
aplicație, din panoul **Utilizatori** (secțiunea Vega). Dacă preferi tot
terminalul pentru un manager de locație:

```bash
npm run create-user -- --email=beauty@vegaconstanta.com --password=parola123 --name="Manager Salon Beauty" --role=vega_manager --location="Salon Beauty"
```

(Ca să vezi numele exacte ale locațiilor: `npm run create-user -- --list-locations`.)

Nimic din toate astea nu necesită cunoștințe tehnice după ce e pus o dată la
punct — pașii de mai jos sunt gândiți să fie urmați o singură dată.

### Admin General — un singur cont care vede AMBELE secțiuni

Izolarea de mai sus e totală pentru toată lumea, cu o singură excepție
voită: rolul special **Admin General** (`super_admin`). E gândit pentru o
singură persoană (de ex. tu) care trebuie să aibă control complet și peste
Cămin Romantic, și peste Vega Constanța, fără să aibă nevoie de două conturi
separate.

Cum funcționează:

- La login, un cont Admin General vede un ecran de alegere: **Cămin
  Romantic** sau **Vega Constanța**.
- Odată intrat într-o secțiune, are un buton mereu vizibil sus, în dreapta
  (lângă „Ieși din cont"), ca să treacă instant în cealaltă secțiune, fără
  să mai dea logout.
- În Cămin Romantic se comportă identic cu un cont `admin` (decide toate
  referatele, gestionează utilizatori, centre, produse). În Vega Constanța
  se comportă identic cu un cont `vega_admin` (gestionează ambele locații).
- Pentru toate celelalte conturi — admin/administrator de centru de la Cămin
  Romantic, vega_admin/vega_manager de la Vega Constanța — nimic nu se
  schimbă: izolarea rămâne totală și în ambele sensuri.

Contul Admin General **nu se creează din nou** — se obține transformând un
cont de admin deja existent la Cămin Romantic, printr-o comandă SQL rulată o
singură dată în Supabase (vezi `supabase/migration_v8.sql` mai jos, la
secțiunea de migrări).

---

## Pasul 1 — Creezi un proiect Supabase (bază de date + autentificare)

1. Mergi pe [supabase.com](https://supabase.com) și apasă **Start your project**.
   Recomandat: folosește un email al firmei, nu personal, ca accesul să poată
   fi predat mai departe ușor.
2. Creează un proiect nou: alege un nume (ex. `camin-cereri`), o parolă
   pentru baza de date (salveaz-o undeva sigur) și regiunea cea mai apropiată
   (ex. Frankfurt/EU).
3. Așteaptă ~2 minute până se creează proiectul.
4. Din meniul din stânga, mergi la **SQL Editor** → **New query**, deschide
   fișierul `supabase/schema.sql` din acest proiect, copiază tot conținutul,
   lipește-l acolo și apasă **Run**. Asta creează tabelele și adaugă cele 30
   de centre reale.
5. Mergi la **Settings → API**. O să ai nevoie de 3 valori de-acolo la pasul
   3:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (ține-o secretă — nu se pune niciodată în cod vizibil public)

## Pasul 2 — Pui codul pe GitHub

GitHub ține codul aplicației și e legătura dintre Vercel și proiect (Vercel
redeployază automat de fiecare dată când se schimbă ceva).

1. Mergi pe [github.com](https://github.com), creează-ți cont (tot cu emailul
   firmei, dacă se poate) și apasă **New repository**. Numește-l `camin-cereri-web`,
   lasă-l **Private**, și apasă **Create repository**.
2. Pe pagina goală a repo-ului, apasă **uploading an existing file** și trage
   peste tot conținutul folderului `camin-cereri-web` (fără folderele
   `node_modules` și `.next`, dacă există — nu sunt necesare). Apasă
   **Commit changes**.

(Dacă cineva mai tehnic preferă `git`, la fel de bine merge `git init && git
add . && git commit -m "initial" && git push`.)

## Pasul 3 — Deploy pe Vercel

1. Mergi pe [vercel.com](https://vercel.com) și apasă **Sign Up** →
   **Continue with GitHub** (folosește contul creat la pasul 2 — cel mai simplu).
2. Apasă **Add New → Project**, alege repo-ul `camin-cereri-web` și apasă **Import**.
3. Înainte de a apăsa Deploy, deschide **Environment Variables** și adaugă,
   una câte una (numele exact e important):

   | Nume | Valoare |
   |---|---|
   | `SUPABASE_URL` | Project URL de la pasul 1 |
   | `SUPABASE_ANON_KEY` | anon/public key de la pasul 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key de la pasul 1 |
   | `SESSION_SECRET` | orice șir lung, aleator (ex. generat pe [randomkeygen.com](https://randomkeygen.com), secțiunea "CodeIgniter Encryption Keys") |

4. Apasă **Deploy**. După ~1 minut, primești un link (ceva de forma
   `camin-cereri-web.vercel.app`) — acolo trăiește aplicația, non-stop.

## Pasul 4 — Creezi primul cont de admin (o singură dată)

Aplicația e goală — nimeni nu se poate loga încă. Trebuie creat manual
primul cont de admin (după asta, adminul poate crea toate conturile
următoare direct din aplicație, fără să mai fie nevoie de pașii ăștia).

Ai nevoie de [Node.js](https://nodejs.org) instalat pe calculatorul tău:

```bash
cd camin-cereri-web
npm install
cp .env.example .env.local
```

Deschide `.env.local` și completează aceleași 4 valori de la pașii 1 și 3
(Supabase URL, anon key, service role key, session secret). Apoi:

```bash
npm run create-user -- --email="sefa@firma.ro" --password="o-parola-buna" --name="Numele Șefei" --role=admin
```

Gata — acum poți intra pe linkul Vercel cu acel email/parolă.

## Pasul 5 — Adaugi restul utilizatorilor (administratori de centru)

Din acest punct înainte, **nu mai e nevoie de terminal**. Loghează-te cu
contul de admin pe link-ul Vercel:

- Mergi la secțiunea **Produse** și adaugă câteva produse în catalog (fără
  cel puțin un produs, nimeni nu poate trimite un referat nou).
- Mergi la secțiunea **Centre** ca să adaugi orice centru nou lipsă (sau
  să ștergi unul care nu mai există — doar dacă nu are referate asociate).
- Mergi la secțiunea **Utilizatori**, completează nume/email/parolă, alege
  rolul "Administrator de Centru" și bifează unul sau mai multe centre (un
  administrator poate fi responsabil de mai multe centre deodată), apoi
  apasă **Creează cont**. Persoana respectivă se loghează direct cu emailul
  și parola primite. Poți șterge orice cont mai târziu de-aici, în afară de
  al tău.

(Scriptul `npm run create-user` tot funcționează, dacă vreodată preferi
terminalul — acceptă și mai multe centre deodată, separate prin virgulă:
`--center="CIA Romantic,CIA Casa cu Tei"`. Ca să vezi lista de centre:
`npm run create-user -- --list-centers`.)

---

## Dacă aplicația e deja live (actualizări succesive)

Dacă ai deja rulat `supabase/schema.sql` cândva și aplicația e deja folosită,
NU rula din nou `schema.sql` — în schimb, rulează pe rând, în Supabase →
**SQL Editor** → New query → Run, fișierele de migrare pe care nu le-ai rulat
încă (fiecare o singură dată, în ordine):

1. `supabase/migration_v2.sql` — centre multiple per administrator.
2. `supabase/migration_v3.sql` — catalogul de produse (panoul „Produse").
3. `supabase/seed_products.sql` — opțional, adaugă direct în catalog o listă
   de produse uzuale (extrase din referatele trimise). Poți sări peste el
   dacă preferi să adaugi produsele manual din panoul „Produse".
4. `supabase/migration_v4.sql` — câmpul opțional „Detalii" per produs la un
   referat nou.
5. `supabase/migration_v5.sql` — câmpurile opționale „Culoare", „Mărime" și
   „Sex" per produs la un referat nou.
6. `supabase/migration_v6.sql` — atașamente (poze/documente) per referat;
   creează și bucket-ul privat de Storage „atasamente-referate" unde se țin
   fișierele.
7. `supabase/migration_v7.sql` — secțiunea complet separată Vega Constanța
   (Salon Beauty + Restaurant): tabele proprii, bucket propriu de Storage și
   cele două roluri noi (`vega_admin`, `vega_manager`). Nu afectează deloc
   datele de la Cămin Romantic.
8. `supabase/migration_v8.sql` — adaugă rolul special **Admin General**
   (`super_admin`), singurul care vede și controlează ambele secțiuni (vezi
   „Admin General" mai sus). După ce rulezi acest fișier, transformă contul
   tău de admin existent de la Cămin Romantic într-un cont Admin General cu o
   comandă separată, tot în SQL Editor (înlocuiește emailul cu al tău —
   trebuie să fie emailul contului tău de admin deja existent, nu unul nou):

   ```sql
   update profiles set role = 'super_admin' where email = 'emailul-tau@exemplu.com';
   ```

   Verifică emailul cu atenție înainte să apeși Run — comanda schimbă
   contul respectiv definitiv în Admin General.

Sunt sigure de rulat de mai multe ori și nu șterg nimic din datele existente
(cu excepția comenzii `update` de mai sus, care trebuie rulată o singură
dată, cu grijă, doar pe emailul corect).

---

## Predarea aplicației (când nu mai ești în firmă)

Cele 3 conturi (Supabase, GitHub, Vercel) ar trebui create cu un email al
firmei, nu personal — așa rămân ale firmei automat. Dacă totuși le-ai creat
cu emailul tău, toate 3 platformele au o opțiune de **transfer ownership**
(Supabase: Settings → General; GitHub: Settings → Danger Zone → Transfer;
Vercel: Project Settings → Transfer) către alt cont, fără să se întrerupă
nimic.

## Dacă vrei să testezi local înainte de deploy

```bash
npm run dev
```

Aplicația pornește pe `http://localhost:3000`, citind aceleași variabile din
`.env.local`.
