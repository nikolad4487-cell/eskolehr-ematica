-- The shared e-Dnevnik schools table can predate the e-Matica schema and
-- therefore have a text primary key without a default value.
create extension if not exists pgcrypto;

alter table public.schools
  alter column id set default gen_random_uuid()::text;
