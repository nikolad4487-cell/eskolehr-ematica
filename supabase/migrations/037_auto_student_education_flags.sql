-- e-Matica phase 37: automatic student education flags by current class.

alter table public.registry_students
  add column if not exists birth_place text,
  add column if not exists birth_country text default 'Hrvatska',
  add column if not exists foreigner_country text,
  add column if not exists citizenship text default 'hrvatsko',
  add column if not exists gender text,
  add column if not exists gifted_direct_art_academy boolean not null default false,
  add column if not exists adult_education_candidate boolean not null default false,
  add column if not exists continuing_education boolean not null default false,
  add column if not exists address_country text default 'Hrvatska',
  add column if not exists mother_first_name text,
  add column if not exists mother_first_name_genitive text,
  add column if not exists mother_last_name text,
  add column if not exists father_first_name text,
  add column if not exists father_first_name_genitive text,
  add column if not exists father_last_name text,
  add column if not exists phone_country_code text,
  add column if not exists phone_network text,
  add column if not exists phone_number text,
  add column if not exists finished_school_name text,
  add column if not exists finished_school_country text default 'Hrvatska',
  add column if not exists finished_secondary_school_year text,
  add column if not exists photo_url text;

create or replace function public.apply_registry_student_class_flags(p_registry_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_name text;
begin
  if p_registry_student_id is null then
    return;
  end if;

  select upper(btrim(c.name))
  into v_class_name
  from public.student_class_enrollments sce
  join public.classes c on c.id = sce.class_id
  where sce.registry_student_id = p_registry_student_id
  order by
    case when coalesce(sce.ematica_status, sce.status::public.enrollment_status, 'ACTIVE'::public.enrollment_status) = 'ACTIVE' then 0 else 1 end,
    coalesce(sce.school_year, '') desc,
    sce.created_at desc nulls last
  limit 1;

  update public.registry_students
  set adult_education_candidate = coalesce(v_class_name in ('4.A', '4.B'), false),
      continuing_education = coalesce(v_class_name = '4.I', false),
      updated_at = now()
  where id = p_registry_student_id;
end;
$$;

create or replace function public.sync_registry_student_class_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.apply_registry_student_class_flags(new.registry_student_id);
  if tg_op = 'UPDATE' and old.registry_student_id is distinct from new.registry_student_id then
    perform public.apply_registry_student_class_flags(old.registry_student_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_registry_student_class_flags on public.student_class_enrollments;
create trigger trg_sync_registry_student_class_flags
after insert or update
on public.student_class_enrollments
for each row
execute function public.sync_registry_student_class_flags();

select public.apply_registry_student_class_flags(id)
from public.registry_students;

create or replace view public.v_ematica_students_current_extended as
select
  cur.registry_student_id,
  cur.first_name,
  cur.last_name,
  cur.full_name,
  cur.date_of_birth,
  cur.oib,
  cur.email,
  cur.phone,
  cur.student_status,
  cur.ednevnik_student_id,
  cur.ednevnik_synced_at,
  cur.ednevnik_data_entry_blocked,
  cur.school_enrollment_id,
  cur.school_id,
  cur.school_name,
  cur.school_year_id,
  cur.school_year_label,
  cur.school_program_id,
  cur.program_name,
  cur.school_enrollment_status,
  cur.enrolled_on,
  cur.exited_on,
  cur.exit_reason,
  cur.class_id,
  cur.class_name,
  cur.grade_level,
  cur.section,
  cur.class_enrollment_status,
  cur.data_entry_blocked,
  cur.school_level,
  cur.program_duration_years,
  rs.parent_guardian_name,
  rs.parent_guardian_email,
  rs.parent_guardian_phone,
  rs.birth_place,
  rs.birth_country,
  rs.foreigner_country,
  rs.citizenship,
  rs.gender,
  rs.gifted_direct_art_academy,
  rs.adult_education_candidate,
  rs.continuing_education,
  rs.address,
  rs.address_country,
  rs.city,
  rs.postal_code,
  rs.mother_first_name,
  rs.mother_first_name_genitive,
  rs.mother_last_name,
  rs.father_first_name,
  rs.father_first_name_genitive,
  rs.father_last_name,
  rs.phone_country_code,
  rs.phone_network,
  rs.phone_number,
  rs.finished_school_name,
  rs.finished_school_country,
  rs.finished_secondary_school_year,
  rs.photo_url
from public.v_ematica_students_current cur
join public.registry_students rs on rs.id = cur.registry_student_id;

grant select on public.v_ematica_students_current_extended to authenticated;
