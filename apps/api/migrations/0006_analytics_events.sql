-- PRD 28 — product analytics, kept apart from operational observability (§21, AC-28.1).
--
-- The columns are the whole privacy boundary (AC-28.3): there is nowhere here to put a domain, a
-- scanId, the string a reader typed, registration data, an IP address, a fingerprint or a DNS
-- value. session_id is an anonymous per-visit value (§28.6), not an account and not a stable
-- identifier: it is generated in the browser for one session and never linked to anything else.
create table if not exists analytics_events (
  id           bigserial primary key,
  occurred_at  timestamptz not null default now(),
  event        text        not null,
  locale       text        not null,
  tool         text        not null,
  mode         text,
  scope        text,
  outcome      text,
  verdict_code text,
  session_id   uuid,
  -- `returning` is a reserved word in Postgres, so the column carries the is_ prefix.
  is_returning boolean     not null default false
);

create index if not exists analytics_events_occurred_at on analytics_events (occurred_at);
create index if not exists analytics_events_event_day on analytics_events (event, occurred_at);
