import test from 'node:test';import assert from 'node:assert/strict';import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {PDFDocument} from 'pdf-lib';
import {electronicIdentityPdf} from '../src/lib/electronicIdentityPdf.js';
const loadFont=name=>readFile(new URL('../public/fonts/identity/'+name,import.meta.url));
const identity={name:'Luka Kovač',oib:'00000000002',username:'luka.kovac2',email:'luka.kovac2@skolehr.xyz',birthDate:'06.03.2010.',gender:'Ž',validUntil:'31.10.2027.',school:{id:'ss-marijadedekovic-zg',name:'Srednja škola Marija Dedeković Zagreb',address:'Primjerna ulica 12, 10000 Zagreb',locality:'HR-Zagreb',postalCode:'HR-10000'}};
test('Issued pupil and teacher forms render to one A4 page with embedded Croatian fonts',async()=>{
 for(const relationship of ['STUDENT','TEACHER']){
  const bytes=await electronicIdentityPdf({ready:true,password:'Aa123xyz',identity:{...identity,relationship}},loadFont);
  const doc=await PDFDocument.load(bytes);assert.equal(doc.getPageCount(),1);const {width,height}=doc.getPage(0).getSize();assert(Math.abs(width-595.276)<.01&&Math.abs(height-841.89)<.01);assert.equal(doc.getTitle(),'Podaci o elektroničkom identitetu');assert(bytes.length>15000);
 }
 await assert.rejects(electronicIdentityPdf({ready:false,password:'Aa123xyz',identity},loadFont),/nije potvrđen/);
 await assert.rejects(electronicIdentityPdf({ready:true,password:'Aa123xyz',identity,expiresAt:1},loadFont),/isteklo/);
});
