create table if not exists public.users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.users
  alter column username type text;

alter table public.users enable row level security;
