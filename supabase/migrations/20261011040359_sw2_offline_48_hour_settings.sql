-- Only the approval service reads/writes this administrative setting.
-- Missing rows retain the default 48-hour offline approval for active users.
create table public.sw2_offline_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 allow_offline boolean not null default true,
 updated_at timestamptz not null default now(),
 updated_by uuid references public.profiles(id) on delete set null
);
alter table public.sw2_offline_settings enable row level security;
revoke all on public.sw2_offline_settings from public, anon, authenticated;
grant select, insert, update, delete on public.sw2_offline_settings to service_role;
