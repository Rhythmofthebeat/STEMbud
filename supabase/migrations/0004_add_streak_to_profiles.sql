alter table public.profiles
  add column current_streak int not null default 0,
  add column longest_streak int not null default 0,
  add column last_active_date date;
