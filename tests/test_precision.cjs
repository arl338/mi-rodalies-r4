'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const now=Date.parse('2026-11-12T08:00:00Z')/1000;
const dep=now+600, trip='5115J77512R4';
const a={id:trip,n:'77512',l:'R4',day:'2026-11-12',s:[['78710',dep,dep],['71801',dep+1800,dep+1800]]};
const b={id:'5115J66611R2',n:'66611',l:'R2',day:'2026-11-12',s:[['71801',dep+2400,dep+2400],['79999',dep+3000,dep+3000]]};
const board={station:{code:'78710',name:'Terrassa Est'},trains:[{trip_id:trip,product:'C4',train_number:'77512',planned_ts:dep,delay_s:1200,age_s:12}]};
const parsed=E.normalizeBoard(board,'Valfiguer',now,'78710');
assert.equal(parsed.length,1);
assert.equal(parsed[0].line,'R4','C4 verified by exact Catalan station');
assert.equal(parsed[0].estimated,dep+1200,'delay_s must be interpreted as seconds');
assert.equal(parsed[0].age,12);
assert.equal(E.normalizeBoard(board,'Valfiguer',now,'71801').length,0,'never match board of another station');
const madrid=E.normalizeBoard({station:{code:'78710'},trains:[{...board.trains[0],nucleo:'Madrid'}]},'bad',now,'78710');
assert.equal(madrid.length,0,'never transfer Madrid observation to Catalunya');
const legacyNotScoped=E.normalizeBoard({trains:[board.trains[0]]},'unscoped',now);
assert.equal(legacyNotScoped[0].line,'','legacy C4 without scope must remain ambiguous');
const l=E.direct([a],'78710','71801',dep-100,dep+300)[0];
assert.equal(E.enrichJourney(l,parsed,[],[],now).estimated,dep+1200);
const connection=E.transfers([a,b],'78710','79999',dep-100,dep+300)[0];
assert.equal(connection.wait,600);
const risky=E.enrichJourney(connection,parsed,[],[],now);
assert.equal(risky.connectionRisk,true);
assert.equal(risky.state,'at-risk');
assert.equal(risky.connectionUnverified,true);
const normal=E.enrichJourney(connection,[],[],[],now);
assert.equal(normal.state,'transfer');
assert.equal(normal.connectionRisk,false);
const madridAlert={text:'Servicio de cercanías con retrasos',lines:[{nucleo:'Madrid',line:'C3'}]};
const catAlert={text:'Incidencia C4',lines:[{nucleo:'Catalunya',line:'C4'}]};
const all=E.alertsForLines({alerts:[madridAlert,catAlert,{text:'Aviso general Madrid',nucleo:'Madrid'},{text:'Aviso general Rodalies de Catalunya',nucleo:'Catalunya'}]},new Set(['R4']));
assert.equal(all.length,2,'only Catalunya C4 and Catalunya general warnings');
assert.deepEqual(all[0].lines,['R4']);
assert.equal(E.alertsForLines({alerts:[catAlert]},new Set(['R1'])).length,0);
assert.equal(E.alertsForLines({alerts:[catAlert]},new Set()).length,0);
assert.equal(E.alertsForLines({alerts:[{text:'Servicio de Cercanías afectado'}]},new Set(['R4'])).length,0);
assert.equal(E.scopedLine('C4','Madrid'),'');
assert.equal(E.scopedLine('C4','Catalunya'),'R4');
assert.equal(E.scopedLine('C2','Catalunya'),'R2');
assert.equal(E.scopedLine('C4',''),'');
assert.equal(E.alertsForLines({alerts:[{text:'Incidencia R3',line:'R3'}]},new Set(['R4']),true).length,0);
assert.equal(E.alertsForLines({alerts:[{text:'Incidencia C4',line:'C4'}]},new Set(['R4']),true).length,1);

// Official regional PDF with a train number: refuse ETA from a different train
// even when line, station, destination and scheduled minute coincide.
const rail={id:'pdf-regional-r13-15040',n:'15040',l:'R13',
 day:'2026-11-12',src:'official-regional-pdf',
 s:[['78400',dep,dep],['73003',dep+2700,dep+2700]]};
const pdfTrip=E.direct([rail],'78400','73003',dep-60,dep+120)[0];
function pdfBoard(number){
 return E.normalizeBoard({updatedAt:now*1000,
 departures:[{line:'R13',trainCode:number,stationCode:'78400',
 destinationCode:'73003',plannedTime:dep*1000,
 estimatedTime:(dep+180)*1000,circulationState:'RUNNING',
 timestamp:now*1000}]},'test',now,'78400');
}
const reject=E.correlateTimetableBoards([pdfTrip],pdfBoard('15042'),[],new Map());
assert.equal(reject[0].linkedScheduleKey,undefined,'Wrong numbered PDF train must never inherit ETA');
assert.equal(E.enrichJourney(pdfTrip,reject,[],[],now).estimated,null);
const accept=E.correlateTimetableBoards([pdfTrip],pdfBoard('15040'),[],new Map());
assert.ok(accept[0].linkedScheduleKey,'Verified numbered PDF train may link to its own station ETA');
assert.equal(E.enrichJourney(pdfTrip,accept,[],[],now).estimated,dep+180);

console.log('OK: 19 controles de precisión: C4/R4, ámbitos, delay_s, transbordos y avisos');
