-- Migrare v8 pentru o baza de date Supabase DEJA EXISTENTA.
-- Ruleaza o singura data in Supabase Dashboard -> SQL Editor -> New query ->
-- Run. E sigur de rulat de mai multe ori si nu sterge nimic din datele
-- existente.
--
-- Ce face: adauga rolul "super_admin" - singurul rol care vede si
-- controleaza AMBELE sectiuni (Camin Romantic SI Vega Constanta). Restul
-- rolurilor raman la fel de izolate ca inainte: admin/administrator_centru
-- nu vad Vega Constanta, vega_admin/vega_manager nu vad Camin Romantic.

do $$
begin
  alter table profiles drop constraint if exists profiles_role_check;
  alter table profiles
    add constraint profiles_role_check
    check (role in ('admin', 'administrator_centru', 'vega_admin', 'vega_manager', 'super_admin'));
end $$;

-- Dupa ce rulezi asta, transforma contul tau actual de admin de la Camin
-- Romantic intr-un cont "super_admin" cu o comanda separata (inlocuieste
-- emailul cu al tau):
--
--   update profiles set role = 'super_admin' where email = 'emailul-tau@exemplu.com';
--
-- Nu rula linia de mai sus ca parte din acest fisier - ruleaz-o separat, DUPA
-- ce ai verificat ca emailul e cel corect (contul tau de admin existent, nu
-- unul nou).
