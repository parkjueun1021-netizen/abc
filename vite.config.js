-- ==========================================
-- AI Ethics Dilemma Platform
-- Supabase Database Schema
-- ==========================================

create extension if not exists pgcrypto;

create table if not exists public.dilemmas (
  id uuid primary key default gen_random_uuid(),
  order_no integer not null unique,
  title text not null,
  scenario text not null,
  option_a text not null,
  option_b text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.responses (
  id uuid primary key default gen_random_uuid(),
  age integer not null check (age between 1 and 120),
  gender text not null check (
    gender in ('남성', '여성', '기타', '응답하지 않음')
  ),
  submitted_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.responses(id) on delete cascade,
  dilemma_id uuid not null references public.dilemmas(id),
  choice text not null check (choice in ('A', 'B')),
  reason text not null check (char_length(trim(reason)) between 1 and 3000),
  unique (response_id, dilemma_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dilemmas_updated_at on public.dilemmas;
create trigger dilemmas_updated_at
before update on public.dilemmas
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

alter table public.dilemmas enable row level security;
alter table public.responses enable row level security;
alter table public.answers enable row level security;

drop policy if exists "Read active dilemmas" on public.dilemmas;
create policy "Read active dilemmas"
on public.dilemmas for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admin manages dilemmas" on public.dilemmas;
create policy "Admin manages dilemmas"
on public.dilemmas for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admin reads responses" on public.responses;
create policy "Admin reads responses"
on public.responses for select
to authenticated
using (public.is_admin());

drop policy if exists "Admin reads answers" on public.answers;
create policy "Admin reads answers"
on public.answers for select
to authenticated
using (public.is_admin());

-- RPC is the only public submission path.
-- SECURITY DEFINER is constrained by a fixed search_path and explicit validation.
create or replace function public.submit_response(
  p_age integer,
  p_gender text,
  p_answers jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response_id uuid;
  v_item jsonb;
  v_count integer;
  v_active_count integer;
begin
  if p_age is null or p_age < 1 or p_age > 120 then
    raise exception 'Invalid age';
  end if;

  if p_gender is null or p_gender not in (
    '남성', '여성', '기타', '응답하지 않음'
  ) then
    raise exception 'Invalid gender';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select count(*) into v_count
  from jsonb_array_elements(p_answers);

  select count(*) into v_active_count
  from public.dilemmas
  where is_active = true;

  if v_count <> 3 or v_active_count <> 3 then
    raise exception 'Exactly 3 active dilemmas are required';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) a
    where coalesce(a->>'choice', '') not in ('A', 'B')
       or nullif(trim(coalesce(a->>'reason', '')), '') is null
       or char_length(coalesce(a->>'reason', '')) > 3000
       or coalesce(a->>'dilemma_id', '') = ''
  ) then
    raise exception 'Invalid answer data';
  end if;

  if (
    select count(distinct a->>'dilemma_id')
    from jsonb_array_elements(p_answers) a
  ) <> 3 then
    raise exception 'Duplicate dilemma answers';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_answers) a
    left join public.dilemmas d
      on d.id = (a->>'dilemma_id')::uuid
     and d.is_active = true
    where d.id is null
  ) then
    raise exception 'Invalid or inactive dilemma';
  end if;

  insert into public.responses (age, gender)
  values (p_age, p_gender)
  returning id into v_response_id;

  for v_item in select value from jsonb_array_elements(p_answers)
  loop
    insert into public.answers (
      response_id, dilemma_id, choice, reason
    )
    values (
      v_response_id,
      (v_item->>'dilemma_id')::uuid,
      v_item->>'choice',
      trim(v_item->>'reason')
    );
  end loop;

  return v_response_id;
end;
$$;

revoke all on function public.submit_response(integer, text, jsonb) from public;
grant execute on function public.submit_response(integer, text, jsonb)
to anon, authenticated;

grant select on public.dilemmas to anon, authenticated;
grant select on public.responses to authenticated;
grant select on public.answers to authenticated;
grant insert, update, delete on public.dilemmas to authenticated;

insert into public.dilemmas
(order_no, title, scenario, option_a, option_b)
values
(
  1,
  '자율주행 자동차의 선택',
  '자율주행 자동차가 사고를 피할 수 없는 상황이다. 직진하면 보행자 여러 명이 위험하고, 방향을 틀면 탑승자가 위험해진다.',
  '보행자 피해를 최소화하는 방향으로 주행한다.',
  '탑승자의 안전을 최우선으로 주행한다.'
),
(
  2,
  'AI 채용 시스템의 공정성',
  '기업이 AI를 활용해 지원자를 평가하고 있다. AI는 과거 채용 데이터를 학습했으며 특정 집단에 불리한 평가 경향이 발견되었다.',
  '평가 결과의 일관성을 위해 AI 시스템을 계속 사용한다.',
  '차별 가능성이 해소될 때까지 AI 평가 사용을 중단한다.'
),
(
  3,
  'AI 생성 콘텐츠의 공개',
  'AI로 실제 인물과 매우 유사한 영상이 만들어졌다. 영상은 허구의 상황을 표현하지만 별도의 표시가 없다면 실제 영상으로 오해할 수 있다.',
  '창작의 자유를 존중해 별도 표시 없이 공개한다.',
  'AI 생성 콘텐츠임을 명확히 표시한 후 공개한다.'
)
on conflict (order_no) do nothing;
