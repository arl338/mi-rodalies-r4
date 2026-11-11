'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const from='71801',to='79100',day='2026-11-12';
const dep=Date.parse('2026-11-12T07:20:00+01:00');
const base={feed:'cercanias',operator:'Renfe Cercanías',train:null,
 product:'Cercanías R2N',depMs:dep,arrMs:dep+3600000,stops:13};
function data(...trains){return {date:day,total:trains.length,trains};}
let out=E.normalizeTrenaliaTimetable(data(base),from,to,day,'R2N');
assert.equal(out.length,1);
assert.equal(out[0].l,'R2N');
assert.equal(out[0].n,'');
assert.equal(out[0].src,'trenalia-schedule-only');
assert.equal(out[0].intermediate_stop_count,11);
assert.equal(E.direct(out,from,to,dep/1000-60,dep/1000+300).length,1);
assert.equal(E.normalizeTrenaliaTimetable(data(base),from,to,day,'R4').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,product:'Regional'}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,feed:'renfe'}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,train:'00600'}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,operator:'Otro'}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,arrMs:dep}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,stops:1}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data({...base,depMs:Date.parse('2026-11-11T07:20:00+01:00')}),from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable({...data(base),date:'2026-11-13'},from,to,day,'R2N').length,0);
assert.equal(E.normalizeTrenaliaTimetable(data(base,base),from,to,day,'R2N').length,1);
assert.equal(E.normalizeTrenaliaTimetable(data(base),'ref:unverified',to,day,'R2N').length,0);
console.log('OK: Trenalia fallback solo horario y línea exacta, calendarios, estaciones, duplicados y fechas');
