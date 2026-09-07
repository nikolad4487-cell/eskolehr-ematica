-- e-Matica phase 36: full student registry card fields.

alter table public.registry_students
  add column if not exists birth_place text,
  add column if not exists birth_country text default 'Hrvatska',
  add column if not exists foreigner_country text,
  add column if not exists citizenship text default 'hrvatsko',
  add column if not exists gender text,
  add column if not exists gifted_direct_art_academy boolean not null default false,
  add column if not exists adult_education_candidate boolean not null default false,
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

create or replace view public.v_ematica_students_current as
with latest_school_enrollment as (
  select distinct on (sse.student_id)
    sse.*
  from public.student_school_enrollments sse
  order by
    sse.student_id,
    case when sse.status = 'ACTIVE' then 0 else 1 end,
    sse.enrolled_on desc,
    sse.created_at desc
),
latest_class_enrollment as (
  select distinct on (sce.registry_student_id)
    sce.registry_student_id,
    sce.student_id as ednevnik_student_id,
    sce.class_id,
    sce.school_year,
    sce.school_year_id,
    sce.program_id,
    sce.ematica_status,
    sce.ednevnik_data_entry_blocked
  from public.student_class_enrollments sce
  where sce.registry_student_id is not null
  order by
    sce.registry_student_id,
    case when sce.ematica_status = 'ACTIVE' then 0 else 1 end,
    sce.school_year desc nulls last
)
select
  rs.id as registry_student_id,
  rs.first_name,
  rs.last_name,
  concat_ws(' ', rs.first_name, rs.last_name) as full_name,
  rs.date_of_birth,
  rs.oib,
  rs.email,
  rs.phone,
  rs.parent_guardian_name,
  rs.parent_guardian_email,
  rs.parent_guardian_phone,
  rs.status as student_status,
  rs.ednevnik_student_id,
  rs.ednevnik_synced_at,
  rs.ednevnik_data_entry_blocked,
  lse.id as school_enrollment_id,
  coalesce(lse.school_id, c.school_id) as school_id,
  coalesce(s.name, class_school.name) as school_name,
  coalesce(lse.school_year_id, lce.school_year_id, c.school_year_id) as school_year_id,
  coalesce(sy.label, class_sy.label) as school_year_label,
  coalesce(lse.program_id, lce.program_id, c.program_id) as school_program_id,
  p.name as program_name,
  lse.status as school_enrollment_status,
  lse.enrolled_on,
  lse.exited_on,
  lse.exit_reason,
  lce.class_id,
  c.name as class_name,
  c.grade_level,
  c.section,
  lce.ematica_status as class_enrollment_status,
  coalesce(lce.ednevnik_data_entry_blocked, rs.ednevnik_data_entry_blocked) as data_entry_blocked,
  rs.birth_place,
  rs.birth_country,
  rs.foreigner_country,
  rs.citizenship,
  rs.gender,
  rs.gifted_direct_art_academy,
  rs.adult_education_candidate,
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
from public.registry_students rs
left join latest_school_enrollment lse on lse.student_id = rs.id
left join public.schools s on s.id = lse.school_id
left join public.school_years sy on sy.id = lse.school_year_id
left join latest_class_enrollment lce on lce.registry_student_id = rs.id
left join public.classes c on c.id = lce.class_id
left join public.schools class_school on class_school.id = c.school_id
left join public.school_years class_sy on class_sy.id = coalesce(lce.school_year_id, c.school_year_id)
left join public.programs p on p.id = coalesce(lse.program_id, lce.program_id, c.program_id);

grant select on public.v_ematica_students_current to authenticated;
