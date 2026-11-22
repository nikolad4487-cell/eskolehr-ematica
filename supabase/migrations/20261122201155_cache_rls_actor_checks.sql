-- Evaluate statement-constant actor checks once, retaining each policy's
-- command, role, permissive/restrictive mode, row predicates and WITH CHECK.
DO $migration$
DECLARE r record; q text; c text; f text;
BEGIN
 FOR r IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename IN ('user_profiles','user_school_roles','classes','registry_students','school_years','student_class_enrollments')
  AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(expert_actor|registrar_is_user|registry_scoped_actor|portal_profile_id|registry_global_admin)\(\)'
 LOOP
  q:=r.qual; c:=r.with_check;
  FOREACH f IN ARRAY ARRAY['expert_actor','registrar_is_user','registry_scoped_actor','portal_profile_id','registry_global_admin'] LOOP
   q:=regexp_replace(q, '(?<![[:alnum:]_.])'||f||'\(\)', '(SELECT public.'||f||'())','g');
   c:=regexp_replace(c, '(?<![[:alnum:]_.])'||f||'\(\)', '(SELECT public.'||f||'())','g');
  END LOOP;
  IF q IS DISTINCT FROM r.qual OR c IS DISTINCT FROM r.with_check THEN
   EXECUTE format('ALTER POLICY %I ON %I.%I%s%s',r.policyname,r.schemaname,r.tablename,
    CASE WHEN q IS NULL THEN '' ELSE ' USING ('||q||')' END,
    CASE WHEN c IS NULL THEN '' ELSE ' WITH CHECK ('||c||')' END);
  END IF;
 END LOOP;
END $migration$;
