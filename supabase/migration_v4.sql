-- Migrare v4 pentru o baza de date Supabase DEJA EXISTENTA.
-- Ruleaza o singura data in Supabase Dashboard -> SQL Editor -> New query ->
-- Run. E sigur de rulat de mai multe ori si nu sterge nimic din datele
-- existente.
--
-- Ce face: adauga coloana optionala "detalii" pe fiecare produs dintr-o
-- cerere (ex: culoare, marime, orice observatie legata de acel produs).

alter table request_items add column if not exists detalii text;
