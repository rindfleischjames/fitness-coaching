-- VITALS coaching app — initial schema
-- Single coach, many clients. Role lives on `profiles`, one row per auth user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('coach', 'client')),
  email text not null,
  full_name text,
  timezone text not null default 'UTC',
  preferred_unit text not null default 'lbs' check (preferred_unit in ('lbs', 'kg')),
  consent_accepted_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- weigh_ins — daily weight-only entries AND weekly photo check-ins live in
-- the same table. photo_urls is empty for a daily entry, populated for a
-- photo check-in. This keeps the trend chart a single source of truth.
-- ---------------------------------------------------------------------------
create table public.weigh_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  weight_kg numeric(6, 2) not null,
  photo_urls text[] not null default '{}',
  photo_angle_tags text[] not null default '{}',
  notes text,
  fasted boolean not null default false,
  created_at timestamptz not null default now()
);
create index weigh_ins_client_date_idx on public.weigh_ins (client_id, date desc);

-- ---------------------------------------------------------------------------
-- goals — coach-set only, client reads.
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'weight' check (type in ('weight', 'habit')),
  target_value numeric(6, 2),
  target_date date,
  status text not null default 'active' check (status in ('active', 'achieved', 'archived')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);
create index goals_client_idx on public.goals (client_id);

-- ---------------------------------------------------------------------------
-- schedule_items + per-date completions
-- ---------------------------------------------------------------------------
create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  category text not null default 'habit' check (category in ('weigh_in', 'photo_checkin', 'habit', 'call', 'other')),
  recurrence_rule text not null default 'daily' check (recurrence_rule in ('daily', 'weekly', 'once')),
  time_of_day time not null default '09:00',
  created_at timestamptz not null default now()
);
create index schedule_items_client_idx on public.schedule_items (client_id);

create table public.schedule_completions (
  id uuid primary key default gen_random_uuid(),
  schedule_item_id uuid not null references public.schedule_items (id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  unique (schedule_item_id, date)
);

-- ---------------------------------------------------------------------------
-- messaging — one thread per coach/client pair
-- ---------------------------------------------------------------------------
create table public.threads (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coach_id, client_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text,
  attachment_url text,
  attachment_type text check (attachment_type in ('image', 'document')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_thread_idx on public.messages (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- bookings — synced from Cal.com, coach-managed only (no client self-booking)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  cal_com_event_id text unique not null,
  client_id uuid references public.profiles (id) on delete set null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  zoom_link text,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);
create index bookings_start_idx on public.bookings (start_time);

-- ---------------------------------------------------------------------------
-- coach_notes — private, one running note block per client
-- ---------------------------------------------------------------------------
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.profiles (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- invites — self-serve client onboarding
-- ---------------------------------------------------------------------------
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  coach_id uuid not null references public.profiles (id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- push_subscriptions — web push (VAPID), free, no third-party service
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helper: is the current user the coach?
-- security definer to avoid recursive RLS lookups against profiles.
-- ---------------------------------------------------------------------------
create function public.is_coach()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  );
$$;

-- ---------------------------------------------------------------------------
-- trigger: create a profile row whenever a new auth user is created.
-- Defaults to 'client' — promote yourself to 'coach' once, manually, after
-- your own signup (see README).
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- trigger: auto-create the coach/client thread the moment a client profile
-- exists (single-coach app — there's only ever one coach to thread with).
-- ---------------------------------------------------------------------------
create function public.handle_new_client_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  coach uuid;
begin
  if new.role = 'client' then
    select id into coach from public.profiles where role = 'coach' limit 1;
    if coach is not null then
      insert into public.threads (coach_id, client_id)
      values (coach, new.id)
      on conflict (coach_id, client_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_client_profile();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.goals enable row level security;
alter table public.schedule_items enable row level security;
alter table public.schedule_completions enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.bookings enable row level security;
alter table public.coach_notes enable row level security;
alter table public.invites enable row level security;
alter table public.push_subscriptions enable row level security;

-- profiles
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_coach());
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or public.is_coach());
create policy "profiles_insert" on public.profiles for insert
  with check (id = auth.uid());

-- weigh_ins
create policy "weigh_ins_select" on public.weigh_ins for select
  using (client_id = auth.uid() or public.is_coach());
create policy "weigh_ins_insert" on public.weigh_ins for insert
  with check (client_id = auth.uid() or public.is_coach());
create policy "weigh_ins_update" on public.weigh_ins for update
  using (client_id = auth.uid() or public.is_coach());
create policy "weigh_ins_delete" on public.weigh_ins for delete
  using (client_id = auth.uid() or public.is_coach());

-- goals — coach-set only, client read-only
create policy "goals_select" on public.goals for select
  using (client_id = auth.uid() or public.is_coach());
create policy "goals_write" on public.goals for insert
  with check (public.is_coach());
create policy "goals_update" on public.goals for update
  using (public.is_coach());
create policy "goals_delete" on public.goals for delete
  using (public.is_coach());

-- schedule_items — coach builds the schedule, client reads their own
create policy "schedule_items_select" on public.schedule_items for select
  using (client_id = auth.uid() or public.is_coach());
create policy "schedule_items_write" on public.schedule_items for insert
  with check (public.is_coach());
create policy "schedule_items_update" on public.schedule_items for update
  using (public.is_coach());
create policy "schedule_items_delete" on public.schedule_items for delete
  using (public.is_coach());

-- schedule_completions — client checks off their own tasks, coach can too
create policy "schedule_completions_select" on public.schedule_completions for select
  using (
    exists (
      select 1 from public.schedule_items si
      where si.id = schedule_item_id and (si.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "schedule_completions_insert" on public.schedule_completions for insert
  with check (
    exists (
      select 1 from public.schedule_items si
      where si.id = schedule_item_id and (si.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "schedule_completions_delete" on public.schedule_completions for delete
  using (
    exists (
      select 1 from public.schedule_items si
      where si.id = schedule_item_id and (si.client_id = auth.uid() or public.is_coach())
    )
  );

-- threads
create policy "threads_select" on public.threads for select
  using (coach_id = auth.uid() or client_id = auth.uid());

-- messages
create policy "messages_select" on public.messages for select
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.coach_id = auth.uid() or t.client_id = auth.uid())
    )
  );
create policy "messages_insert" on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.coach_id = auth.uid() or t.client_id = auth.uid())
    )
  );
create policy "messages_update" on public.messages for update
  using (
    exists (
      select 1 from public.threads t
      where t.id = thread_id and (t.coach_id = auth.uid() or t.client_id = auth.uid())
    )
  );

-- bookings — coach manages, client sees only their own
create policy "bookings_select" on public.bookings for select
  using (client_id = auth.uid() or public.is_coach());
create policy "bookings_write" on public.bookings for insert
  with check (public.is_coach());
create policy "bookings_update" on public.bookings for update
  using (public.is_coach());
create policy "bookings_delete" on public.bookings for delete
  using (public.is_coach());

-- coach_notes — coach-private, never client-readable
create policy "coach_notes_all" on public.coach_notes for all
  using (public.is_coach())
  with check (public.is_coach());

-- invites — coach-only
create policy "invites_all" on public.invites for all
  using (public.is_coach())
  with check (public.is_coach());

-- push_subscriptions — each user manages their own
create policy "push_subscriptions_all" on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage buckets: run once via the Supabase dashboard or CLI —
--   check-in-photos (private) and message-attachments (private).
-- Policies below assume both buckets exist with public = false.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('check-in-photos', 'check-in-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', false)
on conflict (id) do nothing;

-- Path convention: {client_id}/{filename} — folder name is the owning client.
create policy "checkin_photos_rw" on storage.objects for all
  using (
    bucket_id = 'check-in-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  )
  with check (
    bucket_id = 'check-in-photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  );

create policy "message_attachments_rw" on storage.objects for all
  using (
    bucket_id = 'message-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  )
  with check (
    bucket_id = 'message-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_coach())
  );
