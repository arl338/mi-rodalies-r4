'use strict';
const assert=require('node:assert/strict'), E=require('../engine.js');
const day='2026-11-12', dep=Date.parse(day+'T08:00:00+01:00')/1000,now=dep-120;
const from='70001',to='70002',beyond='70003',opposite='70004';
const names=new Map([['terminal central',to],['terminal distant',beyond],['terminal contrari',opposite]]);
const lines=[...E.LINES];
function alternative(line){
 const p={date:day,total:1,trains:[{feed:'cercanias',operator:'Renfe Cercanías',train:null,
   product:'Cercanías '+line,depMs:dep*1000,arrMs:(dep+1800)*1000,stops:3}]};
 const out=E.normalizeTrenaliaTimetable(p,from,to,day,line);
 assert.equal(out.length,1,'Parse expected for '+line);
 return {t:out[0],journey:E.direct(out,from,to,dep-1,dep+1)[0]};
}
function board(line,term,offset=180,metadata={}){
 return E.normalizeBoard({updatedAt:now*1000,departures:[{
  line,trainCode:'77888',stationCode:from,plannedTime:dep*1000,
  estimatedTime:(dep+offset)*1000,timeType:'ESTIMATED',delayMinutes:offset/60,
  timestamp:(now-12)*1000,...metadata,...(term?{destinationCode:term}:{})}]},'Radar',now,from);
}
for(const line of lines){
 const {journey}=alternative(line),other={id:'verified-'+line,n:'12345',l:line,day,
  s:[[from,dep,dep],[to,dep+1800,dep+1800],[beyond,dep+2400,dep+2400]]};
 assert.ok(journey, 'Direct anonymous journey '+line);
 const good=E.correlateTimetableBoards([journey],board(line,to),[],names);
 assert.equal(E.enrichJourney(journey,good,[],[],now).estimated,dep+180,'Exact destination '+line);
 const noDirection=E.correlateTimetableBoards([journey],board(line,null),[],names);
 assert.equal(E.enrichJourney(journey,noDirection,[],[],now).estimated,null,'No direction = only schedule '+line);
 const wrong=E.correlateTimetableBoards([journey],board(line,opposite),[],names);
 assert.equal(E.enrichJourney(journey,wrong,[],[],now).estimated,null,'Wrong terminus '+line);
 const witness=E.correlateTimetableBoards([journey],board(line,beyond),[other],names);
 assert.equal(E.enrichJourney(journey,witness,[],[],now).estimated,dep+180,'Verified onward corridor '+line);
 const unrelated=[{...other,l:'R4'===line?'R1':'R4'}];
 assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],board(line,beyond),unrelated,names),[],[],now).estimated,null,
  'Cannot borrow topology from another line '+line);
 const badName=E.correlateTimetableBoards([journey],board(line,null,180,{destinationName:'Unknown destination'}),[],names);
 assert.equal(E.enrichJourney(journey,badName,[],[],now).estimated,null,'Unknown name not guessed '+line);
 const name=E.correlateTimetableBoards([journey],board(line,null,180,{destinationName:'Terminal central'}),[],names);
 assert.equal(E.enrichJourney(journey,name,[],[],now).estimated,dep+180,'Canonical destination name '+line);
 const old=E.correlateTimetableBoards([journey],board(line,to,180,{timestamp:(now-500)*1000}),[],names);
 assert.equal(E.enrichJourney(journey,old,[],[],now).estimated,null,'Stale board '+line);
 const wrongLine=E.correlateTimetableBoards([journey],board('R4'===line?'R1':'R4',to),[],names);
 assert.equal(E.enrichJourney(journey,wrongLine,[],[],now).estimated,null,'Wrong line '+line);
 const confirmed={...other,n:'77888'};
 const exact=E.correlateTimetableBoards([journey],board(line,to),[confirmed],names);
 assert.equal(E.enrichJourney(journey,exact,[],[],now).estimated,null,'Do not steal ETA from known service '+line);
}
console.log('OK: 19 lines, 190 checks: direction, opposite terminus, witnessed onward route, unknown/stale/cross-line/known-service');
