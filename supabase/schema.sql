-- Supabase SQL Editor 에서 실행
-- 데모용 RLS 정책입니다. 운영 배포 시에는 인증/권한 정책을 다시 설계하세요.

create table if not exists public.sensor_readings (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  temperature double precision not null,
  humidity double precision not null
);

alter table public.sensor_readings enable row level security;

drop policy if exists "sensor_readings_select_anon" on public.sensor_readings;
drop policy if exists "sensor_readings_insert_anon" on public.sensor_readings;

create policy "sensor_readings_select_anon"
  on public.sensor_readings for select
  to anon, authenticated
  using (true);

create policy "sensor_readings_insert_anon"
  on public.sensor_readings for insert
  to anon, authenticated
  with check (true);
