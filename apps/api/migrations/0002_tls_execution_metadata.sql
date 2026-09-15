-- PRD 19.4 — the canonical audit record of the TLS prerequisites: the selected endpoints, the
-- dependency fingerprint and the policy versions that governed them.
alter table scans add column if not exists tls_execution_metadata jsonb;
