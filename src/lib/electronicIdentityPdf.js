import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export const identityNote=[
 'Podatke elektroničkog identiteta uređuje administrator imenika na Vašoj ustanovi.',
 'Više informacija o CARNET-ovim uslugama možete pronaći na web sjedištu https://www.carnet.hr/.',
 'Za pomoć pri korištenju CARNET-ovih usluga obratite se CARNET-ovom helpdesku putem telefona na broj +385 1 6661 555 ili putem e-maila na adresu helpdesk@carnet.hr.',
];
const names=['LiberationSerif-Regular.ttf','LiberationSerif-Bold.ttf','LiberationSerif-Italic.ttf','LiberationSans-Bold.ttf'];
export async function electronicIdentityPdf(issued,loadFont=async name=>{
 const response=await fetch('/fonts/identity/'+name);if(!response.ok)throw Error('Font dokumenta nije dostupan.');return new Uint8Array(await response.arrayBuffer());
}){
 if(!issued?.ready||!issued.identity||!issued.password)throw Error('Elektronički identitet još nije potvrđen na potrebnim sustavima.');
 if(issued.expiresAt&&Date.now()>issued.expiresAt)throw Error('Vrijeme preuzimanja je isteklo. Izdajte novu lozinku.');
 const x=issued.identity;
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [regular,bold,italic,sans]=await Promise.all(names.map(async name=>doc.embedFont(await loadFont(name),{subset:true})));
 const page=doc.addPage([595.276,841.89]),s=595.276/1334;
 const black=rgb(.10,.10,.10),gray=rgb(.95,.95,.95);
 // Vector reconstruction of the supplied A4 form, with no example personal
 // information baked into an image or an underlying PDF layer.
 page.drawSvgPath('M 915 39 L1293 39 L1293 876 C970 840 710 540 850 160 Z',{x:0,y:841.89,scale:s,color:rgb(.944,.944,.944)});
 page.drawSvgPath('M40 292 C700 338 684 1252 40 1323 Z',{x:0,y:841.89,scale:s,color:gray});
 page.drawSvgPath('M622 1850 C448 1320 825 1020 1293 1152 L1293 1850 Z',{x:0,y:841.89,scale:s,color:rgb(.947,.947,.947)});
 page.drawRectangle({x:74*s,y:841.89-198*s,width:1185*s,height:133*s,color:rgb(.927,.927,.927)});
 const text=(value,px,py,font=regular,size=24,width)=>{
  const valueText=String(value??'').normalize('NFC').replace(/[\r\n\t]/g,' ');let pt=size*s;
  if(width)while(font.widthOfTextAtSize(valueText,pt)>width*s&&pt>7)pt-=.2;
  if(width&&font.widthOfTextAtSize(valueText,pt)>width*s)throw Error('Podatak je predug za polje dokumenta. Provjerite zapis prije preuzimanja.');
  page.drawText(valueText,{x:px*s,y:841.89-py*s,font,size:pt,color:black});
 };
 const line=(y,dark=false)=>page.drawLine({start:{x:74*s,y:841.89-y*s},end:{x:1259*s,y:841.89-y*s},thickness:(dark?6:1)*s,color:rgb(dark?.27:.63,dark?.27:.63,dark?.27:.63)});
 text('CARNet',114,144,sans,44);
 text('PODACI O ELEKTRONIČKOM IDENTITETU',585,117,bold,30,634);
 text('U SUSTAVU AAI@EduHr',825,153,bold,30,394);line(198,true);
 const rows=[['Ime i prezime',x.name,284],['OIB',x.oib,329],['Identifikator korisnika u ustanovi',x.username,375],['Korisnička oznaka',x.email,420],['Lozinka',issued.password,466],['Email',x.email,547],['Datum rođenja',x.birthDate,591],['Spol',x.gender,636]];
 for(const [label,value,y] of rows){text(label,114,y,bold,24,470);text(value,608,y,regular,25,608);}
 if(x.relationship==='STUDENT')text('Za prijavu na skolehr.xyz i webmailhr.com.',608,498,italic,21,610);
 else {text('Za prijavu na webmailhr.com.',608,493,italic,20,610);text('e-Dnevnik: zaseban PIN i autentifikator.',608,516,italic,19,610);}
 line(703);
 for(const [label,value,y] of [['Povezanost s ustanovom',x.relationship==='STUDENT'?'Učenik':'Nastavnik',780],['Temeljna povezanost s ustanovom',x.relationship==='STUDENT'?'Učenik':'Nastavnik',825],['Datum isteka temeljne povezanosti',x.validUntil,870]]){text(label,114,y,bold,24,478);text(value,608,y,regular,25,608);}
 line(994);
 for(const [label,value,y] of [['Naziv matične ustanove',x.school.name,1108],['Oznaka matične ustanove',x.school.id,1153],['Poštanska adresa',x.school.address,1198],['Mjesto (lokalitet)',x.school.locality,1244],['Poštanski broj',x.school.postalCode,1288]]){text(label,114,y,bold,24,470);text(value,608,y,regular,25,608);}
 line(1562);text('Napomena:',114,1620,bold,23);
 text('• '+identityNote[0],101,1656,regular,20,1120);
 text('• '+identityNote[1],101,1689,regular,20,1120);
 text('• Za pomoć pri korištenju CARNET-ovih usluga obratite se CARNET-ovom helpdesku putem telefona na broj +385 1 6661 555',101,1721,regular,20,1120);
 text('ili putem e-maila na adresu helpdesk@carnet.hr.',116,1751,regular,20,1090);
 doc.setTitle('Podaci o elektroničkom identitetu');doc.setProducer('ŠkoleHR');
 return doc.save();
}

export async function downloadElectronicIdentity(issued){
 const bytes=await electronicIdentityPdf(issued);
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const a=document.createElement('a');a.href=url;a.download='Elektronicki-identitet.pdf';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
