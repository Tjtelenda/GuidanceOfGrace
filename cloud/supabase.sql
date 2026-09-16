-- Guidance of Grace cloud schema. Run in a new Supabase project's SQL editor.
-- Raw Elden Ring save files are NEVER stored. Only derived profile JSON is synced.

create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null check (role in ('explorer','guide')) default 'guide',
  joined_at timestamptz not null default now(),
  primary key (campaign_id,user_id)
);

create table if not exists public.player_states (
  campaign_id uuid not null,
  user_id uuid not null,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (campaign_id,user_id),
  foreign key (campaign_id,user_id) references public.campaign_members(campaign_id,user_id) on delete cascade
);

create or replace function public.add_campaign_owner() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.campaign_members(campaign_id,user_id,display_name,role)
  values(new.id,new.created_by,'Explorer','explorer') on conflict do nothing;
  return new;
end; $$;

drop trigger if exists campaign_owner_trigger on public.campaigns;
create trigger campaign_owner_trigger after insert on public.campaigns
for each row execute function public.add_campaign_owner();

create or replace function public.join_campaign(p_invite_code text,p_display_name text,p_role text default 'guide') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_campaign uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_role not in ('explorer','guide') then raise exception 'Invalid role'; end if;
  if char_length(trim(p_display_name)) < 1 then raise exception 'Display name required'; end if;
  select id into v_campaign from public.campaigns where invite_code=upper(trim(p_invite_code));
  if v_campaign is null then raise exception 'Campaign not found'; end if;
  insert into public.campaign_members(campaign_id,user_id,display_name,role)
    values(v_campaign,auth.uid(),left(trim(p_display_name),60),p_role)
    on conflict(campaign_id,user_id) do update set display_name=excluded.display_name, role=excluded.role;
  return v_campaign;
end; $$;

grant execute on function public.join_campaign(text,text,text) to authenticated;

-- SECURITY DEFINER avoids a recursive RLS lookup on campaign_members.
create or replace function public.is_campaign_member(p_campaign uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.campaign_members m where m.campaign_id=p_campaign and m.user_id=auth.uid());
$$;
revoke all on function public.is_campaign_member(uuid) from public;
grant execute on function public.is_campaign_member(uuid) to authenticated;

alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.player_states enable row level security;

create policy campaigns_insert_self on public.campaigns for insert to authenticated
with check (created_by=auth.uid());
create policy campaigns_read_member on public.campaigns for select to authenticated
using (public.is_campaign_member(id));
create policy campaigns_update_owner on public.campaigns for update to authenticated
using (created_by=auth.uid()) with check (created_by=auth.uid());

create policy members_read_campaign on public.campaign_members for select to authenticated
using (public.is_campaign_member(campaign_id));
create policy members_update_self on public.campaign_members for update to authenticated
using (user_id=auth.uid() and public.is_campaign_member(campaign_id))
with check (user_id=auth.uid() and public.is_campaign_member(campaign_id));
create policy members_delete_self on public.campaign_members for delete to authenticated
using (user_id=auth.uid());

create policy states_read_campaign on public.player_states for select to authenticated
using (public.is_campaign_member(campaign_id));
create policy states_insert_self on public.player_states for insert to authenticated
with check (user_id=auth.uid() and public.is_campaign_member(campaign_id));
create policy states_update_self on public.player_states for update to authenticated
using (user_id=auth.uid() and public.is_campaign_member(campaign_id))
with check (user_id=auth.uid() and public.is_campaign_member(campaign_id));
