'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),E=require('../engine.js');
const day='2026-11-12',from='71801',to='79100',at=Date.parse('2026-11-12T09:00:00+01:00')/1000;
const data={date:day,total:3,trains:[
 {feed:'cercanias',operator:'Renfe Cercanías',product:'Cercanías R2N',train:null,stops:4,depMs:at*1000,arrMs:(at+3600)*1000},
 {feed:'cercanias',operator:'Renfe Cercanías',product:'Cercanías R2',train:null,stops:4,depMs:(at+300)*1000,arrMs:(at+3900)*1000},
 {feed:'cercanias',operator:'Renfe Cercanías',product:'Cercanías R2N',train:null,stops:4,depMs:(at+600)*1000,arrMs:(at+4200)*1000}
]};
const all=E.normalizeTrenaliaTimetable(data,from,to,day,'ALL');
assert.equal(all.length,3,'All-lines mode must not discard R2N and R2');
assert.deepEqual(all.map(x=>x.l),['R2N','R2','R2N']);
const journeys=E.direct(all,from,to,at,at+1200);
assert.equal(journeys.length,3);
const gtfs={id:'original',n:'78888',l:'R2N',s:[[from,at,at],[to,at+3600,at+3600]],day};
const official=E.direct([gtfs],from,to,at,at+1200);
const merged=E.mergeSupplementalJourneys(official,journeys);
assert.equal(merged.length,3,'Overlap with GTFS R2N must be deduplicated, not other R2 services');
assert.equal(merged[0].legs[0].t.id,'original','GTFS still has priority');
assert.equal(merged.filter(x=>x.legs[0].t.src==='trenalia-schedule-only').length,2);
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
assert.match(app,/const canSupplement=!!selection\.line&&/);
assert.match(app,/E\.normalizeTrenaliaTimetable\(candidate\.data,selection\.from/);
assert.match(app,/E\.mergeSupplementalJourneys\(scheduled,supplemental\)/);
console.log('OK: multi-line mode adds verified schedule-only services without hiding original GTFS');
