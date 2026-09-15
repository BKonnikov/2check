-- PRD 19.3 — a completed snapshot keeps enough normalized data to restore Issues, Summary and
-- the score breakdown, so a historical result never needs recomputing under a newer policy.
alter table scans add column if not exists summary jsonb;
