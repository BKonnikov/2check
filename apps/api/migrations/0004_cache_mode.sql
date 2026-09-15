-- PRD 16.3 — cacheMode is part of the ScanPlan and belongs in the stored record.
alter table scans add column if not exists cache_mode text not null default 'NORMAL'
  check (cache_mode in ('NORMAL', 'FORCE_REFRESH'));
