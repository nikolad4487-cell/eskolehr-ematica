import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const uuid = n => `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const migration = await readFile(new URL('../supabase/migrations/20261103192115_secondary_admissions_registry_class_sync.sql',import.meta.url),'utf8');

async function setup(t) {
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create function registry_require_non_registrar() returns void language plpgsql as $$begin
      if current_setting('test.scope',true)='registrar' then raise exception 'Referada nema ovlasti.'; end if; end$$;
    create function registry_admin(s text) returns boolean language sql as $$select current_setting('test.scope',true) in (s,'global')$$;
    create function registry_global_admin() returns boolean language sql as $$select current_setting('test.scope',true)='global'$$;
    create function registrar_is_user() returns boolean language sql as $$select current_setting('test.scope',true)='registrar'$$;
    create function registry_scoped_actor() returns boolean language sql as $$select current_setting('test.scope',true)<>'global'$$;
    create type admissions_track as enum('SECONDARY','HIGHER_EDUCATION');
    create type enrollment_status as enum('ACTIVE','DROPPED_OUT','TRANSFERRED','GRADUATED');
    create type student_status as enum('ACTIVE','DROPPED_OUT','TRANSFERRED','GRADUATED');
    create table user_profiles(id uuid primary key,auth_user_id uuid,class_id text,active_school_id text,updated_at timestamptz);
    create table school_years(id uuid primary key,school_id text,name text,status text default 'ACTIVE',workflow_closed_at timestamptz);
    create table programs(id uuid primary key,school_id text,name text,is_active boolean default true,admission_track admissions_track);
    create table classes(id text primary key,school_id text,school_year text,school_year_id uuid,program_id uuid,grade_level int,
      is_locked boolean default false,is_active boolean default true,status text default 'ACTIVE');
    create table registry_students(id uuid primary key,first_name text,last_name text,ednevnik_student_id uuid,status student_status default 'ACTIVE',
      ednevnik_data_entry_blocked boolean default false,ednevnik_synced_at timestamptz,updated_at timestamptz);
    create table admission_candidates(id uuid primary key,registry_student_id uuid,school_year_id uuid,source_class_id text,
      track admissions_track,status text,accepted_choice_id uuid);
    create table admission_choices(id uuid primary key,candidate_id uuid,target_school_id text,target_program_id uuid,is_accepted boolean);
    create table student_school_enrollments(id uuid primary key default gen_random_uuid(),student_id uuid,school_id text,
      school_year_id uuid,program_id uuid,status enrollment_status default 'ACTIVE');
    create table student_class_enrollments(id uuid primary key default gen_random_uuid(),student_id uuid,class_id text,school_year text,
      school_year_id uuid,program_id uuid,status text,registry_student_id uuid,source_school_enrollment_id uuid,school_enrollment_id uuid,
      ematica_status enrollment_status,ednevnik_data_entry_blocked boolean,updated_at timestamptz,unique(student_id,class_id,school_year));
    create table user_school_roles(user_id uuid,school_id text,role text,status text,unique(user_id,school_id,role));
    create table class_subjects(class_id text,subject_id text,subject_type text,is_foreign_language boolean default false);
    create table student_subject_enrollments(student_id uuid,subject_id text,class_id text,status text,school_year text,unique(student_id,subject_id,class_id));
    create table ednevnik_sync_logs(student_id uuid,school_enrollment_id uuid,class_enrollment_id uuid,ednevnik_student_id uuid,
      action text,status text,message text,payload jsonb);
    grant usage on schema auth,public to authenticated,anon;
    select set_config('test.uid','${uuid(999)}',false),set_config('test.scope','high',false);
    insert into user_profiles(id,auth_user_id,class_id,active_school_id) values('${uuid(1)}','${uuid(101)}','primary-8','primary');
    insert into registry_students(id,first_name,last_name,ednevnik_student_id) values('${uuid(2)}','Ogledni','Učenik','${uuid(1)}');
    insert into school_years(id,school_id,name) values('${uuid(3)}','primary','2025./2026.'),('${uuid(4)}','primary','2026./2027.'),
      ('${uuid(5)}','high','2026/2027'),('${uuid(6)}','other','2026/2027');
    insert into programs(id,school_id,name,admission_track) values('${uuid(7)}','high','Gimnazija','SECONDARY'),('${uuid(8)}','high','Drugi program','SECONDARY');
    insert into classes(id,school_id,school_year,school_year_id,program_id,grade_level) values
      ('primary-8','primary','2025./2026.','${uuid(3)}',null,8),
      ('high-1a','high','2026/2027','${uuid(5)}','${uuid(7)}',1),
      ('high-1b','high','2026/2027','${uuid(5)}','${uuid(7)}',1),
      ('high-2','high','2026/2027','${uuid(5)}','${uuid(7)}',2),
      ('wrong-program','high','2026/2027','${uuid(5)}','${uuid(8)}',1),
      ('other-1','other','2026/2027','${uuid(6)}','${uuid(7)}',1);
    insert into admission_candidates values('${uuid(9)}','${uuid(2)}','${uuid(3)}','primary-8','SECONDARY','ACCEPTED','${uuid(10)}');
    insert into admission_choices values('${uuid(10)}','${uuid(9)}','high','${uuid(7)}',true);
    insert into student_class_enrollments(student_id,class_id,school_year,school_year_id,status,ematica_status)
      values('${uuid(1)}','primary-8','2025./2026.','${uuid(3)}','ACTIVE','ACTIVE');
    insert into class_subjects values('high-1a','math','REDOVNI',false),('high-1a','religion','IZBORNI',false),('high-1a','english','REDOVNI',true);
  `);
  await db.exec(migration);
  await db.exec(`
    create function portal_class_school(p_class text) returns text language sql as $$select school_id from classes where id=p_class$$;
    create function registry_student_visible(p_student uuid) returns boolean language sql as $$
      select exists(select 1 from student_school_enrollments where student_id=p_student and registry_admin(school_id))
    $$;
    create trigger registry_write_scope before insert or update or delete on student_school_enrollments
      for each row execute function registry_write_scope_guard();
    create trigger registry_write_scope before insert or update or delete on student_class_enrollments
      for each row execute function registry_write_scope_guard();
  `);
  return db;
}
const confirm=async(db,year=uuid(4))=>(await db.query("select * from enroll_accepted_admission_candidates('SECONDARY',$1,'high')",[year])).rows;
const pull=async(db,id,cls='high-1a')=>(await db.query('select import_ematica_students_to_class($1,$2) result',[cls,[id]])).rows[0].result;

test('confirmed admission maps target school year; class import preserves identity and history and retries safely',async t=>{
  const db=await setup(t);
  const [result]=await confirm(db);
  assert.equal(result.result,'ENROLLED');
  const [saved]=(await db.query('select * from student_school_enrollments')).rows;
  assert.equal(saved.school_year_id,uuid(5)); assert.equal(saved.school_id,'high'); assert.equal(saved.admission_candidate_id,uuid(9));
  assert.equal((await confirm(db))[0].result,'EXISTS');
  assert.equal((await db.query('select count(*)::int n from student_school_enrollments')).rows[0].n,1);
  const candidates=(await db.query("select list_ematica_students_for_class('high-1a') result")).rows[0].result;
  assert.equal(candidates.length,1); assert.equal(candidates[0].issue,null);
  const imported=await pull(db,saved.id); const repeated=await pull(db,saved.id);
  assert.equal(imported[0].class_enrollment_id,repeated[0].class_enrollment_id);
  assert.equal((await db.query('select count(*)::int n from user_profiles')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from student_class_enrollments')).rows[0].n,2);
  assert.equal((await db.query("select status from student_class_enrollments where class_id='primary-8'")).rows[0].status,'ACTIVE');
  assert.equal((await db.query("select status from user_school_roles where school_id='high'")).rows[0].status,'ACTIVE');
  assert.equal((await db.query('select auth_user_id from user_profiles')).rows[0].auth_user_id,uuid(101));
  assert.equal((await db.query('select class_id from user_profiles')).rows[0].class_id,'primary-8','shared account defaults are preserved');
  assert.deepEqual((await db.query('select subject_id from student_subject_enrollments')).rows,[{subject_id:'math'}]);
  assert.equal((await db.query('select count(*)::int n from ednevnik_sync_logs')).rows[0].n,1);
  await assert.rejects(pull(db,saved.id,'high-1b'),/drugi aktivan razred/);
});

test('rejects missing/wrong year, invalid program, provisional ranking and anonymous or wrong-school callers',async t=>{
  const db=await setup(t);
  await assert.rejects(confirm(db,null),/Odaberite školsku godinu/);
  assert.match((await confirm(db,uuid(3)))[0].result,/ERROR/);
  await db.exec("update admission_candidates set status='VERIFIED'"); assert.deepEqual(await confirm(db),[]);
  await db.exec("update admission_candidates set status='ACCEPTED'; update programs set is_active=false;");
  assert.match((await confirm(db))[0].result,/ERROR/);
  await db.exec("select set_config('test.scope','other',false)"); await assert.rejects(confirm(db),/ovlasti/);
  await assert.rejects(db.query("select list_ematica_students_for_class('high-1a')"),/ovlasti/);
  await db.exec("select set_config('test.scope','high',false),set_config('test.uid','',false)"); await assert.rejects(confirm(db),/ovlasti/);
  await db.exec('set role anon'); await assert.rejects(confirm(db),/permission denied/);
});

test('requires exact school/program/year and first grade; blocks locked classes and missing account links',async t=>{
  const db=await setup(t); const [{school_enrollment_id:id}]=await confirm(db);
  await assert.rejects(pull(db,id,'wrong-program'),/jednoznačan/);
  await assert.rejects(pull(db,id,'other-1'),/ovlasti/);
  await assert.rejects(pull(db,id,'high-2'),/prvi razred/);
  await db.exec("update classes set is_locked=true where id='high-1a'"); await assert.rejects(pull(db,id),/otvoreni/);
  await db.exec("update classes set is_locked=false; update registry_students set ednevnik_student_id=null");
  await assert.rejects(pull(db,id),/povežite/);
  assert.equal((await db.query('select count(*)::int n from user_school_roles')).rows[0].n,0);
});

test('batch is atomic and reranking cannot silently move a confirmed admission',async t=>{
  const db=await setup(t); const [{school_enrollment_id:id}]=await confirm(db);
  await db.exec(`select set_config('test.scope','global',false);
    insert into registry_students(id,first_name,last_name) values('${uuid(22)}','Bez','Računa');
    insert into student_school_enrollments(id,student_id,school_id,school_year_id,program_id,status)
      values('${uuid(23)}','${uuid(22)}','high','${uuid(5)}','${uuid(7)}','ACTIVE');
    select set_config('test.scope','high',false);`);
  await assert.rejects(db.query('select import_ematica_students_to_class($1,$2)',['high-1a',[id,uuid(23)]]),/povežite/);
  assert.equal((await db.query('select count(*)::int n from student_class_enrollments')).rows[0].n,1);
  assert.equal((await db.query('select count(*)::int n from user_school_roles')).rows[0].n,0);
  await db.exec(`update admission_choices set target_program_id='${uuid(8)}'`);
  assert.match((await confirm(db))[0].result,/Konačni upis već postoji/);
  assert.equal((await db.query('select program_id from student_school_enrollments where id=$1',[id])).rows[0].program_id,uuid(7));
});
