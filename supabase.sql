create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text not null,
  goal text,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  entry_date date not null,
  workout boolean default false,
  steps boolean default false,
  sleep boolean default false,
  protein boolean default false,
  no_sugar_fried boolean default false,
  no_alcohol_smoking boolean default false,
  water boolean default false,
  images jsonb,
  created_at timestamptz default now(),
  unique (user_id, entry_date)
);

alter table users enable row level security;
alter table daily_entries enable row level security;

create policy "Public read users" on users
  for select using (true);

create policy "Public insert users" on users
  for insert with check (true);

create policy "Public update users" on users
  for update using (true);

create policy "Public read entries" on daily_entries
  for select using (true);

create policy "Public insert entries" on daily_entries
  for insert with check (true);

create policy "Public update entries" on daily_entries
  for update using (true);
