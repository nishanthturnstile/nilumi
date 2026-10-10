-- This schema belongs only in the dedicated disposable s5_smoke database.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 's5_app') THEN
    CREATE ROLE s5_app LOGIN NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;
ALTER ROLE s5_app LOGIN NOSUPERUSER NOBYPASSRLS;
CREATE SCHEMA IF NOT EXISTS s5;
GRANT USAGE ON SCHEMA s5 TO s5_app;
CREATE TABLE IF NOT EXISTS s5.members (
  household_id text NOT NULL,
  id text NOT NULL,
  PRIMARY KEY (household_id, id)
);
CREATE TABLE IF NOT EXISTS s5.records (
  household_id text NOT NULL,
  id text NOT NULL,
  owner_id text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('private', 'shared', 'household')),
  body text NOT NULL,
  PRIMARY KEY (household_id, id),
  FOREIGN KEY (household_id, owner_id) REFERENCES s5.members(household_id, id)
);
ALTER TABLE s5.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE s5.records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS member_scope ON s5.records;
CREATE POLICY member_scope ON s5.records TO s5_app
  USING (household_id = current_setting('s5.household', true)
    AND (owner_id = current_setting('s5.member', true) OR visibility IN ('shared', 'household')))
  WITH CHECK (household_id = current_setting('s5.household', true)
    AND owner_id = current_setting('s5.member', true));
GRANT SELECT, INSERT ON s5.records TO s5_app;
CREATE TABLE IF NOT EXISTS s5.occurrences (
  household_id text NOT NULL DEFAULT 'h1',
  owner_id text NOT NULL DEFAULT 'adult1',
  id text PRIMARY KEY,
  revision integer NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scenario text NOT NULL,
  UNIQUE (household_id, id),
  FOREIGN KEY (household_id, owner_id) REFERENCES s5.members(household_id, id)
);
CREATE TABLE IF NOT EXISTS s5.deliveries (
  household_id text NOT NULL DEFAULT 'h1',
  occurrence_id text PRIMARY KEY,
  revision integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (household_id, occurrence_id) REFERENCES s5.occurrences(household_id, id)
);
CREATE TABLE IF NOT EXISTS s5.forget_tombstones (
  household_id text NOT NULL,
  record_id text NOT NULL,
  journaled_at timestamptz,
  PRIMARY KEY (household_id, record_id)
);
-- Synthetic values are fixed and safe to reset inside this disposable database.
TRUNCATE s5.deliveries, s5.occurrences, s5.forget_tombstones, s5.records, s5.members;
INSERT INTO s5.members VALUES ('h1','adult1'), ('h1','adult2'), ('h2','adult3');
INSERT INTO s5.records VALUES
 ('h1','private1','adult1','private','synthetic-private-a'),
 ('h1','private2','adult2','private','synthetic-private-b'),
 ('h1','shared1','adult2','shared','synthetic-shared'),
 ('h1','household1','adult1','household','synthetic-household'),
 ('h2','other1','adult3','household','synthetic-other-household');
