-- Cămin Romantic — Cereri produse
-- Rulează tot acest fișier o singură dată, în Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Sigur de rulat de mai multe ori (foloseste "if not exists" / "on conflict").
--
-- Daca ai rulat deja o versiune mai veche a acestui fisier pe un proiect Supabase
-- existent, nu rula asta din nou peste el - foloseste in schimb
-- supabase/migration_v2.sql, facut special pentru baze de date deja existente.

create table if not exists centers (
  id serial primary key,
  name text not null unique
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'administrator_centru')),
  center_id integer references centers(id), -- pastrat doar istoric; nefolosit - vezi user_centers
  created_at timestamptz not null default now()
);

-- Un administrator de centru poate fi asignat la mai multe centre.
create table if not exists user_centers (
  user_id uuid not null references profiles(id) on delete cascade,
  center_id integer not null references centers(id) on delete cascade,
  primary key (user_id, center_id)
);

create table if not exists requests (
  id serial primary key,
  center_id integer not null references centers(id),
  created_by uuid not null references profiles(id),
  created_by_name text not null,
  created_at timestamptz not null default now(),
  urgent boolean not null default false,
  status text not null default 'asteptare' check (status in ('asteptare', 'in_curs', 'rezolvat', 'respins')),
  decided_by uuid references profiles(id),
  decided_by_name text,
  decided_at timestamptz,
  resolved_by uuid references profiles(id),
  resolved_by_name text,
  resolved_at timestamptz
);

create table if not exists request_items (
  id serial primary key,
  request_id integer not null references requests(id) on delete cascade,
  nr_crt integer not null,
  produs text not null,
  cantitate text not null
);

-- Catalogul de produse din care se poate alege la o cerere noua (admin il
-- administreaza din panoul "Produse"). Cererile deja trimise raman neschimbate
-- chiar daca un produs e sters ulterior din catalog (produsul e stocat ca text
-- simplu in request_items, nu ca legatura catre products).
create table if not exists products (
  id serial primary key,
  name text not null unique
);

-- RLS activat pe toate tabelele, fara nicio policy pentru clientul obisnuit:
-- inseamna ca NIMENI nu poate citi/scrie direct din browser cu cheia publica
-- (anon key). Toate operatiile trec exclusiv prin serverul aplicatiei
-- (rutele API din Next.js), care foloseste cheia de service (service_role)
-- si ocoleste RLS by design in Supabase. Asta tine datele in siguranta fara
-- sa fie nevoie de policy-uri complicate.
alter table centers enable row level security;
alter table profiles enable row level security;
alter table user_centers enable row level security;
alter table requests enable row level security;
alter table request_items enable row level security;
alter table products enable row level security;

-- Cele 30 de centre reale (de pe caminromantic.com/admin/centers).
insert into centers (name) values
  ('CZ Mihai Bravu'),
  ('ALEX SOCIAL'),
  ('CABR Argedava'),
  ('CIA Casa cu Tei'),
  ('CIA Romantic'),
  ('EM Mihai Bravu'),
  ('LMP MIHAI BRAVU 303N'),
  ('LMP MIHAI BRAVU 403N'),
  ('LMP MIHAI BRAVU 502S'),
  ('LMP MIHAI BRAVU 507S'),
  ('LMP MIHAI BRAVU 607N'),
  ('LMP Mihai Bravu 101'),
  ('LMP Mihai Bravu 104'),
  ('LMP Mihai Bravu 201'),
  ('LMP Mihai Bravu 209'),
  ('LMP Mihai Bravu 303'),
  ('LMP Mihai Bravu 305'),
  ('LMP Mihai Bravu 309'),
  ('LMP Mihai Bravu 416'),
  ('LMP Pantelimon 1'),
  ('LMP Pantelimon 2'),
  ('LMP Pantelimon 4'),
  ('LMP 1 Ateneul Roman'),
  ('LMP Stefan cel Mare'),
  ('LP4 BRÂNCOVEANU'),
  ('SID Vârstnici'),
  ('SAS Mihai Bravu'),
  ('SID Dizabilităţi Mihai Bravu'),
  ('Symphony'),
  ('Test Center')
on conflict (name) do nothing;
