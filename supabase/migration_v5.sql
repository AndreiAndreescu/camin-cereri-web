-- Migrare v5 pentru o baza de date Supabase DEJA EXISTENTA.
-- Ruleaza o singura data in Supabase Dashboard -> SQL Editor -> New query ->
-- Run. E sigur de rulat de mai multe ori si nu sterge nimic din datele
-- existente.
--
-- Ce face: adauga 3 coloane optionale pe fiecare produs dintr-o cerere -
-- culoare, marime, sex (Masculin/Feminin) - langa cea deja existenta,
-- "detalii".

alter table request_items add column if not exists culoare text;
alter table request_items add column if not exists marime text;
alter table request_items add column if not exists sex text;

-- Asigura ca doar 'Masculin'/'Feminin' (sau necompletat) sunt valori valide,
-- doar daca constrangerea nu exista deja (sigur de rulat de mai multe ori).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'request_items_sex_check'
  ) then
    alter table request_items
      add constraint request_items_sex_check check (sex in ('Masculin', 'Feminin') or sex is null);
  end if;
end $$;
