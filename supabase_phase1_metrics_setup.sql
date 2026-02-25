-- Phase 1 metrics setup for Sentinel WatchTower
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  device_id text not null,
  source text not null default 'device',
  lat double precision not null,
  lng double precision not null,
  payload jsonb not null default '{}'::jsonb,
  client_sent_at timestamptz,
  server_ingested_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.latency_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null
    check (metric_type in ('telemetry_latency_ms', 'alert_propagation_ms', 'dashboard_render_ms')),
  value_ms double precision not null check (value_ms >= 0),
  event_id text,
  source text not null default 'web-dashboard',
  client_sent_at timestamptz,
  client_received_at timestamptz,
  server_recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_latency_metrics_metric_time
  on public.latency_metrics (metric_type, server_recorded_at desc);

create index if not exists idx_telemetry_events_ingested_at
  on public.telemetry_events (server_ingested_at desc);

alter table public.telemetry_events enable row level security;
alter table public.latency_metrics enable row level security;

drop policy if exists telemetry_events_select_reviewer on public.telemetry_events;
drop policy if exists telemetry_events_insert_authenticated on public.telemetry_events;
drop policy if exists latency_metrics_select_reviewer on public.latency_metrics;
drop policy if exists latency_metrics_insert_authenticated on public.latency_metrics;

create policy telemetry_events_select_reviewer
  on public.telemetry_events
  for select
  using (public.is_reviewer(auth.uid()));

create policy telemetry_events_insert_authenticated
  on public.telemetry_events
  for insert
  with check (auth.uid() is not null);

create policy latency_metrics_select_reviewer
  on public.latency_metrics
  for select
  using (public.is_reviewer(auth.uid()));

create policy latency_metrics_insert_authenticated
  on public.latency_metrics
  for insert
  with check (auth.uid() is not null);

grant select, insert on public.telemetry_events to authenticated;
grant select, insert on public.latency_metrics to authenticated;

-- Rolling averages by window (all metric types combined for ops dashboard).
create or replace view public.latency_summary as
select '1m'::text as window,
       avg(value_ms) as avg_latency_ms,
       percentile_cont(0.95) within group (order by value_ms) as p95_latency_ms,
       count(*)::bigint as sample_count
from public.latency_metrics
where server_recorded_at >= now() - interval '1 minute'
union all
select '5m'::text as window,
       avg(value_ms) as avg_latency_ms,
       percentile_cont(0.95) within group (order by value_ms) as p95_latency_ms,
       count(*)::bigint as sample_count
from public.latency_metrics
where server_recorded_at >= now() - interval '5 minutes'
union all
select '1h'::text as window,
       avg(value_ms) as avg_latency_ms,
       percentile_cont(0.95) within group (order by value_ms) as p95_latency_ms,
       count(*)::bigint as sample_count
from public.latency_metrics
where server_recorded_at >= now() - interval '1 hour';

