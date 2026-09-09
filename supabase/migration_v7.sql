-- Migrare v7 pentru o baza de date Supabase DEJA EXISTENTA.
-- Ruleaza o singura data in Supabase Dashboard -> SQL Editor -> New query ->
-- Run. E sigur de rulat de mai multe ori si nu sterge nimic din datele
-- existente.
--
-- Ce face: adauga o sectiune COMPLET SEPARATA, "Vega Constanta" (Salon
-- Beauty + Restaurant), cu propriile tabele, propriul bucket de fisiere si
-- doua roluri noi (vega_admin, vega_manager). Sectiunea asta NU foloseste
-- nicio tabela de la Camin Romantic (centers, requests, products, etc), ca
-- sa fie garantat ca oamenii de la asociatie (admin, administrator_centru)
-- nu pot vedea absolut nimic din Vega Constanta, si invers.

-- Locatiile Vega Constanta (Salon Beauty, Restaurant) - echivalentul
-- tabelului "centers" de la Camin Romantic, dar complet separat.
create table if not exists vega_locations (
  id serial primary key,
  name text not null unique
);

-- Fiecare locatie are un manager propriu (poate fi asignat la mai multe,
-- desi in mod normal e cate unul singur per locatie).
create table if not exists vega_user_locations (
  user_id uuid not null references profiles(id) on delete cascade,
  location_id integer not null references vega_locations(id) on delete cascade,
  primary key (user_id, location_id)
);

-- Catalog de produse SEPARAT per locatie (Salon Beauty si Restaurant au
-- produse complet diferite intre ele, nu doar fata de Camin Romantic).
create table if not exists vega_products (
  id serial primary key,
  location_id integer not null references vega_locations(id) on delete cascade,
  name text not null,
  unique (location_id, name)
);

create table if not exists vega_requests (
  id serial primary key,
  location_id integer not null references vega_locations(id),
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

create table if not exists vega_request_items (
  id serial primary key,
  request_id integer not null references vega_requests(id) on delete cascade,
  nr_crt integer not null,
  produs text not null,
  cantitate text not null,
  detalii text,
  culoare text,
  marime text,
  sex text check (sex in ('Masculin', 'Feminin') or sex is null)
);

create table if not exists vega_request_attachments (
  id serial primary key,
  request_id integer not null references vega_requests(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references profiles(id),
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

-- Bucket privat, separat de cel de la Camin Romantic.
insert into storage.buckets (id, name, public)
values ('vega-atasamente', 'vega-atasamente', false)
on conflict (id) do nothing;

alter table vega_locations enable row level security;
alter table vega_user_locations enable row level security;
alter table vega_products enable row level security;
alter table vega_requests enable row level security;
alter table vega_request_items enable row level security;
alter table vega_request_attachments enable row level security;

-- Extinde rolurile permise pe profiles cu cele doua roluri noi, fara sa
-- atinga contorile admin/administrator_centru existente.
do $$
begin
  alter table profiles drop constraint if exists profiles_role_check;
  alter table profiles
    add constraint profiles_role_check
    check (role in ('admin', 'administrator_centru', 'vega_admin', 'vega_manager'));
end $$;

insert into vega_locations (name) values ('Salon Beauty'), ('Restaurant')
on conflict (name) do nothing;
