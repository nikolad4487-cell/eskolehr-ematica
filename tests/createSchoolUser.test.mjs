import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSchoolUser } from '../src/lib/createSchoolUser.js';
const client={auth:{getSession:async()=>({data:{session:{access_token:'example-session'}}})}};
const values={schoolId:'school-b',name:'Primjer',surname:'Korisnik',email:'example@example.test',password:'Example8',pin:'4567',roles:['REGISTRAR']};
test('e-Matica sends selected school, role and full password separately from staff PIN',async()=>{
 let request;
 const result=await createSchoolUser(client,values,async(url,options)=>{request={url,...options};return {ok:true,json:async()=>({success:true,profileId:'created'})};});
 assert.equal(result.profileId,'created');assert.equal(request.url,'https://ednevnik.skolehr.xyz/api/admin/create-user');
 assert.equal(request.headers.Authorization,'Bearer example-session');
 const body=JSON.parse(request.body);assert.equal(body.password,'Example8');assert.equal(body.pin,'4567');assert.equal(body.schoolId,'school-b');assert.deepEqual(body.roles,['REGISTRAR']);
});
test('Missing school, short password, invalid PIN and expired session do not send creation request',async()=>{
 const send=()=>{throw new Error('Must not create user');};
 await assert.rejects(createSchoolUser(client,{...values,schoolId:''},send),/Odaberite školu/);
 await assert.rejects(createSchoolUser(client,{...values,password:'1234'},send),/najmanje 6/);
 await assert.rejects(createSchoolUser(client,{...values,pin:'abcd'},send),/4 znamenke/);
 await assert.rejects(createSchoolUser({auth:{getSession:async()=>({data:{session:null}})}},values,send),/Prijava je istekla/);
});
test('Backend rejection is displayed and is never reported as successful creation',async()=>{
 await assert.rejects(createSchoolUser(client,values,async()=>({ok:false,json:async()=>({success:false,error:'Nemate pristup odabranoj školi.'})})),/Nemate pristup/);
});
