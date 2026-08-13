-- Migrare v2 pentru o baza de date Supabase DEJA EXISTENTA (pe care ai rulat
-- deja o data schema.sql, si aplicatia e deja live/folosita).
-- Ruleaza tot acest fisier o singura data, in Supabase Dashboard -> SQL Editor
-- -> New query -> Run. E sigur de rulat de mai multe ori.
--
-- Ce face:
--  1. Adauga tabelul user_centers, ca un administrator de centru sa poata fi
--     asignat la mai multe centre (nu doar unul).
--  2. Muta automat centrul deja asignat fiecarui administrator (coloana veche
--     profiles.center_id) in noul tabel, ca nimeni sa nu ramana fara centru.
--  3. Elimina tabelul product_aliases (functia "Sinonime produse" a fost
--     eliminata din aplicatie).

create table if not exists user_centers (
  user_id uuid not null references profiles(id) on delete cascade,
  center_id integer not null references centers(id) on delete cascade,
  primary key (user_id, center_id)
);
alter table user_centers enable row level security;

insert into user_centers (user_id, center_id)
select id, center_id from profiles
where center_id is not null
on conflict do nothing;

drop table if exists product_aliases;
