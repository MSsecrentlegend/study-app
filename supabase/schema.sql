create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    display_name text not null default 'Learner',
    is_admin boolean not null default false,
    created_at timestamptz not null default now()
);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, is_admin)
    values (
        new.id,
        coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Learner'),
        coalesce(lower(new.email) = 'mohamed.sonic369@gmail.com' and new.email_confirmed_at is not null, false)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create or replace function public.sync_platform_owner_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.profiles
    set is_admin = coalesce(
        lower(new.email) = 'mohamed.sonic369@gmail.com' and new.email_confirmed_at is not null,
        false
    )
    where id = new.id;
    return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public;
revoke all on function public.sync_platform_owner_role() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.create_profile_for_new_user();

drop trigger if exists on_auth_user_owner_role_updated on auth.users;
create trigger on_auth_user_owner_role_updated
    after update of email, email_confirmed_at on auth.users
    for each row execute procedure public.sync_platform_owner_role();

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.id = (select auth.uid())
          and p.is_admin
          and lower(u.email) = 'mohamed.sonic369@gmail.com'
          and u.email_confirmed_at is not null
    );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

update public.profiles p
set is_admin = coalesce(
    lower(u.email) = 'mohamed.sonic369@gmail.com' and u.email_confirmed_at is not null,
    false
)
from auth.users u
where u.id = p.id;

create table if not exists public.chat_messages (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    body text not null check (char_length(body) between 1 and 1000),
    created_at timestamptz not null default now()
);

create table if not exists public.videos (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 140),
    youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
    subject text not null default 'Arabic',
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.exams (
    id uuid primary key default gen_random_uuid(),
    title text not null check (char_length(title) between 1 and 180),
    description text not null default '',
    subject text not null default 'Arabic',
    due_at timestamptz,
    questions jsonb not null check (jsonb_typeof(questions) = 'array'),
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

create table if not exists public.study_files (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text not null default '',
    subject text not null default 'Arabic',
    object_path text not null unique,
    mime_type text not null,
    created_by uuid references public.profiles (id) on delete set null,
    created_at timestamptz not null default now()
);

alter table public.videos alter column subject set default 'Arabic';
alter table public.exams alter column subject set default 'Arabic';
alter table public.study_files alter column subject set default 'Arabic';

create table if not exists public.user_progress (
    user_id uuid primary key references public.profiles (id) on delete cascade,
    data jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.exam_results (
    id uuid primary key default gen_random_uuid(),
    attempt_id uuid,
    user_id uuid not null references public.profiles (id) on delete cascade,
    exam_id uuid references public.exams (id) on delete set null,
    student_name text not null,
    quiz_title text not null,
    score integer not null check (score between 0 and 100),
    correct_count integer not null check (correct_count >= 0),
    total_questions integer not null check (total_questions > 0),
    created_at timestamptz not null default now()
);
alter table public.exam_results add column if not exists attempt_id uuid;
create unique index if not exists exam_results_attempt_id_idx
    on public.exam_results (attempt_id)
    where attempt_id is not null;

alter table public.profiles enable row level security;
alter table public.chat_messages enable row level security;
alter table public.videos enable row level security;
alter table public.exams enable row level security;
alter table public.study_files enable row level security;
alter table public.user_progress enable row level security;
alter table public.exam_results enable row level security;

revoke all on public.profiles, public.chat_messages, public.videos, public.exams, public.study_files, public.user_progress, public.exam_results
    from public, anon, authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, delete on public.chat_messages to authenticated;
grant select, insert, update, delete on public.videos to authenticated;
grant select, insert, update, delete on public.exams to authenticated;
grant select, insert, update, delete on public.study_files to authenticated;
grant select, insert, update on public.user_progress to authenticated;
grant select, insert on public.exam_results to authenticated;
revoke all on storage.objects from public, anon, authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles"
    on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update their own display name" on public.profiles;
create policy "Users can update their own display name"
    on public.profiles for update to authenticated
    using (id = (select auth.uid()))
    with check (id = (select auth.uid()));

drop policy if exists "Authenticated users can read chat" on public.chat_messages;
create policy "Authenticated users can read chat"
    on public.chat_messages for select to authenticated using (true);
drop policy if exists "Users can post as themselves" on public.chat_messages;
create policy "Users can post as themselves"
    on public.chat_messages for insert to authenticated
    with check (user_id = (select auth.uid()));
drop policy if exists "Authors or admins can delete chat messages" on public.chat_messages;
create policy "Authors or admins can delete chat messages"
    on public.chat_messages for delete to authenticated
    using (user_id = (select auth.uid()) or (select public.is_platform_admin()));

drop policy if exists "Authenticated users can read videos" on public.videos;
create policy "Authenticated users can read videos"
    on public.videos for select to authenticated using (true);
drop policy if exists "Admins can manage videos" on public.videos;
drop policy if exists "Owner can manage videos" on public.videos;
create policy "Owner can manage videos"
    on public.videos for all to authenticated
    using ((select public.is_platform_admin()))
    with check ((select public.is_platform_admin()));

drop policy if exists "Authenticated users can read exams" on public.exams;
create policy "Authenticated users can read exams"
    on public.exams for select to authenticated using (true);
drop policy if exists "Admins can manage exams" on public.exams;
drop policy if exists "Owner can manage exams" on public.exams;
create policy "Owner can manage exams"
    on public.exams for all to authenticated
    using ((select public.is_platform_admin()))
    with check ((select public.is_platform_admin()));

drop policy if exists "Authenticated users can read study files" on public.study_files;
create policy "Authenticated users can read study files"
    on public.study_files for select to authenticated using (true);
drop policy if exists "Admins can manage study files" on public.study_files;
drop policy if exists "Owner can manage study files" on public.study_files;
create policy "Owner can manage study files"
    on public.study_files for all to authenticated
    using ((select public.is_platform_admin()))
    with check ((select public.is_platform_admin()));

drop policy if exists "Users can read their own progress" on public.user_progress;
create policy "Users can read their own progress"
    on public.user_progress for select to authenticated
    using (user_id = (select auth.uid()));
drop policy if exists "Users can create their own progress" on public.user_progress;
create policy "Users can create their own progress"
    on public.user_progress for insert to authenticated
    with check (user_id = (select auth.uid()));
drop policy if exists "Users can update their own progress" on public.user_progress;
create policy "Users can update their own progress"
    on public.user_progress for update to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

drop policy if exists "Users can read their own exam results" on public.exam_results;
create policy "Users can read their own exam results"
    on public.exam_results for select to authenticated
    using (user_id = (select auth.uid()));
drop policy if exists "Users can create their own exam results" on public.exam_results;
create policy "Users can create their own exam results"
    on public.exam_results for insert to authenticated
    with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public)
values ('study-resources', 'study-resources', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can read study resource objects" on storage.objects;
create policy "Authenticated users can read study resource objects"
    on storage.objects for select to authenticated
    using (bucket_id = 'study-resources');
drop policy if exists "Admins can upload study resource objects" on storage.objects;
drop policy if exists "Owner can upload study resource objects" on storage.objects;
create policy "Owner can upload study resource objects"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'study-resources' and (select public.is_platform_admin()));
drop policy if exists "Admins can delete study resource objects" on storage.objects;
drop policy if exists "Owner can delete study resource objects" on storage.objects;
create policy "Owner can delete study resource objects"
    on storage.objects for delete to authenticated
    using (bucket_id = 'study-resources' and (select public.is_platform_admin()));
drop policy if exists "Admins can update study resource objects" on storage.objects;
drop policy if exists "Owner can update study resource objects" on storage.objects;
create policy "Owner can update study resource objects"
    on storage.objects for update to authenticated
    using (bucket_id = 'study-resources' and (select public.is_platform_admin()))
    with check (bucket_id = 'study-resources' and (select public.is_platform_admin()));
