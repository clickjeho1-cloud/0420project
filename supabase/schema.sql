-- Supabase SQL Editor 에서 실행 후 Table Editor 에서 확인
-- RLS 는 과제/데모용 — 운영 시 인증·정책 재설정 필요

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  temperature double precision not null,
  humidity double precision not null
);

alter table public.sensor_readings enable row level security;

create policy "sensor_readings_select_anon"
  on public.sensor_readings for select
  to anon, authenticated
  using (true);

create policy "sensor_readings_insert_anon"
  on public.sensor_readings for insert
  to anon, authenticated
  with check (true);
