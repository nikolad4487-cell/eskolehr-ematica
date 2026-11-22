import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('actor initplans retain row visibility and write restrictions; migration can repeat',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role cache_reader; create table public.user_profiles(id int,school_id text);
 insert into public.user_profiles values(1,'own'),(2,'foreign');
 create function public.registry_scoped_actor() returns boolean language sql stable as 'select true';
 alter table public.user_profiles enable row level security;
 grant select,update on public.user_profiles to cache_reader;
 create policy allow_read on public.user_profiles for select to cache_reader using(true);
 create policy scope_read on public.user_profiles as restrictive for select to cache_reader using(not registry_scoped_actor() or school_id='own');
 create policy scope_write on public.user_profiles for update to cache_reader using(school_id='own') with check(not registry_scoped_actor() or school_id='own');`);
 const read=async()=>{await db.exec('set role cache_reader');try{return (await db.query('select id from user_profiles order by id')).rows;}finally{await db.exec('reset role');}};
 const before=await read(); assert.deepEqual(before,[{id:1}]);
 const sql=await readFile(new URL('../supabase/migrations/20261122201155_cache_rls_actor_checks.sql',import.meta.url),'utf8');
 await db.exec(sql);assert.deepEqual(await read(),before);
 await db.exec(sql);assert.deepEqual(await read(),before);
 await db.exec('set role cache_reader');
 await assert.rejects(db.query("update user_profiles set school_id='foreign' where id=1"),/row-level security/);
 await db.exec('reset role');
 }finally{await db.close();}
});
