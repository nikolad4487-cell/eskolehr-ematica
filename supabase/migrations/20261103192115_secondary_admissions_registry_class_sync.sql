-- Final admission confirmation -> target-school registry -> selected e-Dnevnik class.
-- Ranking alone is not an enrollment. Existing accounts and historical classes survive.
begin;
create schema if not exists admission_sync_private;
revoke all on schema admission_sync_private from public, anon, authenticated;

create or replace function admission_sync_private.year_key(value text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(coalesce(value,''), '[^0-9]', '', 'g')
$$;
revoke all on function admission_sync_private.year_key(text) from public;

alter table public.student_school_enrollments
  add column if not exists admission_candidate_id uuid references public.admission_candidates(id),
  add column if not exists admission_choice_id uuid references public.admission_choices(id);
create unique index if not exists school_enrollment_admission_candidate_unique
  on public.student_school_enrollments(admission_candidate_id) where admission_candidate_id is not null;
create index if not exists school_enrollment_class_import_lookup
  on public.student_school_enrollments(school_id,school_year_id,program_id,student_id) where status='ACTIVE';

create or replace function public.enroll_accepted_admission_candidates(
  p_track public.admissions_track, p_school_year_id uuid default null, p_target_school_id text default null
) returns table(registry_student_id uuid,school_enrollment_id uuid,result text)
language plpgsql security definer set search_path = '' as $$
declare
  accepted record; v_year public.school_years; v_target_year uuid; v_matches int;
  v_existing public.student_school_enrollments; v_source_year text;
begin
  perform public.registry_require_non_registrar();
  if auth.uid() is null or not coalesce(case when p_target_school_id is null
    then public.registry_global_admin() else public.registry_admin(p_target_school_id) end,false) then
    raise exception 'Nemate ovlasti za provedbu upisa u odabranu školu.';
  end if;
  if p_track='SECONDARY' and p_school_year_id is null then
    raise exception 'Odaberite školsku godinu upisa u prvi razred srednje škole.';
  end if;
  if p_school_year_id is not null then
    select * into v_year from public.school_years where id=p_school_year_id;
    if v_year.id is null then raise exception 'Odabrana školska godina ne postoji.'; end if;
  end if;
  for accepted in
    select cand.id candidate_id,cand.registry_student_id,cand.school_year_id,cand.source_class_id,
      ch.id choice_id,ch.target_school_id,ch.target_program_id
    from public.admission_candidates cand
    join public.admission_choices ch on ch.id=cand.accepted_choice_id and ch.candidate_id=cand.id
    where cand.track=p_track and cand.status='ACCEPTED' and ch.is_accepted
      and (p_target_school_id is null or ch.target_school_id=p_target_school_id)
    order by cand.id for update of cand
  loop
    registry_student_id:=accepted.registry_student_id;
    school_enrollment_id:=null;
    begin
      if not public.registry_admin(accepted.target_school_id) then raise exception 'Nemate ovlasti za ciljnu školu.'; end if;
      -- Serialize all imports for one person, including requests from separate sessions.
      perform id from public.registry_students where id=accepted.registry_student_id for update;
      if not exists(select 1 from public.programs where id=accepted.target_program_id
        and school_id=accepted.target_school_id and is_active and admission_track=p_track) then
        raise exception 'Odabrani program nije aktivan program ciljne škole.';
      end if;
      if p_school_year_id is null then
        select * into v_year from public.school_years where id=accepted.school_year_id;
      end if;
      if v_year.id is null then raise exception 'Odaberite godinu upisa.'; end if;
      -- Each school has its own school_years UUID; never copy the primary school's UUID.
      select count(*),(array_agg(y.id))[1] into v_matches,v_target_year
      from public.school_years y where y.school_id=accepted.target_school_id
        and admission_sync_private.year_key(y.name)=admission_sync_private.year_key(v_year.name);
      if v_matches<>1 then raise exception 'Ciljna škola mora imati jednu školsku godinu %.',v_year.name; end if;
      if exists(select 1 from public.school_years where id=v_target_year and
        (workflow_closed_at is not null or upper(coalesce(status,'')) in ('CLOSED','LOCKED','ARCHIVED'))) then
        raise exception 'Ciljna školska godina je zaključana.';
      end if;
      if p_track='SECONDARY' then
        select admission_sync_private.year_key(c.school_year) into v_source_year
          from public.classes c where c.id=accepted.source_class_id;
        if v_source_year is null then
          select admission_sync_private.year_key(y.name) into v_source_year
            from public.school_years y where y.id=accepted.school_year_id;
        end if;
        if length(v_source_year)<>8 or length(admission_sync_private.year_key(v_year.name))<>8
          or v_source_year is null then raise exception 'Nije moguće utvrditi godinu završetka osnovne škole.'; end if;
        if left(v_source_year,4)::int+1<>left(admission_sync_private.year_key(v_year.name),4)::int then
          raise exception 'Godina prvog razreda mora slijediti godinu završetka osnovne škole.';
        end if;
      end if;
      select * into v_existing from public.student_school_enrollments e where e.admission_candidate_id=accepted.candidate_id;
      if v_existing.id is not null and (v_existing.school_id<>accepted.target_school_id
        or v_existing.school_year_id<>v_target_year or v_existing.program_id is distinct from accepted.target_program_id
        or v_existing.status<>'ACTIVE') then
        raise exception 'Konačni upis već postoji. Promjenu provedite kroz postupak prijelaza u e-Matici.';
      end if;
      if v_existing.id is null then
        if exists(select 1 from public.student_school_enrollments e join public.school_years y on y.id=e.school_year_id
          where e.student_id=accepted.registry_student_id and e.status='ACTIVE'
          and admission_sync_private.year_key(y.name)=admission_sync_private.year_key(v_year.name)
          and (e.school_id<>accepted.target_school_id or e.program_id is distinct from accepted.target_program_id)) then
          raise exception 'Učenik već ima drugi aktivan upis za odabranu godinu. Provjerite e-Maticu.';
        end if;
        select count(*),(array_agg(e.id))[1] into v_matches,school_enrollment_id
          from public.student_school_enrollments e where e.student_id=accepted.registry_student_id
          and e.school_id=accepted.target_school_id and e.school_year_id=v_target_year
          and e.program_id=accepted.target_program_id and e.status='ACTIVE';
        if v_matches>1 then raise exception 'Postoje višestruki upisi u e-Matici. Najprije ih uskladite.'; end if;
        if school_enrollment_id is null then
          insert into public.student_school_enrollments(student_id,school_id,school_year_id,program_id,status,
            admission_candidate_id,admission_choice_id)
          values(accepted.registry_student_id,accepted.target_school_id,v_target_year,accepted.target_program_id,
            'ACTIVE',accepted.candidate_id,accepted.choice_id) returning id into school_enrollment_id;
          result:='ENROLLED';
        else
          if exists(select 1 from public.student_school_enrollments where id=school_enrollment_id
            and admission_candidate_id is not null and admission_candidate_id<>accepted.candidate_id) then
            raise exception 'Postojeći konačni upis vezan je uz drugu kandidaturu.';
          end if;
          update public.student_school_enrollments set admission_candidate_id=accepted.candidate_id,
            admission_choice_id=accepted.choice_id where id=school_enrollment_id;
          result:='EXISTS';
        end if;
      else school_enrollment_id:=v_existing.id; result:='EXISTS';
      end if;
      update public.registry_students set status='ACTIVE',updated_at=now() where id=accepted.registry_student_id;
    exception when others then
      school_enrollment_id:=null; result:='ERROR: '||sqlerrm;
    end;
    return next;
  end loop;
end $$;

create or replace function public.sync_registry_student_to_ednevnik_class(
  p_registry_student_id uuid,p_class_id text,p_school_enrollment_id uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.classes; r public.registry_students; e public.student_school_enrollments;
  v_id uuid; v_matches int; v_existing public.student_class_enrollments;
begin
  perform public.registry_require_non_registrar();
  select * into c from public.classes where id=p_class_id for share;
  if auth.uid() is null or c.id is null or not coalesce(public.registry_admin(c.school_id),false) then
    raise exception 'Nemate ovlasti za odabrani razred.';
  end if;
  if c.is_locked or not c.is_active or upper(coalesce(c.status,'ACTIVE'))<>'ACTIVE' or exists(
    select 1 from public.school_years y where y.id=c.school_year_id and
      (y.workflow_closed_at is not null or upper(coalesce(y.status,'')) in ('CLOSED','LOCKED','ARCHIVED'))) then
    raise exception 'Razred ili školska godina nisu otvoreni za upis.';
  end if;
  if not exists(select 1 from public.school_years y where y.id=c.school_year_id and y.school_id=c.school_id) then
    raise exception 'Razred mora imati školsku godinu svoje škole.';
  end if;
  select * into r from public.registry_students where id=p_registry_student_id for update;
  if r.id is null or r.status<>'ACTIVE' or r.ednevnik_data_entry_blocked then
    raise exception 'Učenik nije aktivan u e-Matici.';
  end if;
  if r.ednevnik_student_id is null or not exists(select 1 from public.user_profiles where id=r.ednevnik_student_id) then
    raise exception 'Najprije povežite učenika s postojećim računom e-Dnevnika u e-Matici.';
  end if;
  select count(*),(array_agg(s.id))[1] into v_matches,v_id from public.student_school_enrollments s
    where s.student_id=r.id and s.school_id=c.school_id and s.school_year_id=c.school_year_id
    and s.program_id is not distinct from c.program_id and s.status='ACTIVE'
    and (p_school_enrollment_id is null or s.id=p_school_enrollment_id);
  if v_matches<>1 then raise exception 'Potreban je jednoznačan aktivan upis u e-Matici za istu školu, program i godinu.'; end if;
  select * into e from public.student_school_enrollments where id=v_id for update;
  if e.admission_candidate_id is not null and exists(select 1 from public.admission_candidates
    where id=e.admission_candidate_id and track='SECONDARY') and c.grade_level<>1 then
    raise exception 'Učenik upisan preko srednjih upisa mora se rasporediti u prvi razred.';
  end if;
  if exists(select 1 from public.student_class_enrollments x join public.classes other on other.id=x.class_id
    where x.student_id=r.ednevnik_student_id and x.class_id<>c.id and x.status='ACTIVE'
    and admission_sync_private.year_key(other.school_year)=admission_sync_private.year_key(c.school_year)
    and (other.school_id=c.school_id or other.program_id is not distinct from c.program_id)) then
    raise exception 'Učenik već ima drugi aktivan razred za istu godinu. Koristite postupak premještaja.';
  end if;
  select * into v_existing from public.student_class_enrollments where student_id=r.ednevnik_student_id
    and class_id=c.id and school_year=c.school_year for update;
  if v_existing.id is not null and (v_existing.status<>'ACTIVE' or v_existing.ematica_status<>'ACTIVE') then
    raise exception 'Postojeći upis nije aktivan. Najprije provjerite njegov status u e-Matici.';
  end if;
  insert into public.student_class_enrollments(student_id,class_id,school_year,school_year_id,program_id,status,
    registry_student_id,source_school_enrollment_id,school_enrollment_id,ematica_status,ednevnik_data_entry_blocked)
  values(r.ednevnik_student_id,c.id,c.school_year,c.school_year_id,c.program_id,'ACTIVE',r.id,e.id,e.id,'ACTIVE',false)
  on conflict(student_id,class_id,school_year) do update set
    registry_student_id=excluded.registry_student_id,source_school_enrollment_id=excluded.source_school_enrollment_id,
    school_enrollment_id=excluded.school_enrollment_id,school_year_id=excluded.school_year_id,
    program_id=excluded.program_id,updated_at=now()
  returning id into v_id;
  insert into public.user_school_roles(user_id,school_id,role,status)
    values(r.ednevnik_student_id,c.school_id,'STUDENT','ACTIVE')
    on conflict(user_id,school_id,role) do update set status='ACTIVE';
  -- Memberships are authoritative across schools. Do not rewrite the shared
  -- primary-school profile or its account/default-school settings.
  -- Regular subjects only; elective subjects and language choices remain explicit.
  insert into public.student_subject_enrollments(student_id,subject_id,class_id,status,school_year)
    select r.ednevnik_student_id,cs.subject_id,c.id,'ACTIVE',c.school_year from public.class_subjects cs
    where cs.class_id=c.id and cs.subject_type in ('REDOVNI','REQUIRED') and not cs.is_foreign_language
    and not exists(select 1 from public.student_subject_enrollments se
      where se.student_id=r.ednevnik_student_id and se.class_id=c.id and se.subject_id=cs.subject_id)
    on conflict do nothing;
  update public.registry_students set ednevnik_synced_at=now(),updated_at=now() where id=r.id;
  if v_existing.id is null or v_existing.source_school_enrollment_id is distinct from e.id then
    insert into public.ednevnik_sync_logs(student_id,school_enrollment_id,class_enrollment_id,ednevnik_student_id,
      action,status,message,payload)
    values(r.id,e.id,v_id,r.ednevnik_student_id,'UPDATE_STUDENT','SUCCESS',
      'Učenik je povučen iz e-Matice svoje škole u razred e-Dnevnika.',jsonb_build_object('class_id',c.id,'school_id',c.school_id));
  end if;
  return v_id;
end $$;

create or replace function public.list_ematica_students_for_class(p_class_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.classes; v_result jsonb;
begin
  perform public.registry_require_non_registrar();
  select * into c from public.classes where id=p_class_id;
  if auth.uid() is null or c.id is null or not coalesce(public.registry_admin(c.school_id),false) then
    raise exception 'Nemate ovlasti za odabrani razred.';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('school_enrollment_id',e.id,'registry_student_id',r.id,
    'full_name',concat_ws(' ',r.first_name,r.last_name),'program_name',p.name,
    'from_admissions',e.admission_candidate_id is not null,
    'issue',case when r.ednevnik_student_id is null or not exists(select 1 from public.user_profiles where id=r.ednevnik_student_id)
      then 'Nedostaje poveznica s računom e-Dnevnika.'
      when exists(select 1 from public.student_class_enrollments x join public.classes xc on xc.id=x.class_id
        where x.student_id=r.ednevnik_student_id and x.status='ACTIVE'
        and admission_sync_private.year_key(xc.school_year)=admission_sync_private.year_key(c.school_year)
        and (xc.school_id=c.school_id or xc.program_id is not distinct from c.program_id)) then 'Učenik je već raspoređen u razred.'
      when r.ednevnik_data_entry_blocked then 'Unos učenika je blokiran.' else null end
    ) order by r.last_name,r.first_name),'[]'::jsonb) into v_result
  from public.student_school_enrollments e join public.registry_students r on r.id=e.student_id
  left join public.programs p on p.id=e.program_id
  where e.school_id=c.school_id and e.school_year_id=c.school_year_id and e.program_id is not distinct from c.program_id
    and e.status='ACTIVE' and r.status='ACTIVE'
    and (c.grade_level=1 or not exists(select 1 from public.admission_candidates cand
      where cand.id=e.admission_candidate_id and cand.track='SECONDARY'));
  return v_result;
end $$;

create or replace function public.import_ematica_students_to_class(p_class_id text,p_school_enrollment_ids uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare e public.student_school_enrollments; c public.classes; v_id uuid; v_result jsonb:='[]'; v_count int;
begin
  perform public.registry_require_non_registrar();
  select * into c from public.classes where id=p_class_id;
  if auth.uid() is null or c.id is null or not coalesce(public.registry_admin(c.school_id),false) then
    raise exception 'Nemate ovlasti za odabrani razred.';
  end if;
  select count(distinct value) into v_count from unnest(p_school_enrollment_ids) value;
  if coalesce(cardinality(p_school_enrollment_ids),0) not between 1 and 100
    or v_count<>cardinality(p_school_enrollment_ids) then raise exception 'Odaberite 1 do 100 različitih učenika.'; end if;
  if (select count(*) from public.student_school_enrollments where id=any(p_school_enrollment_ids)
    and school_id=c.school_id)<>v_count then raise exception 'Upisi nisu iz odabrane škole.'; end if;
  for e in select * from public.student_school_enrollments where id=any(p_school_enrollment_ids) order by student_id loop
    v_id:=public.sync_registry_student_to_ednevnik_class(e.student_id,c.id,e.id);
    v_result:=v_result||jsonb_build_array(jsonb_build_object('school_enrollment_id',e.id,'class_enrollment_id',v_id));
  end loop;
  return v_result;
end $$;

revoke all on function public.enroll_accepted_admission_candidates(public.admissions_track,uuid,text),
  public.sync_registry_student_to_ednevnik_class(uuid,text,uuid),public.list_ematica_students_for_class(text),
  public.import_ematica_students_to_class(text,uuid[]) from public,anon;
grant execute on function public.enroll_accepted_admission_candidates(public.admissions_track,uuid,text),
  public.sync_registry_student_to_ednevnik_class(uuid,text,uuid),public.list_ematica_students_for_class(text),
  public.import_ematica_students_to_class(text,uuid[]) to authenticated;
CREATE OR REPLACE FUNCTION public.registry_write_scope_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE j jsonb:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;old_j jsonb;school text;old_school text;student uuid;
BEGIN
 IF registrar_is_user() THEN RAISE EXCEPTION 'Matične zapise mijenjaju ovlašteni korisnici e-Matice.';END IF;
 IF NOT registry_scoped_actor() THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 IF TG_OP IN ('UPDATE','DELETE') THEN old_j:=to_jsonb(OLD);END IF;
 IF TG_TABLE_NAME='registry_students' THEN
  IF TG_OP IN ('UPDATE','DELETE') AND NOT registry_student_visible(OLD.id) THEN RAISE EXCEPTION 'Matični zapis učenika nije dostupan vašoj ustanovi.';END IF;
  IF TG_OP='INSERT' THEN NEW.created_by:=auth.uid();END IF;IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
 END IF;
 school:=CASE WHEN TG_TABLE_NAME IN ('student_class_enrollments','grades','final_grades','enrollment_final_grades','special_exams') THEN portal_class_school(j->>'class_id') WHEN TG_TABLE_NAME='schools' THEN j->>'id' ELSE j->>'school_id' END;
 old_school:=CASE WHEN TG_TABLE_NAME IN ('student_class_enrollments','grades','final_grades','enrollment_final_grades','special_exams') THEN portal_class_school(old_j->>'class_id') WHEN TG_TABLE_NAME='schools' THEN old_j->>'id' ELSE old_j->>'school_id' END;
 IF school IS NULL OR NOT registry_admin(school) OR (TG_OP IN ('UPDATE','DELETE') AND old_school IS NOT NULL AND NOT registry_admin(old_school)) THEN RAISE EXCEPTION 'Zapis ne pripada ustanovi za koju imate ovlasti.';END IF;
 student:=nullif(j->>'registry_student_id','')::uuid;
 IF TG_TABLE_NAME='student_school_enrollments' THEN student:=nullif(j->>'student_id','')::uuid;END IF;
 IF student IS NOT NULL AND NOT registry_student_visible(student) THEN
  -- A receiving school cannot see the primary-school registry record yet.
  -- Permit only the first school enrollment backed by its accepted admission choice.
  IF NOT (TG_TABLE_NAME='student_school_enrollments' AND TG_OP='INSERT' AND EXISTS (
    SELECT 1 FROM public.admission_candidates cand
    JOIN public.admission_choices ch ON ch.id=cand.accepted_choice_id AND ch.candidate_id=cand.id
    WHERE cand.id::text=j->>'admission_candidate_id' AND cand.registry_student_id=student
      AND cand.status='ACCEPTED' AND ch.is_accepted
      AND ch.id::text=j->>'admission_choice_id'
      AND ch.target_school_id=school AND ch.target_program_id::text=j->>'program_id'
  )) THEN RAISE EXCEPTION 'Učenik nije dostupan za ovu promjenu.';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;
END $function$;

notify pgrst,'reload schema';
commit;
