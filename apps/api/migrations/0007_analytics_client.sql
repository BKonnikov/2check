-- PRD 28.3 — a coarse class of client, so the statistics can say who the readers came with.
--
-- These two columns hold a small closed enumeration derived on the server from the User-Agent
-- header of the request that carried the event, and the header itself is never stored. That is
-- the whole point: a raw User-Agent is a fingerprint and would sit in the same table as the
-- session id, whereas "mobile" and "chrome" are true of a third of the internet. Neither column
-- can be set by the browser: the collection schema (AC-28.3) has no field for them.
alter table analytics_events add column if not exists device_kind text;
alter table analytics_events add column if not exists browser text;
