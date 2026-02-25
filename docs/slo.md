# Sentinel WatchTower SLO (Internal)

## Scope
Non-mobile platform scope only.

## Service Level Objectives
- Ingestion latency: `P95 telemetry_latency_ms <= 1000ms`
- Dashboard render latency: `P95 dashboard_render_ms <= 1200ms`
- Availability: `>= 99.9%` monthly uptime

## Measurement Sources
- `public.latency_metrics`
  - `telemetry_latency_ms`
  - `alert_propagation_ms`
  - `dashboard_render_ms`
- `GET /health` for service + DB health checks

## Evaluation Windows
- Operational: 1 minute, 5 minutes, 1 hour (rolling)
- Compliance/reporting: daily and monthly aggregates

## Initial Error Budget
- Monthly downtime budget at 99.9%: 43m 49s

## Alerting Guidance (Initial)
- Trigger warning if `P95 telemetry_latency_ms > 1000ms` for 5 consecutive minutes.
- Trigger warning if `P95 dashboard_render_ms > 1200ms` for 5 consecutive minutes.
- Trigger critical if `/health` fails for 3 consecutive checks.

