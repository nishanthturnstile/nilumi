-- Install only after owner-run Graphile migrations in the disposable database.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 's5_worker') THEN
    CREATE ROLE s5_worker LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
GRANT USAGE ON SCHEMA s5, graphile_worker TO s5_worker;
GRANT SELECT, UPDATE ON s5.occurrences TO s5_worker;
GRANT SELECT, INSERT ON s5.deliveries TO s5_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO s5_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA graphile_worker TO s5_worker;
-- Graphile enables RLS on its private tables. Grants alone do not allow polling.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='graphile_worker' AND c.relkind='r' AND c.relrowsecurity LOOP
    EXECUTE format('DROP POLICY IF EXISTS s5_worker_runtime ON graphile_worker.%I',t.relname);
    EXECUTE format('CREATE POLICY s5_worker_runtime ON graphile_worker.%I TO s5_worker USING (true) WITH CHECK (true)',t.relname);
  END LOOP;
END $$;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO s5_worker;
CREATE OR REPLACE FUNCTION s5.schedule_occurrence(p_id text, p_revision integer,
  p_due timestamptz, p_scenario text, p_status text DEFAULT 'scheduled')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
DECLARE h text := current_setting('s5.household', true);
        m text := current_setting('s5.member', true);
BEGIN
  IF h IS NULL OR m IS NULL OR p_revision < 1 OR p_id IS NULL
    OR p_due IS NULL OR p_scenario IS NULL OR p_status NOT IN ('scheduled','cancelled')
    OR NOT EXISTS (SELECT FROM s5.members WHERE household_id=h AND id=m) THEN
    RAISE EXCEPTION 'invalid_synthetic_schedule' USING ERRCODE='42501';
  END IF;
  INSERT INTO s5.occurrences(household_id,owner_id,id,revision,due_at,scenario,status)
    VALUES(h,m,p_id,p_revision,p_due,p_scenario,p_status)
    ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,due_at=excluded.due_at,
      scenario=excluded.scenario,status=excluded.status
    WHERE s5.occurrences.household_id=h AND s5.occurrences.owner_id=m
      AND s5.occurrences.revision<=excluded.revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_synthetic_schedule' USING ERRCODE='42501';
  END IF;
  PERFORM graphile_worker.add_job('s5_dispatch',
    json_build_object('id',p_id,'revision',p_revision),run_at:=p_due,
    job_key:='s5:'||p_id||':'||p_revision,max_attempts:=3);
END $$;
REVOKE ALL ON FUNCTION s5.schedule_occurrence(text,integer,timestamptz,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION s5.schedule_occurrence(text,integer,timestamptz,text,text) TO s5_app;
