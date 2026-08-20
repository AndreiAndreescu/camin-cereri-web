-- Migrare v6 pentru o baza de date Supabase DEJA EXISTENTA.
-- Ruleaza o singura data in Supabase Dashboard -> SQL Editor -> New query ->
-- Run. E sigur de rulat de mai multe ori si nu sterge nimic din datele
-- existente.
--
-- Ce face: adauga posibilitatea de a atasa fisiere (poze, documente) la orice
-- referat, indiferent de status - tabelul de metadate request_attachments,
-- plus bucket-ul PRIVAT de Supabase Storage unde chiar se tin fisierele.

create table if not exists request_attachments (
  id serial primary key,
  request_id integer not null references requests(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references profiles(id),
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

alter table request_attachments enable row level security;

-- Bucket privat (public = false): fisierele NU sunt accesibile direct din
-- browser, doar prin linkuri temporare generate de server (cheia de service).
insert into storage.buckets (id, name, public)
values ('atasamente-referate', 'atasamente-referate', false)
on conflict (id) do nothing;
