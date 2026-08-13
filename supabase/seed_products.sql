-- Adauga in catalogul de produse ("Produse" din aplicatie) toate produsele
-- extrase din referatele de necesitate trimise. Ruleaza o singura data in
-- Supabase Dashboard -> SQL Editor -> New query -> Run. E sigur de rulat de
-- mai multe ori (foloseste "on conflict do nothing") si nu sterge nimic din
-- ce ai adaugat deja manual in catalog.
--
-- Dupa ce rulezi asta, poti oricand sterge/redenumi produse direct din
-- panoul "Produse" al aplicatiei (ca admin) - nu trebuie sa mai vii inapoi
-- in SQL Editor pentru asta.

insert into products (name) values
  ('Tensiometru braț'),
  ('Tensiometru frontal'),
  ('Pulsoximetru'),
  ('Saltea antiescara'),
  ('Bol alb'),
  ('Saltea pat 90x200'),
  ('Cearșaf pat'),
  ('Cearșaf plapumă'),
  ('Față de pernă'),
  ('Pui de pernă'),
  ('Veioză'),
  ('Dulap 4 sertare'),
  ('Televizor'),
  ('Galerie perdea'),
  ('Perdea'),
  ('Draperie'),
  ('Tablou'),
  ('Prosop'),
  ('Periuță de dinți'),
  ('Săpun solid'),
  ('Geantă personală'),
  ('Dulăpior de baie'),
  ('Suport prosop'),
  ('Suport hârtie igienică'),
  ('Suport inox pentru șervețele'),
  ('Bazin săpun lichid'),
  ('Scaun'),
  ('Castron ciorbă'),
  ('Farfurie felul doi'),
  ('Pahar'),
  ('Cană'),
  ('Castron salată'),
  ('Curățător legume'),
  ('Tigaie'),
  ('Cratiță'),
  ('Aspirator'),
  ('Taburet'),
  ('Ghiveci cu flori'),
  ('Revistă auto/modă'),
  ('Ziar'),
  ('Oală mare'),
  ('Cratiță mare'),
  ('Tavă mare de cuptor'),
  ('Polonic mare'),
  ('Lingură mare de mâncare'),
  ('Răzătoare mare'),
  ('Spumieră'),
  ('Clește mare pentru carne'),
  ('Tel'),
  ('Tocător pentru legume'),
  ('Cuțit cu lamă zimțată'),
  ('Cuțit pentru legume'),
  ('Strecurătoare mare'),
  ('Lighean din plastic'),
  ('Lighean din inox'),
  ('Pisălog pentru usturoi')
on conflict (name) do nothing;
