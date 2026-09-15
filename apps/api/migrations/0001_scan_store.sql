-- PRD 19.10 and 27.4 — the storage representation is versioned and migrations are explicit.

create table if not exists storage_schema (
  version      integer     primary key,
  applied_at   timestamptz not null default now()
);

create table if not exists scans (
  scan_id                uuid        primary key,
  storage_schema_version integer     not null,
  execution_state        text        not null
    check (execution_state in ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  mode                   text        not null check (mode in ('FULL', 'PARTIAL')),
  visible_categories     text[]      not null,
  -- PRD 19.6 and AC-19.4 — originalInput is stripped before the domain is stored.
  canonical_domain       jsonb       not null,
  execution_context      jsonb       not null,
  categories             jsonb       not null default '[]'::jsonb,
  sealed_dns_candidates  jsonb,
  security_validation    jsonb,
  failure                jsonb,
  started_at             timestamptz not null,
  completed_at           timestamptz,
  -- AC-19.2 — set once the snapshot is terminal, after which the row is immutable.
  finalized              boolean     not null default false
);

create index if not exists scans_started_at_idx on scans (started_at desc);

create or replace function scans_reject_update_when_finalized()
returns trigger as $$
begin
  if old.finalized then
    raise exception 'scan % is finalized and its snapshot is immutable', old.scan_id
      using errcode = 'integrity_constraint_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists scans_immutable_snapshot on scans;

-- AC-19.2 and AC-19.3 — a terminal snapshot is never rewritten, so historical results cannot be
-- recomputed under a newer policy. Enforced by the database rather than by convention.
create trigger scans_immutable_snapshot
  before update on scans
  for each row
  execute function scans_reject_update_when_finalized();

create or replace function scans_reject_delete_when_finalized()
returns trigger as $$
begin
  if old.finalized then
    raise exception 'scan % is finalized and cannot be deleted here', old.scan_id
      using errcode = 'integrity_constraint_violation';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists scans_immutable_delete on scans;

create trigger scans_immutable_delete
  before delete on scans
  for each row
  execute function scans_reject_delete_when_finalized();
