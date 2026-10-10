-- Apply explicitly with a migration-owner connection, never during a request.
-- Additive schema only; no existing database tables/volumes are removed.
CREATE SCHEMA IF NOT EXISTS gateway_pilot;
CREATE TABLE IF NOT EXISTS gateway_pilot.household (
  id text PRIMARY KEY CHECK (id = 'founding'),
  owner_email text NOT NULL,
  adults jsonb NOT NULL CHECK (jsonb_typeof(adults) = 'array' AND jsonb_array_length(adults) = 2),
  notice_version text NOT NULL,
  processors jsonb NOT NULL,
  acknowledgement jsonb,
  vetoes jsonb NOT NULL DEFAULT '[]',
  evidence_version text,
  monthly_cap_micros bigint NOT NULL DEFAULT 8000000 CHECK (monthly_cap_micros BETWEEN 1 AND 8000000),
  revision bigint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gateway_pilot.reservation (
  id uuid PRIMARY KEY,
  household_id text NOT NULL REFERENCES gateway_pilot.household(id),
  actor_email text NOT NULL,
  role text NOT NULL CHECK (role IN ('nlu','answer','embed')),
  period text NOT NULL,
  revision bigint NOT NULL,
  allowance bigint NOT NULL CHECK (allowance > 0),
  charged bigint NOT NULL CHECK (charged >= 0),
  state text NOT NULL CHECK (state IN ('reserved','dispatched','settled','blocked','unknown')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gateway_reservation_period ON gateway_pilot.reservation(household_id,period);
CREATE TABLE IF NOT EXISTS gateway_pilot.halt (
  household_id text NOT NULL REFERENCES gateway_pilot.household(id),
  role text NOT NULL CHECK (role IN ('nlu','answer','embed')),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id,role)
);
CREATE TABLE IF NOT EXISTS gateway_pilot.privacy_event (
  id uuid PRIMARY KEY,
  household_id text NOT NULL REFERENCES gateway_pilot.household(id),
  actor_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('acknowledge','withdraw','release-veto')),
  notice_version text NOT NULL,
  revision bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Provision a restricted app/worker login with USAGE on gateway_pilot and
-- SELECT on these tables, INSERT on reservation/halt/privacy_event, UPDATE
-- on reservation, and UPDATE(acknowledgement,vetoes,notice_version,processors,
-- revision,updated_at) on household. Keep evidence/cap/membership changes
-- migration-owner-only. Do not grant schema creation,
-- DROP, role administration, superuser or access to other application schemas.
