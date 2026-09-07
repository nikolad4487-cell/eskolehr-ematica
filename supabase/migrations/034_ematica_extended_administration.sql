-- e-Matica phase 34: functional administration tables for documented modules.

create table if not exists public.student_education_records (
  id uuid primary key default gen_random_uuid(),
  registry_student_id uuid references public.registry_students(id) on delete cascade,
  school_id text references public.schools(id) on delete set null,
  school_year_id uuid references public.school_years(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  class_id text references public.classes(id) on delete set null,
  record_type text not null default 'PROMJENA_PROGRAMA',
  effective_on date not null default current_date,
  description text,
  status text not null default 'AKTIVNO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.weekly_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id text references public.schools(id) on delete set null,
  school_year_id uuid references public.school_years(id) on delete set null,
  staff_profile_id uuid references public.user_profiles(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  class_id text references public.classes(id) on delete set null,
  assignment_type text not null default 'REDOVNA_NASTAVA',
  weekly_hours numeric(5,2),
  annual_hours numeric(6,2),
  starts_on date,
  ends_on date,
  note text,
  status text not null default 'AKTIVNO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.student_transport_records (
  id uuid primary key default gen_random_uuid(),
  registry_student_id uuid references public.registry_students(id) on delete cascade,
  school_id text references public.schools(id) on delete set null,
  school_year_id uuid references public.school_years(id) on delete set null,
  class_id text references public.classes(id) on delete set null,
  route_from text,
  route_to text,
  distance_km numeric(6,2),
  transport_type text not null default 'AUTOBUS',
  carrier text,
  price numeric(8,2),
  status text not null default 'AKTIVNO',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.textbook_records (
  id uuid primary key default gen_random_uuid(),
  school_id text references public.schools(id) on delete set null,
  school_year_id uuid references public.school_years(id) on delete set null,
  program_id uuid references public.programs(id) on delete set null,
  class_id text references public.classes(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  publisher text,
  code text,
  grade_level integer,
  status text not null default 'AKTIVNO',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.school_document_records (
  id uuid primary key default gen_random_uuid(),
  school_id text references public.schools(id) on delete set null,
  school_year_id uuid references public.school_years(id) on delete set null,
  registry_student_id uuid references public.registry_students(id) on delete set null,
  class_id text references public.classes(id) on delete set null,
  document_type text not null default 'POTVRDA_O_SKOLOVANJU',
  document_number text,
  issued_on date,
  status text not null default 'NACRT',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create table if not exists public.help_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Upute',
  resource_type text not null default 'PDF',
  url text,
  description text,
  status text not null default 'AKTIVNO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'student_education_records',
    'weekly_assignments',
    'student_transport_records',
    'textbook_records',
    'school_document_records',
    'help_resources'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "Authenticated users can manage %s" on public.%I', table_name, table_name);
    execute format(
      'create policy "Authenticated users can manage %s" on public.%I for all to authenticated using (true) with check (true)',
      table_name,
      table_name
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;

create or replace view public.v_student_education_records_detailed as
select
  r.*,
  concat_ws(' ', rs.first_name, rs.last_name) as full_name,
  s.name as school_name,
  sy.label as school_year_label,
  p.name as program_name,
  c.name as class_name
from public.student_education_records r
left join public.registry_students rs on rs.id = r.registry_student_id
left join public.schools s on s.id = r.school_id
left join public.school_years sy on sy.id = r.school_year_id
left join public.programs p on p.id = r.program_id
left join public.classes c on c.id = r.class_id;

create or replace view public.v_weekly_assignments_detailed as
select
  r.*,
  s.name as school_name,
  sy.label as school_year_label,
  coalesce(
    public.profile_text_field(to_jsonb(up), 'full_name', 'display_name', 'name', 'ime_prezime'),
    nullif(concat_ws(' ',
      public.profile_text_field(to_jsonb(up), 'first_name', 'ime', 'given_name'),
      public.profile_text_field(to_jsonb(up), 'last_name', 'prezime', 'family_name', 'surname')
    ), ''),
    public.profile_text_field(to_jsonb(up), 'email', 'mail')
  ) as staff_name,
  public.profile_text_field(to_jsonb(up), 'email', 'mail') as staff_email,
  subj.name as subject_name,
  c.name as class_name
from public.weekly_assignments r
left join public.schools s on s.id = r.school_id
left join public.school_years sy on sy.id = r.school_year_id
left join public.user_profiles up on up.id = r.staff_profile_id
left join public.subjects subj on subj.id = r.subject_id
left join public.classes c on c.id = r.class_id;

create or replace view public.v_student_transport_records_detailed as
select
  r.*,
  concat_ws(' ', rs.first_name, rs.last_name) as full_name,
  s.name as school_name,
  sy.label as school_year_label,
  c.name as class_name
from public.student_transport_records r
left join public.registry_students rs on rs.id = r.registry_student_id
left join public.schools s on s.id = r.school_id
left join public.school_years sy on sy.id = r.school_year_id
left join public.classes c on c.id = r.class_id;

create or replace view public.v_textbook_records_detailed as
select
  r.*,
  s.name as school_name,
  sy.label as school_year_label,
  p.name as program_name,
  c.name as class_name,
  subj.name as subject_name
from public.textbook_records r
left join public.schools s on s.id = r.school_id
left join public.school_years sy on sy.id = r.school_year_id
left join public.programs p on p.id = r.program_id
left join public.classes c on c.id = r.class_id
left join public.subjects subj on subj.id = r.subject_id;

create or replace view public.v_school_document_records_detailed as
select
  r.*,
  concat_ws(' ', rs.first_name, rs.last_name) as full_name,
  s.name as school_name,
  sy.label as school_year_label,
  c.name as class_name
from public.school_document_records r
left join public.registry_students rs on rs.id = r.registry_student_id
left join public.schools s on s.id = r.school_id
left join public.school_years sy on sy.id = r.school_year_id
left join public.classes c on c.id = r.class_id;

grant select on
  public.v_student_education_records_detailed,
  public.v_weekly_assignments_detailed,
  public.v_student_transport_records_detailed,
  public.v_textbook_records_detailed,
  public.v_school_document_records_detailed
to authenticated;
