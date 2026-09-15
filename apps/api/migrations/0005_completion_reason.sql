-- PRD 16.7 — a scan cut short by the overall deadline is COMPLETED with a reason, not FAILED.
alter table scans add column if not exists completion_reason text;
