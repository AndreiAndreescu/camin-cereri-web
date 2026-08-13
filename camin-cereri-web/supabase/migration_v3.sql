-- Migrare v3 pentru o baza de date Supabase DEJA EXISTENTA (ai rulat deja
-- schema.sql si/sau migration_v2.sql, si aplicatia e deja live/folosita).
-- Ruleaza tot acest fisier o singura data, in Supabase Dashboard -> SQL Editor
-- -> New query -> Run. E sigur de rulat de mai multe ori.
--
-- Ce face:
--  1. Adauga tabelul "products" - catalogul de produse din care se alege la
--     o cerere noua (admin il administreaza din panoul "Produse" al aplicatiei).
--     Cererile deja trimise nu sunt afectate.
--  2. Nu sterge si nu modifica nimic din datele existente.

create table if not exists products (
  id serial primary key,
  name text not null unique
);
alter table products enable row level security;
