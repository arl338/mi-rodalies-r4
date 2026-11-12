'use strict';
const assert=require('node:assert/strict');
const E=require('../engine.js');
const dep=Date.parse('2026-11-12T06:48:00+01:00')/1000,now=dep-240;
const pdf={id:'pdf-r4-20261112-0648',n:'',l:'R4',day:'2026-11-12',
 src:'official-r4-pdf',s:[['78700',dep-180,dep-180],['78710',dep,dep],
 ['78709',dep+240,dep+240],['78805',dep+44*60,dep+44*60]]};
const opposite={id:'5115J77602R4',n:'77602',l:'R4',day:'2026-11-12',
 s:[['78710',dep-60,dep-60],['78700',dep+120,dep+120],['78600',dep+90*60,dep+90*60]]};
const journey=E.direct([pdf],'78710','78805',dep-100,dep+900)[0];
assert.ok(journey);
const board=(number,planned,estimated,destinationCode='')=>E.normalizeBoard({updatedAt:now*1000,departures:[{
 trainCode:number,line:'R4',stationCode:'78710',destinationCode,plannedTime:planned*1000,
 estimatedTime:estimated*1000,delayMinutes:Math.round((estimated-planned)/60),
 timeType:'ESTIMATED',timestamp:now*1000}]},'Radar',now,'78710');
const north=board('77602',dep-60,dep+180,'78600');
assert.equal(E.correlateTimetableBoards([journey],north,[opposite])[0].linkedScheduleKey,
 undefined,'06:47 north-bound train must never become 06:48 south-bound ETA');
assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],north,[opposite]),[],[],now).estimated,null);
const south=board('77599',dep,dep+120,'78805');
const matched=E.correlateTimetableBoards([journey],south,[opposite]);
assert.equal(matched[0].linkedByScheduleOnly,true,'Unique 06:48 south-board observation can enrich PDF service');
assert.equal(E.enrichJourney(journey,matched,[],[],now).estimated,dep+120);
assert.equal(E.enrichJourney(journey,matched,[],[],now).live,false,'No train position without real trip id');
assert.equal(E.enrichJourney(journey,[],[],[],now).estimated,null,'No matching operational data means only planned PDF time');
const wrongDirection=board('77599',dep,dep+120,'78600');
assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],wrongDirection,[]),[],[],now).estimated,null,
 'Even exact matching line, departure minute and number cannot override an opposite declared terminus');
const noDirection=board('77599',dep,dep+120);
assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],noDirection,[]),[],[],now).estimated,null,
 'No station direction evidence means only scheduled hour for PDF');
const valfiguer=E.normalizeBoard({station:{code:'78710'},trains:[{train_number:'77599',
 product:'C4',state:'upcoming',destination:'Barcelona-Plaça de Catalunya',
 planned_ts:dep,estimated_ts:dep+120,delay_s:120,age_s:20}]},'Valfiguer',now,'78710');
const destinationNames=new Map([['barcelona placa de catalunya','78805']]);
assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],valfiguer,[],destinationNames),[],[],now).estimated,dep+120,
 'Exact resolved Valfiguer terminus matches verified PDF service direction');
assert.equal(E.enrichJourney(journey,E.correlateTimetableBoards([journey],valfiguer),[],[],now).estimated,null,
 'Unknown destination text is never silently guessed');
console.log('OK: absent R4 06:48 appears as planned, no ETA from opposite R4 06:47, verified south ETA possible');
